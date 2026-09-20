ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emergency_contact_title text,
  ADD COLUMN IF NOT EXISTS emergency_contact_first_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_last_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_emergency_contact_title_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_emergency_contact_title_check
    CHECK (
      emergency_contact_title IS NULL
      OR emergency_contact_title IN ('นาย', 'นาง', 'นางสาว', 'อื่น ๆ')
    );
