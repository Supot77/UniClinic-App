-- Add structured identity fields for patient registration.
-- Keep full_name for backward compatibility with existing pages and RPCs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_title_check,
  DROP CONSTRAINT IF EXISTS profiles_first_name_format_check,
  DROP CONSTRAINT IF EXISTS profiles_last_name_format_check,
  DROP CONSTRAINT IF EXISTS profiles_date_of_birth_check,
  DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_title_check
    CHECK (title IS NULL OR title IN ('นาย', 'นาง', 'นางสาว', 'อื่น ๆ')),
  ADD CONSTRAINT profiles_first_name_format_check
    CHECK (
      first_name IS NULL
      OR first_name ~ '^[A-Za-zก-ฮะ-์]+([ ''-][A-Za-zก-ฮะ-์]+)*$'
    ),
  ADD CONSTRAINT profiles_last_name_format_check
    CHECK (
      last_name IS NULL
      OR last_name ~ '^[A-Za-zก-ฮะ-์]+([ ''-][A-Za-zก-ฮะ-์]+)*$'
    ),
  ADD CONSTRAINT profiles_date_of_birth_check
    CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE),
  ADD CONSTRAINT profiles_gender_check
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'unspecified'));

COMMENT ON COLUMN public.profiles.title IS
  'คำนำหน้าชื่อ: นาย, นาง, นางสาว หรือ อื่น ๆ';
COMMENT ON COLUMN public.profiles.first_name IS
  'ชื่อจริง แยกจากนามสกุลและไม่อนุญาตตัวเลข';
COMMENT ON COLUMN public.profiles.last_name IS
  'นามสกุล แยกจากชื่อจริงและไม่อนุญาตตัวเลข';
COMMENT ON COLUMN public.profiles.date_of_birth IS
  'วันเดือนปีเกิดของผู้ใช้งาน';
COMMENT ON COLUMN public.profiles.gender IS
  'เพศ: male, female หรือ unspecified';
