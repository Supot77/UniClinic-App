# กลอง — Status

สถานะส่งต่อ: **เสร็จแบบรอยืนยัน**. CRUD และ medication log มีอยู่ใน code; owner ต้องยืนยัน manual-first behavior กับ pause/resume/missed ที่ยังพบใน runtime

## ภาพรวมล่าสุด

- Reminder page รองรับ CRUD, medication selection และ medication log
- `reminderService.ts` มี pause/resume/complete และ log taken/missed
- schema มี reminder status และ date constraints

## หลักฐาน

- Code: `src/app/(patient)/reminders/page.tsx`, `src/services/reminderService.ts`
- Migration: `01_schema.sql`, `03_normalized_transactions.sql`, `07_add_contract_fields.sql`, `11_allow_staff_manage_medication_reminders.sql`
- เอกสารเพิ่มเติม: `docs/12_medication_reminders_updates.md`

## งานค้าง/ข้อจำกัด

- ต้องแยก target manual-first ออกจาก behavior ที่ยังมี pause/resume/missed ใน code
- ยังไม่ยืนยัน staff/medical RLS และ dispensing prerequisite บนฐานจริง
- DB snapshot พบ RLS ของ `medication_reminders` และ `medication_logs` ใช้ `patient` ownership/`medical`/`staff_admin` เป็นหลัก แต่ยังต้องทดสอบด้วย session จริง
- ไม่พบหลักฐานว่า email, worker หรือ automation อยู่ใน scope ปัจจุบัน

## Handoff

รับเฉพาะ dispensing contract จาก kan; patient log ต้องถูกจำกัดด้วย user/session/RLS
