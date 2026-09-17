-- Migration 26: Add detailed medication attributes and coverage type
-- 👤 Module Owner: Pharmacy (กัญจน์)
-- เพิ่มคอลัมน์: ขนาดยา (dosage), ยี่ห้อ (brand_name), ผู้ผลิต (manufacturer), วันผลิต (mfg_date), สิทธิ์การเบิกจ่าย (coverage_type)

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS dosage text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS mfg_date date,
  ADD COLUMN IF NOT EXISTS coverage_type text DEFAULT 'covered';

-- ตรวจสอบและเพิ่ม CHECK constraint สำหรับ coverage_type ('covered' = ในสิทธิ์เบิกได้, 'non_covered' = นอกสิทธิ์จ่ายนอก)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medications_coverage_type_check'
  ) THEN
    ALTER TABLE public.medications
      ADD CONSTRAINT medications_coverage_type_check
      CHECK (coverage_type IN ('covered', 'non_covered'));
  END IF;
END $$;

-- สร้าง Index เพื่อรองรับการกรองตามสิทธิ์การเบิกจ่าย
CREATE INDEX IF NOT EXISTS idx_medications_coverage_type ON public.medications (coverage_type);

