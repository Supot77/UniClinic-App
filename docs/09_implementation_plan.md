# 09. แผนพัฒนาและส่งต่องาน

ปรับปรุง 22 กันยายน 2569 (2026-09-22) — สรุปสถานะ implementation ล่าสุดของทุก feature ใน scope และบันทึกผลส่งมอบ; หลักฐาน deployment, database integration/RLS และ browser acceptance ยังคงแยกตรวจตามขอบเขต

กำหนดส่งรอบปัจจุบันคือ **25 กันยายน 2569**. สถานะ feature implementation ปัจจุบันคือ **สำเร็จครบตาม scope**; ข้อความ estimate และสถานะก่อนส่งมอบยังคงเป็นประวัติศาสตร์ตามวันที่ระบุ

## หลักการก่อนลงโค้ด

1. ใช้ FR ใน [11](11_functional_requirements.md) และเกณฑ์ใน [08](08_system_rules_and_acceptance.md) เป็นขอบเขตปัจจุบัน
2. ตัด worker, cron, email, retry, catch-up, status transition ตามเวลา และ schema สำหรับแบ่งจ่าย/กันยา/ยาค้างออกจากงานใหม่
3. แยก UI จาก service/repository contract ใช้ Supabase database repository เป็น runtime หลัก และใช้ mock ที่ deterministic เฉพาะ automated tests/offline demo
4. แก้เฉพาะไฟล์ในขอบเขตของโมดูล เพิ่ม test สำหรับ success, validation, permission และยืนยันว่า error ไม่เปลี่ยน state
5. รัน migration/seed หรือ database integration กับ development/staging ได้หลังยืนยัน target, review diff, สำรองข้อมูลตามความเสี่ยง และได้รับอนุญาตก่อนกระทบ remote database
6. ทุก role มี guarded entry page/dashboard และแยก role-specific page/container เมื่อ data, action หรือ permission ต่างกัน โดย reuse shared presentational components

## Role contract

ใช้ 3 ค่าเท่านั้น: `patient` (ผู้ป่วย), `medical` (แพทย์/เภสัชกร) และ `staff_admin` (เจ้าหน้าที่/แอดมิน)

ใน Schedule scope แพทย์ (`medical`) บันทึก แก้ไข และยกเลิกวันลาของตนเองได้ ส่วน `staff_admin` จัดการวันลาของแพทย์ทุกคนได้; ทั้งสอง role ต้องผ่าน validation และ RLS ตาม D26/D28

## สถานะ implementation ล่าสุด ณ 22 กันยายน 2569

- ฟีเจอร์ตามขอบเขตปัจจุบันของ Auth/Profile, Scheduling, Appointment, Medical record, Pharmacy, Manual reminder, Broadcast และ Dashboard ถือว่าพัฒนาเสร็จครบตาม scope ที่ส่งมอบ
- Route Handler migration ตาม Phase 0–4 และฟอร์มบันทึกผลตรวจแบบทีละขั้นตอนถูกนำไปใช้งานใน code path และบันทึกในเอกสาร 14
- commit ส่งมอบคือ 9f7d319 บน branch feat/api-route-migration และ push ไปยัง remote แล้ว
- Automated verification ล่าสุด: typecheck ผ่าน, build ผ่าน, focused tests 56/56 ผ่าน, lint 0 errors; full test มี failure เดิม 1 เคสใน dashboard metric ซึ่งอยู่นอกไฟล์งานชุดนี้
- สถานะ “สำเร็จครบตาม scope” หมายถึง feature implementation เสร็จแล้ว; deployment, database integration/RLS และ browser QA เป็นหลักฐานอีกชั้นหนึ่งและต้องรายงานตามผลตรวจจริง

## สถานะ implementation ข้อ 2.2 ณ 20 กันยายน 2569

- ทำแล้วใน code path: รวม role/session helper, รวม date/time constants, เพิ่ม dynamic route `/departments/[departmentId]` และหน้า detail แผนก, รวมถึงทำให้ชิปวันลาใน day/week/month คลิกเพื่อแก้ไขหรือยกเลิกได้ และซ่อน/กันการสร้าง slot ใหม่ในวันเสาร์-อาทิตย์
- code ล่าสุด `0a3aa2d` เพิ่ม `ConfirmationModal` สำหรับยืนยันการเปิด/ปิดแผนก แพทย์ slot และการยกเลิกวันลา โดยแยก confirmation request ออกจาก async persistence และแสดง busy state ระหว่างบันทึก
- สิทธิ์ UI สอดคล้องกับ service contract: `medical` จัดการเฉพาะวันลาของตนเอง, `staff_admin` จัดการได้ทุกแพทย์ และ `patient` ไม่มี action วันลา
- การแก้ไขส่ง `id` เดิมกลับไปที่ repository; การยกเลิกมี Confirmation และลบเฉพาะรายการวันลา ไม่เปิด/ปิด slot หรือนัดหมายเดิมอัตโนมัติ
- ไฟล์หลักที่เกี่ยวข้อง: `src/components/schedules/ScheduleWorkspace.tsx`, `src/components/schedules/DepartmentWorkspace.tsx`, `src/components/schedules/DepartmentDetailWorkspace.tsx`, `src/app/(clinic)/departments/[departmentId]/page.tsx`, `src/constants/dateTime.ts`, `src/lib/requireRole.ts` และ tests ใน `tests/`
- หลักฐานตรวจล่าสุด: targeted ScheduleWorkspace tests ผ่าน 25/25, typecheck ผ่าน, lint ผ่าน 0 errors/7 warnings เดิม, build ผ่าน; full test เหลือ failure เดิมของ pharmacy 1 เคสจาก 273 tests
- ยังต้องตรวจแยก: database integration/RLS บนฐาน development/staging และ browser QA Chrome 360px/1280px/keyboard เพราะ environment นี้ไม่มี browser runtime

## ลำดับ implementation

| ลำดับ | งาน | ผลลัพธ์ |
| --- | --- | --- |
| 1 | Database foundation | ตรวจ migration/RLS/RPC, Supabase clients และ repository factory ให้ database เป็น runtime หลัก |
| 2 | Auth/profile/role shell | สมัคร login session, role guards และ entry page/dashboard สำหรับ 3 roles |
| 3 | Schedule | Supabase repository; `medical`/`staff_admin` จัดการ service catalog, daily offering, แพทย์, วันลา และ slot โดยแผนกใช้บอกความถนัด |
| 4 | Appointment | role-specific containers; `patient` จอง, `staff_admin` ตัดสิน, `medical` เริ่ม/จบตรวจ |
| 5 | Medical record | `medical` บันทึกผลตรวจ/รายการยา; `patient` อ่านของตนผ่าน RLS |
| 6 | Pharmacy | `medical` ตรวจ stock และจ่ายเต็มครั้งเดียวผ่าน transaction/RPC ที่จำเป็น |
| 7 | Manual reminder | `staff_admin` กรอกรายการเตือน; `patient` บันทึกผลเอง |
| 8 | Broadcast/dashboard | `staff_admin` ส่งข้อความเอง และแต่ละ role ใช้ dashboard/container ของตน |
| 9 | ตรวจรับ | รัน tests, database integration/RLS และตรวจ AC01–AC27 ตาม [08](08_system_rules_and_acceptance.md) |

## สัญญาส่งต่องานขั้นต่ำ

| ผู้ส่ง → ผู้รับ | ข้อมูลที่ต้องมี |
| --- | --- |
| Auth → ทุกโมดูล | user ID, 3-value role, session validity และขอบเขตข้อมูล |
| Schedule → Appointment | slot ID, service ID, daily service offering ID, doctor ID, วันเวลาไทย, capacity, สถานะ slot และรายการ slot ที่ได้รับผลกระทบจากวันลา |
| Appointment → Medical | appointment ID, patient ID, doctor ID และสถานะการตรวจ |
| Medical → Pharmacy | prescription/รายการยาและจำนวนที่สั่ง |
| Pharmacy → Reminder | dispensing ID และจำนวนที่จ่ายเต็ม |
| ทุกโมดูล → UI | ผลสำเร็จหรือ error ที่แสดงได้ และข้อมูลเดิมเมื่อคำสั่งล้มเหลว |

## สิ่งที่ไม่ต้องทำในรอบนี้

การเลื่อนนัดแบบข้อเสนอ การยืนยันเมื่อครบเวลา การ no-show/missed อัตโนมัติ การแบ่งจ่าย การกันยา ยาค้าง การแก้ใบสั่งแบบ version การตรวจแพ้ยาอัตโนมัติ การเตือนซ้ำ email/Web Push worker/cron/retry การเชื่อมบริการภายนอก รวมถึง workflow ขอ/อนุมัติวันลาและผลกระทบวันลาอัตโนมัติ; batch สร้าง slot ทำได้เฉพาะเมื่อผู้ใช้กดคำสั่ง และไม่ใช่ recurring automation

## ผู้รับผิดชอบ

| เจ้าของ | งาน | ผู้ตรวจ |
| --- | --- | --- |
| ฟีม | สมาชิก โปรไฟล์ สิทธิ์และ session | เฮิร์บ |
| ช้อป (สุพจน์) | service catalog, daily offering, แผนกความถนัด, แพทย์ วันลา ตารางและ slot (ตาม D26) | ปาย |
| ปาย | นัด คิว ผลตรวจ และรายการยา | ช้อป (สุพจน์) |
| กัญจน์ | คลังและจ่ายเต็ม | กลอง |
| กลอง | รายการเตือนแบบ manual | กัญจน์ |
| เฮิร์บ | Broadcast และ Dashboard | ฟีม |

## หลักฐานก่อนส่งงาน

รัน `npm run lint`, `npx --no-install tsc --noEmit`, `npm run test` และ `npm run build` จาก root ในสถานะโค้ดล่าสุด รายงานผลจริงทุกคำสั่ง และระบุส่วนที่ยังไม่ได้ตรวจ งาน database-first รวม migration `23_doctor_leaves.sql` ต้องมีหลักฐาน database integration/RLS จากฐาน development หรือ staging แยกจาก unit test ไม่ใช้เอกสารแทนหลักฐานการทดสอบ

## Dependency ของงาน

| งานก่อนหน้า | งานที่ใช้ต่อ | เหตุผล |
| --- | --- | --- |
| Auth/profile/role | ทุกโมดูล | ทุกคำสั่งต้องรู้ user ID, role และ session |
| Schedule | Appointment | การจองต้องอ้าง service offering, slot, แพทย์, เวลา และความจุที่มีอยู่ |
| Appointment | Medical record | ผลตรวจต้องผูกกับนัด ผู้ป่วย และแพทย์ที่รับผิดชอบ |
| Medical record | Pharmacy/Reminder | รายการยาต้องมาจากผลตรวจ และเตือนเฉพาะยาที่จ่ายเต็ม |
| ข้อมูลจากทุกโมดูล | Dashboard/Broadcast | แสดงหรือส่งเฉพาะข้อมูลที่บันทึกแล้ว |
| ทุกงานข้างต้น | ตรวจรับ | ต้องทดสอบ flow รวม ไม่ใช่เฉพาะหน้าของโมดูลเดียว |

## Definition of Done สำหรับแต่ละโมดูล

โมดูลถือว่าพร้อมส่งต่อเมื่อมี contract ที่ระบุ input/output และ error, Supabase repository ที่ใช้ session/RLS, mock repository สำหรับ tests, role-specific container เมื่อจำเป็น, ครอบคลุม success/validation/permission และแจ้งผลกระทบต่อไฟล์กลาง หากคำสั่งไม่ผ่านต้องพิสูจน์ว่า state เดิมไม่เปลี่ยน การมีหน้าจอ mock data หรือ query ที่ยังไม่ตรวจ RLS เพียงอย่างเดียวไม่ถือว่าพร้อมส่งต่อ

ผู้รับงานต้องตรวจข้อมูลส่งต่อกับข้อมูลในตารางสัญญา, ทดลองกรณีสำเร็จและกรณีถูกปฏิเสธ แล้วบันทึกข้อจำกัดหรือสิ่งที่ยังไม่ได้ตรวจไว้ก่อนเชื่อมกับโมดูลถัดไป

## Owner status ล่าสุด ณ 22 กันยายน 2569

ทุก feature ในขอบเขตการส่งมอบถือว่าพัฒนาเสร็จและสำเร็จครบตาม scope แล้ว โดยใช้เอกสาร 14 เป็นจุดอ้างอิงไฟล์และผลตรวจล่าสุด ส่วน deployment, database integration/RLS และ browser QA ให้ถือเป็น verification boundary แยกจากสถานะ feature และห้ามเติมผลตรวจที่ยังไม่ได้รัน

## Owner status เดิม ณ 20 กันยายน 2569

รายละเอียด trace แยกตามผู้รับผิดชอบอยู่ใน [owner index](owners/README.md). สรุปคือ Scheduling function เสร็จและเหลือ UI polish, Feem ยังมี registration health fields/runtime validation เป็น backlog, Herb function เสร็จและเหลือ dashboard UI, ส่วน PAI/Kan/Klong ใช้สถานะเสร็จแบบรอ owner/evidence ยืนยัน

ทุกโมดูลยังต้องแยก `ทำแล้วใน code` ออกจาก `ยังไม่ยืนยัน DB/RLS` และ `ยังไม่ตรวจ browser`; migration หรือ mock ใน repository ไม่ถือเป็นหลักฐานว่า environment ปัจจุบัน deploy แล้ว
