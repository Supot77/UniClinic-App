# ช้อป (สุพจน์) — Status

## การเปลี่ยนแปลงล่าสุด

- สถานะส่งต่อ: **code/function เสร็จ เหลือ UI polish เล็กน้อย** ตามข้อมูลเจ้าของโมดูล; รอบนี้ไม่แก้ Shop code
- `0a3aa2d` เพิ่ม `ConfirmationModal` แทน `window.confirm` ในการเปิด/ปิดแผนก แพทย์ slot และยกเลิกวันลา
- Confirmation แยกช่วงเตรียม request กับ async confirm action และแสดง busy state
- `medical` จัดการวันลาของตนเอง; `staff_admin` จัดการของแพทย์ทุกคน; `patient` ไม่มี action วันลา
- weekend slot creation ถูกซ่อนใน calendar และถูกปฏิเสธซ้ำใน form

## หลักฐานล่าสุดที่มีบันทึก

- targeted schedule tests: 25/25
- typecheck: ผ่าน
- lint: 0 errors / 7 warnings เดิม
- build: ผ่าน และพบ `/departments/[departmentId]`
- full test: 272/273; failure เดิมอยู่ `tests/pharmacy-content-roles.test.tsx:380`

## ข้อจำกัด

- หลักฐานข้างต้นมาจาก change log ก่อนงานเอกสารนี้; ยังไม่ได้รัน quality gate ใหม่จากการแก้เอกสาร
- ยังไม่ตรวจ database integration/RLS บน development/staging
- `docs/Database_check.md` พบ RLS ของ departments/doctors/slots เปิดอยู่ แต่บาง policy ยังอ้าง `admin`, `staff`, `doctor`; ยังไม่ถือว่าตรง canonical role จนกว่าจะยืนยัน target และ policy cleanup
- ยังไม่ตรวจ Chrome 360px/1280px และ keyboard

## Handoff

Appointment ต้องใช้ slot/service/doctor/time/capacity จาก contract นี้ และจัดการผลกระทบจากวันลาด้วยมือ
