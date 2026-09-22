# ปาย — Status

สถานะส่งต่อ: **เสร็จแบบรอเจ้าของยืนยัน**. Code path มีหลักฐานใน repository แต่ยังไม่ปิด owner confirmation, DB/RLS และ browser evidence

หลักฐาน DB snapshot ระบุว่า `pai_book_appointment`, `pai_transition_appointment`, `pai_save_record` และ `pai_workspace` มีอยู่ แต่ไม่พบตาราง `pai_appointments` หรือ `pai_medical_records`; ผู้ใช้ยืนยันว่า snapshot เป็น target ปัจจุบันเดียวกับ runtime และ migration ที่เกี่ยวข้อง deploy แล้ว. Repository migration รุ่นหลังชี้ RPC ไปยัง `appointments`/`medical_records` ซึ่งเป็น target ที่ยืนยันแล้ว แต่ยังไม่ปิด owner confirmation และ session-based RLS

## ภาพรวมล่าสุด

- Active appointment/record path อยู่ใน `appointments.tsx`, `medical-records.tsx` และ `clinic-care.tsx`
- Database adapter ใช้ PAI RPC; mock adapter แยกสำหรับ test/offline
- มี vitals validation และ RPC error mapping ใน `clinic-care.tsx`

## หลักฐาน

- Tests: `tests/appointments-records-runtime.test.ts`, `tests/appointments-records-runtime-ui.test.tsx`, `tests/clinic-care-date-picker.test.tsx`, `tests/medical-record-vitals-migration.test.ts`
- Database references: PAI migrations `13`, `14`, `15`, `16`, `21`, `22`, `28`

## งานค้าง/ข้อจำกัด

- PAI RPC และ migration target ได้รับการยืนยันจากผู้ใช้แล้ว; ยังไม่ยืนยัน session-based RLS และ policy role เก่าจะคงไว้จน reset ฐานทดสอบ
- ยังไม่ตรวจ browser responsive/keyboard
- ยังไม่มี reschedule ใน active appointment route และไม่ควรสรุปว่า feature นี้มีอยู่

## Handoff

ส่ง prescription และจำนวนยาที่สั่งให้ `kan`; ส่ง dispensing result ต่อให้ `klong` ตาม contract ใน `docs/09_implementation_plan.md`
