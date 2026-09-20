-- Migration 27: Add dispensing unit and packaging conversion fields to medications
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'เม็ด',
  ADD COLUMN IF NOT EXISTS pack_unit TEXT,
  ADD COLUMN IF NOT EXISTS pack_size NUMERIC;

COMMENT ON COLUMN public.medications.unit IS 'หน่วยนับตัดจ่ายย่อยสุด เช่น เม็ด, แคปซูล, ขวด, หลอด, ไวอัล, แอมพูล, ซอง';
COMMENT ON COLUMN public.medications.pack_unit IS 'หน่วยบรรจุภัณฑ์ตอนซื้อเข้า เช่น ลัง, กล่อง, กระปุก, แผง, แกลลอน';
COMMENT ON COLUMN public.medications.pack_size IS 'อัตราการบรรจุ (จำนวนหน่วยย่อยต่อแพ็ค)';

