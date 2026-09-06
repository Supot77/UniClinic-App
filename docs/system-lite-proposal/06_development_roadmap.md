# 06. Roadmap การพัฒนาฉบับย่อ

ปรับปรุง 6 กันยายน 2569 (2026-09-06)

> สถานะ: แผนเสนอ ไม่มีวันเริ่มและยังไม่อนุมัติให้ลงมือ

## แนวทาง

พัฒนาเป็น 4 ระยะ แต่ละระยะต้องใช้งานได้และมี test ก่อนเริ่มระยะถัดไป ห้ามนำฟีเจอร์ที่ตัดออกกลับมาแทรกระหว่างงาน

| ระยะ | งาน | ผลส่งมอบที่เสนอ |
| --- | --- | --- |
| 1. Foundation | schema, RLS, contracts, Supabase repository และ Auth | เข้าใช้ได้ 3 บทบาท ข้อมูลอยู่ Supabase |
| 2. Clinic flow | Schedule, Appointment และ Medical Record | จอง ยืนยัน ตรวจ และปิดผลได้ |
| 3. Medication flow | Medication, Prescription, dispensing และ Reminder | จ่ายเต็ม ตัด stock ตั้งเตือน และกดกินแล้วได้ |
| 4. Integration | เชื่อม flow, RLS/RPC, responsive/keyboard, errors และ full tests | Scenario หลักผ่านทั้ง mock tests และ Supabase test |

## ระยะ 1 — Foundation

- ตรึง 7 ตาราง สถานะ constraints และ indexes
- สร้าง migration, helper role และ RLS policies
- สร้าง repository contract, Supabase implementation และ mock สำหรับ tests
- เตรียม seed สังเคราะห์ขั้นต่ำ: Patient 2, Doctor 1, Staff 1, ยา 3 รายการ
- ทำ Supabase signup/login/logout และ route protection ตาม role
- ผู้ดูแลสร้าง Doctor/Staff ผ่าน Supabase Dashboard
- ทดสอบโดเมนอีเมล ข้อมูลบังคับ session และการเข้าถึงข้อมูลคนอื่น

เงื่อนไขผ่าน: ทุก role เข้าได้เฉพาะหน้าของตน ข้อมูล runtime อยู่ Supabase และ automated tests ไม่ใช้ external network

## ระยะ 2 — Clinic Flow

- Staff สร้างและปิดรอบ
- Patient ดูรอบว่างและจอง
- Staff ยืนยัน/ยกเลิกนัด
- Doctor ดูนัดของตน บันทึกผล เพิ่มรายการยา และปิดตรวจ
- Patient เห็นผลหลังปิด

เงื่อนไขผ่าน: flow ตั้งแต่สร้างรอบถึงปิดผลตรวจทำได้ครบ และรอบเต็มไม่รับนัดเพิ่ม

## ระยะ 3 — Medication Flow

- Staff เพิ่ม/ปรับ stock
- Staff จ่าย prescription ทั้งชุดเมื่อ stock พอ
- การจ่ายเรียก PostgreSQL RPC เดียว
- ระบบไม่เปลี่ยน stock เมื่ออย่างน้อยหนึ่งรายการไม่พอ
- Patient สร้าง reminder จาก prescription ที่จ่ายแล้ว
- Patient เปิด/ปิดและกดกินแล้ว

เงื่อนไขผ่าน: จ่ายซ้ำไม่ได้ stock ไม่ติดลบ และ Patient สร้าง reminder ให้ยาของคนอื่นไม่ได้

## ระยะ 4 — Integration และตรวจรับ

- ทดสอบ Scenario LITE-SCN-01–07
- ตรวจ RLS denial และ RPC rollback กับ Supabase local/test project
- ตรวจ loading, empty, validation, error และ retry สำหรับการอ่าน
- ตรวจ Chrome 360px และ 1280px
- ตรวจ flow หลักด้วย keyboard
- รัน full quality gates และบันทึกผลจริง

## สิ่งที่ห้ามเพิ่มระหว่าง Roadmap

- บทบาท Admin/Pharmacist แยก
- Department, leave, reschedule proposal และ queue automation
- partial dispensing, backorder, reservation และ inventory history
- email, worker, Web Push, Broadcast, inbox และ Dashboard analytics
- Realtime, secret/legacy `service_role` key ในแอป หรือข้อมูลผู้ป่วยจริง

หากต้องเพิ่มรายการเหล่านี้ ต้องทำข้อเสนอเปลี่ยนขอบเขตใหม่ พร้อมผลกระทบต่อ Entity, เวลา และ tests
