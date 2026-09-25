BEGIN;

-- Cancelled receipts retain their original receipt metadata and audit trail.
DO $$ DECLARE v_constraint text; BEGIN
  FOR v_constraint IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.medication_procurements'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%imported_at%'
  LOOP EXECUTE format('ALTER TABLE public.medication_procurements DROP CONSTRAINT %I', v_constraint); END LOOP;
END $$;
ALTER TABLE public.medication_procurements ADD CONSTRAINT procurement_receipt_metadata
  CHECK (status <> 'imported' OR (received_units > 0 AND imported_at IS NOT NULL AND imported_by IS NOT NULL));

CREATE TABLE public.medication_procurement_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_id uuid NOT NULL REFERENCES public.medication_procurements(id),
  before_value jsonb NOT NULL, after_value jsonb NOT NULL,
  stock_delta integer NOT NULL, reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  changed_by uuid NOT NULL REFERENCES public.profiles(id), changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medication_procurement_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.medication_procurement_changes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.medication_procurement_changes TO authenticated;
CREATE POLICY procurement_changes_read ON public.medication_procurement_changes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role IN ('medical', 'staff_admin')));

CREATE FUNCTION public.correct_medication_procurement(
  p_id uuid, p_expected_updated_at timestamptz, p_quantity integer, p_reason text, p_details jsonb, p_cancel boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_order public.medication_procurements%ROWTYPE; v_after public.medication_procurements%ROWTYPE;
  v_med public.medications%ROWTYPE; v_delta integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'medical') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์แก้ไขการรับยา' USING ERRCODE = '42501';
  END IF;
  IF coalesce(length(trim(p_reason)), 0) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'กรุณาระบุเหตุผลไม่เกิน 1000 ตัวอักษร'; END IF;
  IF p_cancel IS NULL OR p_quantity IS NULL OR (NOT p_cancel AND p_quantity <= 0) THEN RAISE EXCEPTION 'จำนวนรับเข้าต้องเป็นจำนวนเต็มบวก'; END IF;
  SELECT * INTO v_order FROM public.medication_procurements WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'imported' THEN RAISE EXCEPTION 'รายการนี้ไม่ได้อยู่ในสถานะนำเข้าแล้ว'; END IF;
  IF v_order.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'รายการถูกแก้ไขแล้ว กรุณาโหลดใหม่'; END IF;
  SELECT * INTO v_med FROM public.medications WHERE id = v_order.medication_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบยาในคลัง'; END IF;
  v_delta := CASE WHEN p_cancel THEN 0 ELSE p_quantity END - v_order.received_units;
  IF v_med.stock::bigint + v_delta < 0 THEN RAISE EXCEPTION 'สต็อกคงเหลือไม่พอสำหรับย้อนยอดรับเข้า'; END IF;

  UPDATE public.medications SET stock = stock + v_delta, updated_at = now() WHERE id = v_med.id;
  IF v_delta <> 0 THEN
    INSERT INTO public.inventory_logs(medication_id, pharmacist_id, performed_by, action, quantity, reason)
    VALUES(v_med.id, auth.uid(), auth.uid(), 'adjust', v_delta,
      CASE WHEN p_cancel THEN 'ยกเลิกรับเข้า ' ELSE 'แก้ไขรับเข้า ' END || v_order.id::text || ': ' || trim(p_reason));
  END IF;
  IF p_cancel THEN
    UPDATE public.medication_procurements SET status = 'cancelled', updated_at = now()
      WHERE id = p_id RETURNING * INTO v_after;
  ELSE
    UPDATE public.medication_procurements SET received_units = p_quantity,
      order_number = p_details->>'order_number', supplier = p_details->>'supplier',
      ordered_at = coalesce((p_details->>'ordered_at')::date, ordered_at), notes = p_details->>'notes', updated_at = now()
      WHERE id = p_id RETURNING * INTO v_after;
  END IF;
  INSERT INTO public.medication_procurement_changes(procurement_id, before_value, after_value, stock_delta, reason, changed_by)
    VALUES(p_id, to_jsonb(v_order), to_jsonb(v_after), v_delta, trim(p_reason), auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.correct_medication_procurement(uuid,timestamptz,integer,text,jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correct_medication_procurement(uuid,timestamptz,integer,text,jsonb,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
