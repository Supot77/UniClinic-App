-- Super Admin creates doctor and staff accounts from /staff/accounts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staff_position text;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS license_number text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_employee_id_unique
  ON public.profiles (employee_id)
  WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS doctors_license_number_unique
  ON public.doctors (license_number)
  WHERE license_number IS NOT NULL;

ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS doctors_license_number_format;
ALTER TABLE public.doctors ADD CONSTRAINT doctors_license_number_format
  CHECK (license_number IS NULL OR license_number ~ '^[A-Za-z0-9ก-ฮะ-์./-]{4,30}$');

-- Browser sessions cannot grant or remove Super Admin from themselves or others.
CREATE OR REPLACE FUNCTION public.protect_super_admin_flag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'ไม่สามารถเปลี่ยนสิทธิ์ Super Admin จากหน้าเว็บได้';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_super_admin_flag ON public.profiles;
CREATE TRIGGER protect_super_admin_flag
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_flag();

-- หลังรัน migration ให้กำหนด Super Admin คนแรกใน SQL Editor หนึ่งครั้ง:
-- UPDATE public.profiles
-- SET is_super_admin = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin@example.com');
