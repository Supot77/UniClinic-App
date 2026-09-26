-- Restrict medical records to patients and medical users.
-- This supersedes the staff_admin read access introduced by migration 39.
BEGIN;

CREATE OR REPLACE FUNCTION public.pai_can_read_record(p_patient uuid, p_doctor uuid, p_appointment uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT CASE public.pai_actor_role()
    WHEN 'patient' THEN p_patient = auth.uid()
    WHEN 'medical' THEN p_doctor = auth.uid()
    ELSE false
  END;
$$;

REVOKE ALL ON public.medical_records FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.medical_records TO authenticated;

DROP POLICY IF EXISTS "Staff admin can view all medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical and staff admin can manage medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical and staff admin can view medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical can view and create medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Medical can manage medical records" ON public.medical_records;

CREATE POLICY "Medical can manage medical records"
  ON public.medical_records FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'medical')
  WITH CHECK (public.get_user_role() = 'medical');

REVOKE ALL ON FUNCTION public.pai_can_read_record(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pai_can_read_record(uuid, uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
