-- Apply after personnel registration migrations. License changes are self-service and audited.
ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS doctors_license_number_format;
ALTER TABLE public.doctors ADD CONSTRAINT doctors_license_number_format
  CHECK (license_number IS NULL OR license_number ~ '^ว\.[0-9]{5,6}$');

CREATE TABLE IF NOT EXISTS public.doctor_license_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id),
  old_license_number text,
  new_license_number text NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_license_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.doctor_license_audit FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_own_doctor_license(new_license text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE old_license text; actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = actor AND role = 'medical' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์แก้ไขเลขใบประกอบวิชาชีพ';
  END IF;
  IF new_license IS NULL OR new_license !~ '^ว\.[0-9]{5,6}$' THEN
    RAISE EXCEPTION 'เลขใบประกอบวิชาชีพต้องเป็น ว. ตามด้วยตัวเลข 5–6 หลัก';
  END IF;
  SELECT license_number INTO old_license FROM public.doctors WHERE id = actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบบัญชีแพทย์'; END IF;
  IF old_license IS DISTINCT FROM new_license THEN
    UPDATE public.doctors SET license_number = new_license, updated_at = now() WHERE id = actor;
    INSERT INTO public.doctor_license_audit (doctor_id, old_license_number, new_license_number, changed_by)
    VALUES (actor, old_license, new_license, actor);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_own_doctor_license(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_doctor_license(text) TO authenticated;
