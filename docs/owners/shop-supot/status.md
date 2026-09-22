# ช้อป (สุพจน์) — Status

## การเปลี่ยนแปลงล่าสุด

- สถานะส่งต่อ: **code/function เสร็จ; เพิ่ม UI progress กันกดซ้ำแล้ว**
- `ScheduleWorkspace` แสดง spinner/disable/`aria-busy` ระหว่างบันทึกบริการ, slot, batch slot และวันลา; `DepartmentWorkspace` ใช้ busy state เดิมกับการบันทึกและการยืนยันเปลี่ยนสถานะ
- CTA `จอง` ในมุมมองรายวันแสดงจนกว่ารอบจะเป็น `closed`; รอบเต็มแสดงเป็น disabled เพื่อไม่ส่งผู้ใช้ไป flow ที่จองไม่ได้
- `0a3aa2d` เพิ่ม `ConfirmationModal` แทน `window.confirm` ในการเปิด/ปิดแผนก แพทย์ slot และยกเลิกวันลา
- Confirmation แยกช่วงเตรียม request กับ async confirm action และแสดง busy state
- `medical` จัดการวันลาของตนเอง; `staff_admin` จัดการของแพทย์ทุกคน; `patient` ไม่มี action วันลา
- weekend slot creation ถูกซ่อนใน calendar และถูกปฏิเสธซ้ำใน form

## หลักฐานล่าสุดที่มีบันทึก

- focused scheduling/department/loading tests: 45/45
- typecheck: ผ่าน
- targeted lint: 0 errors / 0 warnings
- production build: ผ่าน
- `git diff --check`: ผ่าน
- Browser guest `/schedules`: โหลดและแสดง narrow/mobile layout; `/departments` ถูก route guard ส่งไป login

## ข้อจำกัด

- หลักฐานข้างต้นมาจาก change log ก่อนงานเอกสารนี้; ยังไม่ได้รัน quality gate ใหม่จากการแก้เอกสาร
- ยังไม่ตรวจ database integration/RLS บน development/staging
- `docs/Database_check.md` พบ RLS ของ departments/doctors/slots เปิดอยู่ แต่บาง policy ยังอ้าง `admin`, `staff`, `doctor`; ยังไม่ถือว่าตรง canonical role จนกว่าจะยืนยัน target และ policy cleanup
- ยังไม่ยืนยัน authenticated Chrome 360px/1280px, keyboard flow และ loading state จาก browser session จริง

## Handoff

Appointment ต้องใช้ slot/service/doctor/time/capacity จาก contract นี้ และจัดการผลกระทบจากวันลาด้วยมือ
