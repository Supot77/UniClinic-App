-- Allow professional titles used when staff administrators create doctor accounts.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_title_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_title_check
    CHECK (
      title IS NULL
      OR title IN (
        'นาย', 'นาง', 'นางสาว',
        'นายแพทย์', 'แพทย์หญิง', 'ดร.',
        'อื่น ๆ'
      )
    );
