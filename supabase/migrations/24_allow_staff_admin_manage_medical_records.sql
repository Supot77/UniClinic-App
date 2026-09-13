-- Migration 24: Allow staff_admin and medical to manage medical_records and dispense prescriptions
-- 1. Grant table access to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.medical_records TO authenticated;

-- 2. Update RLS Policy to allow medical and staff_admin to manage medical_records
DROP POLICY IF EXISTS "Doctors can view and create medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical can manage medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical and staff admin can manage medical records" ON public.medical_records;

CREATE POLICY "Medical and staff admin can manage medical records"
  ON public.medical_records
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role() IN ('medical', 'staff_admin')
  )
  WITH CHECK (
    public.get_user_role() IN ('medical', 'staff_admin')
  );

-- 3. Dedicated RPC with SECURITY DEFINER for dispensing prescriptions
CREATE OR REPLACE FUNCTION public.dispense_medical_record_prescriptions(
  p_record_id uuid,
  p_prescribed_medications jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
  IF v_role NOT IN ('medical', 'staff_admin') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ทำรายการนี้ (เฉพาะแพทย์หรือเจ้าหน้าที่ห้องยาเท่านั้น)';
  END IF;

  UPDATE public.medical_records
  SET prescribed_medications = p_prescribed_medications
  WHERE id = p_record_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispense_medical_record_prescriptions(uuid, jsonb) TO authenticated;
