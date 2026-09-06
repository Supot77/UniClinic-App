# 11. Functional Requirements ฉบับย่อ

ปรับปรุง 6 กันยายน 2569 (2026-09-06)

> สถานะ: Requirement เชิงข้อเสนอ ยังไม่อนุมัติให้พัฒนาและทุกข้อยังไม่ทดสอบ

เอกสารนี้รวม requirement ของ 6 ฟีเจอร์ในรูปแบบตรวจติดตามได้ โดยอ้างกติกาจาก [08](08_system_rules_and_acceptance.md) และการตัดสินใจจาก [10](10_team_decisions.md)

## 1. สมัครและเข้าสู่ระบบ

| รหัส | ผู้ใช้ | Functional Requirement | เกณฑ์สำเร็จ/ข้อจำกัด | เจ้าของเสนอ |
| --- | --- | --- | --- | --- |
| LITE-FR-AUTH-01 | Patient | สมัครและยืนยันอีเมลผ่าน Supabase Auth ด้วย email, password, ชื่อ และเบอร์โทร | email ลงท้าย `@mail.wu.ac.th`; Auth/profile ต้องสร้างสำเร็จและยืนยันก่อนเข้าใช้ | ฟีม |
| LITE-FR-AUTH-02 | ทุกบทบาท | เข้าสู่ระบบ ออกจากระบบ และโหลด session ผ่าน Supabase Auth | ถ้า profile inactive แอปปฏิเสธข้อมูลและ sign out แม้ Auth ออก session แล้ว | ฟีม |
| LITE-FR-AUTH-03 | ผู้ใช้ | อ่านและแก้ profile ตน | แก้ email/role/is_active ตนเองไม่ได้ | ฟีม |
| LITE-FR-AUTH-04 | ผู้ดูแลโครงการ | สร้างบัญชี Doctor/Staff และกำหนด role ผ่าน Supabase Dashboard | ไม่มีหน้าจอ Admin หรือการยกระดับ role ในแอป | ฟีม |
| LITE-FR-AUTH-05 | ระบบ | ตรวจ `profiles.is_active` | บัญชีปิดอ่านหรือเขียนข้อมูลธุรกิจไม่ได้ | ฟีม |
| LITE-FR-AUTH-06 | ระบบ | ตรวจ role และ ownership ด้วย service และ RLS | การเรียก Supabase ตรงต้องถูกปฏิเสธเหมือน UI | ฟีม/ทุกคน |

## 2. จัดการตารางตรวจ

| รหัส | ผู้ใช้ | Functional Requirement | เกณฑ์สำเร็จ/ข้อจำกัด | เจ้าของเสนอ |
| --- | --- | --- | --- | --- |
| LITE-FR-SCH-01 | Staff | สร้างรอบของ Doctor | วัน/เวลาถูกต้อง capacity > 0 และไม่ทับรอบ Doctor เดิม | ช้อป |
| LITE-FR-SCH-02 | Staff | แก้รอบ | รอบมีนัดแล้วแก้ข้อมูลหลักหรือ capacity ต่ำกว่าจำนวนใช้ไม่ได้ | ช้อป |
| LITE-FR-SCH-03 | Staff | เปิดหรือปิดรอบ | รอบปิดไม่รับนัดใหม่; นัดเดิมยังอยู่ | ช้อป |
| LITE-FR-SCH-04 | Doctor | ดูรอบตนเอง | อ่านรอบของ Doctor คนอื่นผ่านหน้าตนไม่ได้ | ช้อป/ฟีม |
| LITE-FR-SCH-05 | Patient | ดูรอบที่จองได้ | แสดงเฉพาะอนาคต สถานะ open และจำนวนยังไม่เต็ม | ช้อป |
| LITE-FR-SCH-06 | ระบบ | คำนวณจำนวนใช้ | นับ pending + confirmed และไม่เกิน capacity | ช้อป/ปาย |

## 3. จองและจัดการนัด

| รหัส | ผู้ใช้ | Functional Requirement | เกณฑ์สำเร็จ/ข้อจำกัด | เจ้าของเสนอ |
| --- | --- | --- | --- | --- |
| LITE-FR-APT-01 | Patient | จองรอบและระบุ reason | รอบต้องจองได้; นัดเริ่ม pending | ปาย |
| LITE-FR-APT-02 | ระบบ | ป้องกันนัดซ้ำ | Patient มีนัด active ใน schedule เดียวได้หนึ่งรายการ | ปาย |
| LITE-FR-APT-03 | Staff | ยืนยัน pending | เปลี่ยนเป็น confirmed เท่านั้น | ปาย |
| LITE-FR-APT-04 | Patient/Staff | ยกเลิก pending หรือ confirmed | เปลี่ยนเป็น cancelled และคืน capacity | ปาย |
| LITE-FR-APT-05 | Patient | ดูนัดตน | อ่านนัดบัญชีอื่นไม่ได้ | ปาย/ฟีม |
| LITE-FR-APT-06 | Doctor | ดู confirmed appointments ในรอบตน | ไม่เห็นนัดของ Doctor อื่น | ปาย/ฟีม |
| LITE-FR-APT-07 | ระบบ | รักษา state เมื่อจองล้มเหลว | ไม่สร้าง appointment และจำนวนใช้ไม่เปลี่ยน | ปาย/ช้อป |

## 4. บันทึกผลตรวจ

| รหัส | ผู้ใช้ | Functional Requirement | เกณฑ์สำเร็จ/ข้อจำกัด | เจ้าของเสนอ |
| --- | --- | --- | --- | --- |
| LITE-FR-REC-01 | Doctor | สร้าง record สำหรับนัดตน | นัดต้อง confirmed และยังไม่มี record | ปาย |
| LITE-FR-REC-02 | Doctor | แก้ diagnosis และ treatment ขณะนัด confirmed | field บังคับครบก่อนเปลี่ยนนัดเป็น completed | ปาย |
| LITE-FR-REC-03 | Doctor | เพิ่ม/แก้/ลบ prescription ขณะนัด confirmed | ยา active, quantity เป็นจำนวนเต็มบวก, instructions ไม่ว่าง | ปาย |
| LITE-FR-REC-04 | Doctor | ปิดผลตรวจ | appointment เปลี่ยนเป็น completed และใช้เป็นสถานะปิดผล | ปาย |
| LITE-FR-REC-05 | ระบบ | ล็อก record ของนัด completed | Doctor แก้ record/prescription ผ่าน flow ปกติไม่ได้ | ปาย |
| LITE-FR-REC-06 | Patient | อ่านผลตรวจตนหลังปิด | ข้อมูลของนัดที่ยังไม่ completed และข้อมูลคนอื่นไม่แสดง | ปาย/ฟีม |

## 5. จ่ายยาและตัดสต๊อก

| รหัส | ผู้ใช้ | Functional Requirement | เกณฑ์สำเร็จ/ข้อจำกัด | เจ้าของเสนอ |
| --- | --- | --- | --- | --- |
| LITE-FR-PHA-01 | Staff | เพิ่มและแก้ Medication | name/unit ไม่ว่าง stock >= 0 | กัญจน์ |
| LITE-FR-PHA-02 | Staff | เปิดหรือปิด Medication | ยาปิดใช้เพิ่มใน prescription ใหม่ไม่ได้ | กัญจน์ |
| LITE-FR-PHA-03 | Staff | ปรับ stock | จำนวนใหม่เป็นจำนวนเต็มไม่ติดลบ | กัญจน์ |
| LITE-FR-PHA-04 | Staff | ดู closed record ที่รอจ่าย | แสดง Patient และ prescription ที่ pending | กัญจน์ |
| LITE-FR-PHA-05 | Staff | จ่าย prescription ทั้งชุดผ่าน RPC | stock ทุกรายการต้องพอ; ลด stock และเปลี่ยนสถานะใน transaction เดียว | กัญจน์ |
| LITE-FR-PHA-06 | RPC | ปฏิเสธเมื่อ stock ไม่พอ | transaction rollback; ไม่มี stock หรือ prescription ใดเปลี่ยน | กัญจน์ |
| LITE-FR-PHA-07 | ระบบ | ป้องกันจ่ายซ้ำ | prescription dispensed แล้วจ่ายไม่ได้ | กัญจน์ |
| LITE-FR-PHA-08 | Patient | ดูรายการยาและสถานะจ่ายของตน | อ่านของบัญชีอื่นไม่ได้ | กัญจน์/ฟีม |

## 6. เตือนกินยาในเว็บ

| รหัส | ผู้ใช้ | Functional Requirement | เกณฑ์สำเร็จ/ข้อจำกัด | เจ้าของเสนอ |
| --- | --- | --- | --- | --- |
| LITE-FR-REM-01 | Patient | สร้าง reminder จาก prescription ตน | prescription ต้อง dispensed และยังไม่มี reminder | กลอง |
| LITE-FR-REM-02 | Patient | ตั้งและแก้เวลา | เวลาเป็น `HH:mm` และใช้ Asia/Bangkok | กลอง |
| LITE-FR-REM-03 | Patient | เปิดหรือปิด reminder | รายการปิดยังเก็บอยู่แต่ไม่แจ้ง | กลอง |
| LITE-FR-REM-04 | UI | แสดงรายการถึงเวลาเมื่อเว็บเปิด | ไม่กล่าวอ้างว่าแจ้งเมื่อ browser ปิด | กลอง |
| LITE-FR-REM-05 | Patient | กดกินแล้ว | บันทึกเวลาปัจจุบันใน `last_taken_at` | กลอง |
| LITE-FR-REM-06 | Patient | อ่าน reminder ตน | อ่านหรือแก้ reminder คนอื่นไม่ได้ | กลอง/ฟีม |

## 7. ข้อกำหนดร่วม

| รหัส | Functional Requirement | เกณฑ์สำเร็จ/ข้อจำกัด | เจ้าของเสนอ |
| --- | --- | --- | --- |
| LITE-FR-SYS-01 | ใช้ Supabase repository ผ่าน contract | Runtime ทุก feature อ่าน/เขียน Supabase; UI ไม่เรียก table ตรง | ทุกคน |
| LITE-FR-SYS-02 | ใช้ Asia/Bangkok | วันที่รอบและเวลาเตือนแสดงตรงกัน | ทุกคน |
| LITE-FR-SYS-03 | คำสั่งคืน Result รูปแบบร่วม | UI แสดง field/global error ภาษาไทยได้ | ทุกคน |
| LITE-FR-SYS-04 | RLS ปกป้องข้อมูลทุกตาราง | anon/role/owner ที่ไม่ตรงอ่านหรือเขียนไม่ได้ | ฟีม/ทุกคน |
| LITE-FR-SYS-05 | ปกป้อง credential และข้อมูล | Password อยู่ Auth; browser ใช้ publishable key; ไม่มีข้อมูลจริงหรือ secret/legacy `service_role` key ใน Git | ทุกคน |
| LITE-FR-SYS-06 | UI มี loading/empty/error | ไม่แสดงเลขหรือข้อมูลสำเร็จปลอมเมื่ออ่านล้มเหลว | เฮิร์บ/ทุกคน |
| LITE-FR-SYS-07 | รองรับ keyboard และ responsive | ตรวจ Chrome 360px และ 1280px | เฮิร์บ/ทุกคน |
| LITE-FR-SYS-08 | Quality gates | รัน lint, typecheck, test และ build ก่อนส่ง code | ทุกคน |
| LITE-FR-SYS-09 | แยก test data source | Automated tests ใช้ MockRepository; RLS/RPC ตรวจใน Supabase local/test | ทุกคน |
| LITE-FR-SYS-10 | รักษา transaction การจ่าย | RPC สำเร็จทั้งชุดหรือ rollback ทั้งชุด | กัญจน์ |

## 8. Traceability

| ฟีเจอร์ | FR | AC | Scenario |
| --- | --- | --- | --- |
| Auth/Profile | AUTH-01–06 | AC01–04 | SCN-01, SCN-03, SCN-06 |
| Schedule | SCH-01–06 | AC05–07 | SCN-01–02 |
| Appointment | APT-01–07 | AC08–12 | SCN-01–03 |
| Medical Record | REC-01–06 | AC13–15 | SCN-01, SCN-03–04 |
| Pharmacy | PHA-01–08 | AC16–19 | SCN-01, SCN-04–05 |
| Reminder | REM-01–06 | AC20–23 | SCN-01, SCN-05–06 |
| Shared Quality | SYS-01–10 | AC24–29 | SCN-01–07 |

รหัส AC/SCN ในตารางหมายถึงรหัส `LITE-` ใน [08](08_system_rules_and_acceptance.md)

## 9. สิ่งที่ไม่ใช่ Functional Requirement ของระบบย่อ

- Supabase Realtime, server-side secret/legacy `service_role` workflow และ production booking concurrency guarantee
- Department, Doctor leave และ automatic schedule generation
- Reschedule, queue automation และ no-show
- Partial dispensing, backorder, reservation, return และ stock history
- Email, background worker, Web Push และ notification inbox
- Missed dose, deadline, pause, staff override และ medication history
- Broadcast, Dashboard KPI และ advanced reports

การเพิ่มรายการใดต้องปรับ 01, 02, 03, 07, 08, 09, 10 และ 11 ให้สอดคล้อง พร้อมประเมิน Entity และเวลาพัฒนาใหม่
