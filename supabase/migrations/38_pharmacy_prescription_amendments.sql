-- Migration 38: Pharmacy prescription edit & dispense RPC
-- ใช้ GUC session variable แทน audit table เพื่อ authorize การแก้ prescribed_medications
-- ข้อมูลใบสั่งยาอยู่ใน medical_records.prescribed_medications อยู่แล้ว

-- ลบตาราง audit เดิมถ้ามี (ไม่จำเป็นต้องใช้)
DROP TABLE IF EXISTS public.pharmacy_prescription_changes CASCADE;

-- อัปเดต trigger: อนุญาตแก้ prescribed_medications เมื่อ RPC ตั้ง session variable
CREATE OR REPLACE FUNCTION public.guard_medical_record_edit_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid() AND is_active = true;

  -- Pharmacy RPC path: allow prescribed_medications-only changes when session flag is set
  IF v_role = 'medical'
    AND (to_jsonb(NEW) - ARRAY['prescribed_medications', 'updated_at'])
      = (to_jsonb(OLD) - ARRAY['prescribed_medications', 'updated_at'])
    AND current_setting('app.pharmacy_rpc_active', true) = 'true'
  THEN RETURN NEW; END IF;

  -- Preserve the existing doctor-only, fifteen-minute clinical record boundary.
  IF v_role IS DISTINCT FROM 'medical' OR OLD.doctor_id IS DISTINCT FROM auth.uid()
    OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
    OR NEW.appointment_id IS DISTINCT FROM OLD.appointment_id OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN RAISE EXCEPTION 'เฉพาะแพทย์เจ้าของเคสเท่านั้นที่แก้ไขผลตรวจได้'; END IF;
  IF now() >= OLD.created_at + interval '15 minutes' THEN RAISE EXCEPTION 'หมดเวลาแก้ไขผลตรวจแล้ว'; END IF;
  RETURN NEW;
END $$;

-- RPC function: แก้ไขหรือจ่ายยาตามใบสั่ง
CREATE OR REPLACE FUNCTION public.change_pharmacy_prescription(
  p_record_id uuid, p_expected jsonb, p_items jsonb, p_reason text, p_action text, p_skip_stock boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_record public.medical_records%ROWTYPE; v_item jsonb; v_med public.medications%ROWTYPE;
  v_result jsonb := '[]'::jsonb; v_ids uuid[] := '{}'; v_quantity integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'medical') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์แก้ไขหรือจ่ายยา' USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('edit', 'dispense') THEN RAISE EXCEPTION 'คำสั่งไม่ถูกต้อง'; END IF;
  IF coalesce(length(trim(p_reason)), 0) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'กรุณาระบุเหตุผลไม่เกิน 1000 ตัวอักษร'; END IF;

  SELECT * INTO v_record FROM public.medical_records WHERE id = p_record_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบใบสั่งยา'; END IF;
  IF v_record.prescribed_medications IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'ใบสั่งยาถูกแก้ไขแล้ว กรุณาโหลดใหม่'; END IF;

  -- ห้ามแก้/จ่ายซ้ำถ้ามีรายการที่จ่ายแล้ว
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_record.prescribed_medications) i WHERE (i->>'dispensed')::boolean IS TRUE) THEN
    RAISE EXCEPTION 'ใบสั่งยานี้มีรายการที่จ่ายแล้ว ไม่สามารถแก้ไขหรือจ่ายซ้ำ';
  END IF;

  -- ห้ามแก้ถ้ามีประวัติตัดสต็อกแล้ว
  IF p_action = 'edit' AND EXISTS (
    SELECT 1 FROM public.inventory_logs WHERE idempotency_key LIKE 'dispense:' || p_record_id::text || ':%'
  ) THEN RAISE EXCEPTION 'ใบสั่งยานี้มีประวัติตัดจ่ายแล้ว กรุณาตรวจสอบประวัติก่อน'; END IF;

  IF p_action = 'dispense' THEN p_items := v_record.prescribed_medications; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'ต้องมีรายการยา 1–50 รายการ';
  END IF;

  -- Lock medications in consistent order to prevent deadlocks
  PERFORM id FROM public.medications WHERE id IN (SELECT (i->>'medication_id')::uuid FROM jsonb_array_elements(p_items) i) ORDER BY id FOR UPDATE;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]{0,5}$'
      OR coalesce(v_item->>'duration_days', '') !~ '^[1-9][0-9]{0,2}$'
      OR coalesce(length(trim(v_item->>'dosage')), 0) NOT BETWEEN 1 AND 500
      OR coalesce(length(trim(v_item->>'frequency')), 0) NOT BETWEEN 1 AND 500
    THEN RAISE EXCEPTION 'กรุณากรอกยา จำนวน ขนาดและวิธีใช้ให้ครบ'; END IF;

    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity > 100000 OR (v_item->>'duration_days')::integer > 365 THEN RAISE EXCEPTION 'จำนวนหรือระยะเวลาเกินขอบเขต'; END IF;

    SELECT * INTO v_med FROM public.medications WHERE id = (v_item->>'medication_id')::uuid AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบยาในคลังหรือยาถูกพักใช้งาน กรุณาแก้รายการยา'; END IF;
    IF v_med.id = ANY(v_ids) THEN RAISE EXCEPTION 'รายการยาซ้ำ'; END IF;
    v_ids := array_append(v_ids, v_med.id);

    IF p_action = 'dispense' THEN
      IF p_skip_stock IS TRUE THEN
        IF NOT EXISTS (SELECT 1 FROM public.inventory_logs WHERE medication_id = v_med.id AND action = 'dispense'
          AND quantity = v_quantity AND idempotency_key = 'dispense:' || p_record_id::text || ':' || v_med.id::text)
        THEN RAISE EXCEPTION 'ไม่พบหลักฐานตัดสต็อกเดิม ไม่สามารถข้ามการตัดสต็อก'; END IF;
      ELSE
        IF EXISTS (SELECT 1 FROM public.inventory_logs WHERE idempotency_key = 'dispense:' || p_record_id::text || ':' || v_med.id::text) THEN
          RAISE EXCEPTION 'มีประวัติตัดสต็อกแล้ว กรุณาตรวจสอบก่อนจ่ายซ้ำ';
        END IF;
        IF v_med.stock < v_quantity THEN RAISE EXCEPTION 'สต็อกยา % ไม่เพียงพอ', v_med.name; END IF;
        UPDATE public.medications SET stock = stock - v_quantity, updated_at = now() WHERE id = v_med.id;
        INSERT INTO public.inventory_logs(medication_id, pharmacist_id, performed_by, action, quantity, reason, idempotency_key)
          VALUES(v_med.id, auth.uid(), auth.uid(), 'dispense', v_quantity, trim(p_reason), 'dispense:' || p_record_id::text || ':' || v_med.id::text);
      END IF;
    END IF;

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'medication_id', v_med.id, 'name', v_med.name,
      'quantity', v_quantity, 'dosage', trim(v_item->>'dosage'),
      'frequency', trim(v_item->>'frequency'),
      'duration_days', (v_item->>'duration_days')::integer
    ) || CASE WHEN p_action = 'dispense'
      THEN jsonb_build_object('dispensed', true, 'dispensed_at', now(), 'dispensed_by', auth.uid())
      ELSE '{}'::jsonb END);
  END LOOP;

  -- Set session flag so the trigger allows this update
  PERFORM set_config('app.pharmacy_rpc_active', 'true', true);

  UPDATE public.medical_records SET prescribed_medications = v_result, updated_at = now() WHERE id = p_record_id;
  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.change_pharmacy_prescription(uuid,jsonb,jsonb,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_pharmacy_prescription(uuid,jsonb,jsonb,text,text,boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
