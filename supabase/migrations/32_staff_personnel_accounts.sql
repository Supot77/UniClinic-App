-- Active staff creates doctor and staff accounts from /staff/accounts.
DROP TRIGGER IF EXISTS protect_super_admin_flag ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_super_admin_flag();
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_super_admin;

ALTER TABLE public.profiles
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
  CHECK (license_number IS NULL OR license_number ~ '^[0-9]{1,10}$');
