-- Review/apply to the team's development database first. No seed data.
BEGIN;

CREATE TABLE public.medication_procurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid REFERENCES public.medications(id) ON DELETE RESTRICT,
  medication_name text NOT NULL CHECK (length(trim(medication_name)) > 0),
  order_number text,
  supplier text,
  package_breakdown jsonb,
  total_units integer NOT NULL CHECK (total_units > 0),
  received_units integer CHECK (received_units > 0),
  unit text NOT NULL CHECK (length(trim(unit)) > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'imported', 'cancelled')),
  lot_number text,
  expiry_date date,
  mfg_date date,
  notes text,
  ordered_at date NOT NULL DEFAULT current_date,
  imported_at timestamptz,
  imported_by uuid REFERENCES public.profiles(id),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (mfg_date IS NULL OR expiry_date IS NULL OR mfg_date <= expiry_date),
  CHECK ((status = 'imported') = (imported_at IS NOT NULL AND imported_by IS NOT NULL AND received_units IS NOT NULL))
);
CREATE INDEX medication_procurements_ordered_at_idx ON public.medication_procurements(ordered_at DESC);
CREATE INDEX medication_procurements_medication_idx ON public.medication_procurements(medication_id);

ALTER TABLE public.medication_procurements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.medication_procurements FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.medication_procurements TO authenticated;
-- Client cannot forge actor/timestamps or mark an order received outside the RPC.
GRANT INSERT (id, medication_id, medication_name, order_number, supplier, package_breakdown,
  total_units, unit, notes, ordered_at) ON public.medication_procurements TO authenticated;
GRANT UPDATE (medication_id, medication_name, order_number, supplier, package_breakdown,
  total_units, unit, notes, ordered_at) ON public.medication_procurements TO authenticated;

CREATE POLICY procurement_read ON public.medication_procurements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role IN ('medical', 'staff_admin')));
CREATE POLICY procurement_create ON public.medication_procurements FOR INSERT TO authenticated
  WITH CHECK (status = 'pending' AND created_by = auth.uid() AND EXISTS
    (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'medical'));
CREATE POLICY procurement_edit ON public.medication_procurements FOR UPDATE TO authenticated
  USING (status = 'pending' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'medical'))
  WITH CHECK (status = 'pending');
CREATE POLICY procurement_delete ON public.medication_procurements FOR DELETE TO authenticated
  USING (status = 'pending' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'medical'));

CREATE FUNCTION public.validate_medication_procurement()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_key text; v_value jsonb;
BEGIN
  IF NEW.package_breakdown IS NOT NULL THEN
    IF jsonb_typeof(NEW.package_breakdown) <> 'object' THEN RAISE EXCEPTION 'รูปแบบบรรจุภัณฑ์ไม่ถูกต้อง'; END IF;
    FOR v_key, v_value IN SELECT key, value FROM jsonb_each(NEW.package_breakdown) LOOP
      IF v_key IN ('crates', 'boxes', 'strips', 'units', 'boxes_per_crate', 'strips_per_box', 'units_per_strip', 'units_per_box') THEN
        IF jsonb_typeof(v_value) <> 'number' OR (v_value::text)::numeric < 0
          OR trunc((v_value::text)::numeric) <> (v_value::text)::numeric
        THEN RAISE EXCEPTION 'จำนวนบรรจุต้องเป็นจำนวนเต็มไม่ติดลบ'; END IF;
      END IF;
    END LOOP;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_medication_procurement BEFORE INSERT OR UPDATE ON public.medication_procurements
  FOR EACH ROW EXECUTE FUNCTION public.validate_medication_procurement();

CREATE FUNCTION public.receive_medication_procurement(
  p_procurement_id uuid, p_medication_id uuid, p_quantity integer,
  p_lot_number text, p_expiry_date date, p_mfg_date date, p_notes text,
  p_new_medication jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_order public.medication_procurements%ROWTYPE;
  v_med public.medications%ROWTYPE;
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'medical') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์รับยาเข้าคลัง' USING ERRCODE = '42501';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'จำนวนรับเข้าต้องเป็นจำนวนเต็มบวก';
  END IF;
  IF (p_medication_id IS NULL) = (p_new_medication IS NULL) THEN
    RAISE EXCEPTION 'เลือกรวมยาเดิมหรือสร้างยาใหม่อย่างใดอย่างหนึ่ง';
  END IF;
  IF p_mfg_date > p_expiry_date THEN RAISE EXCEPTION 'วันผลิตต้องไม่เกินวันหมดอายุ'; END IF;

  -- Serializes receipts for the same order. A retry cannot add stock twice.
  SELECT * INTO v_order FROM public.medication_procurements WHERE id = p_procurement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบใบสั่งซื้อ'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'ใบสั่งซื้อนี้ถูกนำเข้าหรือยกเลิกแล้ว'; END IF;

  IF p_medication_id IS NOT NULL THEN
    SELECT * INTO v_med FROM public.medications WHERE id = p_medication_id FOR UPDATE;
    IF NOT FOUND OR v_med.is_active IS NOT TRUE THEN RAISE EXCEPTION 'ไม่พบยาที่เปิดใช้งาน'; END IF;
    IF v_med.unit IS DISTINCT FROM v_order.unit THEN RAISE EXCEPTION 'หน่วยรับเข้าไม่ตรงกับหน่วยยาในคลัง'; END IF;
    v_id := v_med.id;
    -- This inventory is aggregate, so retain the earliest known expiry across batches.
    UPDATE public.medications SET stock = stock + p_quantity,
      expiry_date = least(expiry_date, p_expiry_date), updated_at = now() WHERE id = v_id;
  ELSE
    IF coalesce(trim(p_new_medication->>'name'), '') = ''
      OR coalesce(trim(p_new_medication->>'type'), '') = ''
      OR coalesce(trim(p_new_medication->>'category'), '') = ''
      OR (p_new_medication->>'unit') IS DISTINCT FROM v_order.unit
      OR coalesce(p_new_medication->>'coverage_type', '') NOT IN ('covered', 'non_covered')
      OR coalesce((p_new_medication->>'min_stock')::integer, -1) < 0
    THEN RAISE EXCEPTION 'ข้อมูลยาใหม่หรือหน่วยรับเข้าไม่ถูกต้อง'; END IF;
    INSERT INTO public.medications (name, type, category, unit, dosage, brand_name,
      coverage_type, manufacturer, stock, min_stock, mfg_date, expiry_date, is_active)
    VALUES (trim(p_new_medication->>'name'), p_new_medication->>'type', p_new_medication->>'category',
      p_new_medication->>'unit', p_new_medication->>'dosage', p_new_medication->>'brand_name',
      p_new_medication->>'coverage_type', p_new_medication->>'manufacturer', p_quantity,
      (p_new_medication->>'min_stock')::integer, p_mfg_date, p_expiry_date, true)
    RETURNING id INTO v_id;
  END IF;

  INSERT INTO public.inventory_logs (medication_id, pharmacist_id, performed_by, action, quantity, reason, idempotency_key)
  VALUES (v_id, auth.uid(), auth.uid(), 'add', p_quantity,
    'รับยาจากใบสั่งซื้อ ' || coalesce(v_order.order_number, v_order.id::text) || ' Lot: ' || coalesce(p_lot_number, '-'),
    'procurement:' || v_order.id::text);
  UPDATE public.medication_procurements SET status = 'imported', medication_id = v_id,
    received_units = p_quantity, imported_at = now(), imported_by = auth.uid(), updated_at = now(),
    lot_number = nullif(trim(p_lot_number), ''), expiry_date = p_expiry_date, mfg_date = p_mfg_date,
    notes = coalesce(p_notes, notes)
  WHERE id = v_order.id;
END;
$$;
REVOKE ALL ON FUNCTION public.receive_medication_procurement(uuid, uuid, integer, text, date, date, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_medication_procurement(uuid, uuid, integer, text, date, date, text, jsonb) TO authenticated;

-- Never remove dependent history. Foreign keys reject deletion atomically.
CREATE FUNCTION public.delete_unused_medication(p_medication_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'medical') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ลบยา' USING ERRCODE = '42501';
  END IF;
  -- Legacy prescriptions store medication references in JSON instead of foreign keys.
  IF EXISTS (SELECT 1 FROM public.medical_records r,
    LATERAL jsonb_array_elements(coalesce(r.prescribed_medications, '[]'::jsonb)) item
    WHERE item->>'medication_id' = p_medication_id::text) THEN
    RAISE EXCEPTION 'ยานี้มีประวัติอ้างอิง กรุณาปิดใช้งานแทนการลบ';
  END IF;
  DELETE FROM public.medications WHERE id = p_medication_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบรายการยา'; END IF;
EXCEPTION WHEN foreign_key_violation THEN
  RAISE EXCEPTION 'ยานี้มีประวัติอ้างอิง กรุณาปิดใช้งานแทนการลบ';
END;
$$;
REVOKE ALL ON FUNCTION public.delete_unused_medication(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_unused_medication(uuid) TO authenticated;
COMMIT;
