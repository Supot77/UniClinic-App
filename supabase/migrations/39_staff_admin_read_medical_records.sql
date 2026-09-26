-- Allow staff_admin to inspect canonical medical records without granting record mutation through the PAI workspace.
BEGIN;

CREATE OR REPLACE FUNCTION public.pai_can_read_record(p_patient uuid, p_doctor uuid, p_appointment uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT CASE public.pai_actor_role()
    WHEN 'patient' THEN p_patient = auth.uid()
    WHEN 'medical' THEN p_doctor = auth.uid()
    WHEN 'staff_admin' THEN true
    ELSE false
  END;
$$;

GRANT SELECT ON public.medical_records TO authenticated;
DROP POLICY IF EXISTS "Staff admin can view all medical records" ON public.medical_records;
CREATE POLICY "Staff admin can view all medical records"
  ON public.medical_records FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'staff_admin');

REVOKE ALL ON FUNCTION public.pai_can_read_record(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pai_can_read_record(uuid, uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
