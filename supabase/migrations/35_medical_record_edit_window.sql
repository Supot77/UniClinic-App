-- Allow only the owning medical user to amend a record during the first
-- fifteen minutes after the database inserted it. No new column is needed:
-- created_at is assigned by the medical-record INSERT default (now()).
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_medical_record_edit_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role <> 'medical'
    OR OLD.doctor_id <> auth.uid()
    OR NEW.doctor_id <> OLD.doctor_id
    OR NEW.patient_id <> OLD.patient_id
    OR NEW.appointment_id <> OLD.appointment_id
    OR NEW.created_at <> OLD.created_at
  THEN
    RAISE EXCEPTION 'เฉพาะแพทย์เจ้าของเคสเท่านั้นที่แก้ไขผลตรวจได้';
  END IF;

  IF now() >= OLD.created_at + interval '15 minutes' THEN
    RAISE EXCEPTION 'หมดเวลาแก้ไขผลตรวจแล้ว';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS medical_records_edit_window ON public.medical_records;
CREATE TRIGGER medical_records_edit_window
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_medical_record_edit_window();

DROP POLICY IF EXISTS "Medical and staff admin can manage medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Doctors can view and create medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical can manage medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical can view and create medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical and staff admin can view medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical can create own medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical can update own recent medical records" ON public.medical_records;

CREATE POLICY "Medical and staff admin can view medical records"
  ON public.medical_records FOR SELECT
  TO authenticated
  USING (public.get_user_role() IN ('medical', 'staff_admin'));

CREATE POLICY "Medical can create own medical records"
  ON public.medical_records FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() = 'medical' AND doctor_id = auth.uid());

CREATE POLICY "Medical can update own recent medical records"
  ON public.medical_records FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() = 'medical'
    AND doctor_id = auth.uid()
    AND created_at > now() - interval '15 minutes'
  )
  WITH CHECK (
    public.get_user_role() = 'medical'
    AND doctor_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.update_medical_record(
  p_record_id uuid,
  p_diagnosis text,
  p_advice text,
  p_prescriptions jsonb,
  p_height_cm numeric DEFAULT NULL,
  p_weight_kg numeric DEFAULT NULL,
  p_blood_pressure text DEFAULT NULL,
  p_pulse_bpm integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record public.medical_records%ROWTYPE;
  v_role text;
  v_item jsonb;
  v_med public.medications%ROWTYPE;
  v_meds jsonb := '[]'::jsonb;
  v_ids uuid[] := '{}';
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true;
  IF v_role <> 'medical' THEN
    RAISE EXCEPTION 'เฉพาะแพทย์เท่านั้นที่แก้ไขผลตรวจได้';
  END IF;

  SELECT * INTO v_record
  FROM public.medical_records
  WHERE id = p_record_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบผลตรวจ';
  END IF;
  IF v_record.doctor_id <> auth.uid() THEN
    RAISE EXCEPTION 'เฉพาะแพทย์เจ้าของเคสเท่านั้นที่แก้ไขผลตรวจได้';
  END IF;
  IF now() >= v_record.created_at + interval '15 minutes' THEN
    RAISE EXCEPTION 'หมดเวลาแก้ไขผลตรวจแล้ว';
  END IF;
  IF p_diagnosis IS NULL OR length(btrim(p_diagnosis)) NOT BETWEEN 1 AND 5000
    OR length(coalesce(p_advice, '')) > 5000
  THEN
    RAISE EXCEPTION 'กรุณากรอกผลตรวจและคำแนะนำไม่เกิน 5000 ตัวอักษร';
  END IF;
  IF p_height_cm IS NOT NULL AND p_height_cm NOT BETWEEN 30 AND 250 THEN
    RAISE EXCEPTION 'ส่วนสูงต้องอยู่ระหว่าง 30–250 ซม.';
  END IF;
  IF p_weight_kg IS NOT NULL AND p_weight_kg NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'น้ำหนักต้องอยู่ระหว่าง 1–300 กก.';
  END IF;
  IF p_blood_pressure IS NOT NULL AND btrim(p_blood_pressure) !~ '^[0-9]{2,3}/[0-9]{2,3}$' THEN
    RAISE EXCEPTION 'ความดันโลหิตต้องอยู่ในรูปแบบ systolic/diastolic เช่น 120/80';
  END IF;
  IF p_pulse_bpm IS NOT NULL AND p_pulse_bpm NOT BETWEEN 20 AND 250 THEN
    RAISE EXCEPTION 'ชีพจรต้องอยู่ระหว่าง 20–250 ครั้ง/นาที';
  END IF;
  IF p_prescriptions IS NULL OR jsonb_typeof(p_prescriptions) <> 'array' OR jsonb_array_length(p_prescriptions) > 50 THEN
    RAISE EXCEPTION 'รูปแบบรายการยาไม่ถูกต้อง';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_prescriptions) LOOP
    IF jsonb_typeof(v_item) <> 'object'
      OR coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]{0,5}$'
      OR coalesce(v_item->>'duration_days', '') !~ '^[1-9][0-9]{0,2}$'
      OR coalesce(length(btrim(v_item->>'dosage')), 0) NOT BETWEEN 1 AND 500
      OR coalesce(length(btrim(v_item->>'frequency')), 0) NOT BETWEEN 1 AND 500
    THEN
      RAISE EXCEPTION 'กรุณากรอกรายการยา จำนวน และวิธีใช้ให้ครบ';
    END IF;
    IF (v_item->>'quantity')::integer > 100000 OR (v_item->>'duration_days')::integer > 365 THEN
      RAISE EXCEPTION 'จำนวนยาหรือระยะเวลาไม่ถูกต้อง';
    END IF;
    SELECT * INTO v_med
    FROM public.medications
    WHERE id = (v_item->>'medication_id')::uuid AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ไม่พบยาหรือยาถูกปิดใช้งาน';
    END IF;
    IF v_med.id = ANY(v_ids) THEN
      RAISE EXCEPTION 'รายการยาซ้ำ';
    END IF;
    v_ids := array_append(v_ids, v_med.id);
    v_meds := v_meds || jsonb_build_array(jsonb_build_object(
      'medication_id', v_med.id,
      'name', v_med.name,
      'quantity', (v_item->>'quantity')::integer,
      'dosage', btrim(v_item->>'dosage'),
      'frequency', btrim(v_item->>'frequency'),
      'duration_days', (v_item->>'duration_days')::integer
    ));
  END LOOP;

  UPDATE public.medical_records
  SET diagnosis = btrim(p_diagnosis),
      treatment_notes = btrim(coalesce(p_advice, '')),
      prescribed_medications = v_meds,
      height_cm = p_height_cm,
      weight_kg = p_weight_kg,
      blood_pressure = NULLIF(btrim(p_blood_pressure), ''),
      pulse_bpm = p_pulse_bpm
  WHERE id = p_record_id;

  RETURN p_record_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_medical_record(uuid, text, text, jsonb, numeric, numeric, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_medical_record(uuid, text, text, jsonb, numeric, numeric, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
