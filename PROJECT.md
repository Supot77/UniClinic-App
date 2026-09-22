# Project: WU Clinic Booking & Medication System (COE67-331)

ปรับปรุง 5 กันยายน 2569 (2026-09-05) — ข้อกำหนดสำหรับพัฒนา ยังไม่ใช่หลักฐานว่าโค้ดหรือฐานข้อมูลทำครบแล้ว

## Source of truth และสถานะ

ใช้ [ข้อสรุปทีม](docs/10_team_decisions.md), [กติกา/AC/SCN](docs/08_system_rules_and_acceptance.md) และ [แผน](docs/09_implementation_plan.md) เป็นเป้าหมาย เอกสารนี้ไม่รายงานฟีเจอร์ว่าเสร็จจากการสำรวจเก่า ไม่มีการแก้ implementation ในรอบนี้

## Stack และโครงสร้างที่ตรวจ

package.json: Next.js 16.3.0, React 19.2.8, TypeScript 5, Tailwind CSS 4, Supabase JS/SSR และ Vitest โค้ดใน src/app ใช้ route groups (auth)/(clinic)/(patient)/(dashboard) ไม่ใช่ชื่อสมาชิกตาม PROJECT รุ่นเก่า

## งานและคู่ตรวจ

| เจ้าของ | งาน | ผู้ตรวจ |
| --- | --- | --- |
| ฟีม | สมาชิก โปรไฟล์ สิทธิ์และ session | เฮิร์บ |
| ช้อป | แผนก แพทย์ ตารางและความจุรอบ | ปาย |
| ปาย | นัด เลื่อนนัด คิว ผลตรวจและแก้ใบสั่ง | ช้อป |
| กัญจน์ | คลัง แบ่งจ่าย กันยาและค้างจ่าย | กลอง |
| กลอง | เจ้าหน้าที่ตั้งเตือน ผู้ป่วยยืนยันเวลา บันทึกมื้อและอีเมล | กัญจน์ |
| เฮิร์บ | แจ้งเตือน Broadcast และ Dashboard 5 บทบาท | ฟีม |

## Contracts ระดับความต้องการ

- Role: patient/staff/doctor/pharmacist/admin หนึ่งค่าต่อบัญชี; student/บุคลากรคือประเภทผู้ป่วย ไม่ใช่ role
- Profile: ชื่อ เบอร์ อีเมลมหาวิทยาลัย ประเภทและรหัสบังคับตามประเภท มี/ไม่มี/ไม่ทราบสำหรับสุขภาพ บัญชีเปลี่ยนสิทธิ์ต้องหยุด session เก่าทันที
- Slot: มีความจุหลายคน ไม่ใช่ booked/blocked แบบหนึ่งคนต่อรอบ; ใช้ available/full/closed
- Appointment: pending/confirmed/in_progress/completed/cancelled/no_show/rejected และข้อเสนอเลื่อนแยกที่มี 24h deadline/การกัน/ประวัติ
- Prescription: แยกจำนวนสั่ง จ่ายจริง ค้าง/ยกเลิก และ version ของส่วนยังไม่จ่าย; กันยาและ inventory audit ต้องสัมพันธ์กับธุรกรรม
- Reminder: Staff สร้างจากจ่ายจริง Patient ยืนยันเวลาแล้วล็อก; log เป็น pending/taken/missed มี actual time และ edit deadline
- Notification: กล่องเฉพาะคน Broadcast snapshot/กันซ้ำ; email ก่อน 10 นาที/พัก/รอบซ้ำ/Staff ข้ามพักหนึ่งครั้ง
- Dashboard: 5 บทบาท Admin ไม่เห็นผลตรวจ ข้อมูลสถิติต้องไม่เปิดผู้ป่วย

นี่เป็นสัญญาระดับความต้องการ ไม่ใช่ interface หรือ RPC ที่นำไปเรียกได้แล้ว ชื่อจริงและ ER เสนอใน [03](docs/03_database_design_and_er.md) ต้องรับรองก่อนแก้ types/services/schema

## Milestones

| วันที่ กันยายน 2569 | งาน |
| --- | --- |
| 5–7 | ล็อกข้อสรุป Schema และข้อมูลกลาง |
| 8–11 | พัฒนาฟีเจอร์ |
| 12–14 | เชื่อมระบบและทดสอบ SCN-01–07 |
| 15 | หยุดเพิ่มฟีเจอร์ |
| 16–17 | แก้บั๊กและซ้อม |
| 18 | ส่งผลงาน |

ทุก milestone ยังไม่ยืนยันผลสำเร็จในงานนี้ ก่อน main ผ่าน lint/typecheck/build และกรณีหลัก ก่อนส่งผ่าน SCN-01–07 อีเมลจริง Chrome 360/1280 และ keyboard

## ข้อมูลกลางและเรื่องค้าง

ใช้ 4 แผนก แพทย์6 เภสัชกร1 ผู้ป่วย8 รวม17บัญชีตาม [Catalog](docs/superpowers/specs/2026-09-04-clinic-demo-data-design.md) หัวหน้าทีมถือ service_role และแจ้งก่อนรีเซ็ต รายการแบบข้อมูล worker/retry คืนยา สูตรสถิติและผู้ดูแลที่ยังไม่ยืนยันอยู่ใน [10](docs/10_team_decisions.md)
