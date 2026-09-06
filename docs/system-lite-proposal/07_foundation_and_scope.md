# 07. Foundation และ Scope ฉบับย่อ

ปรับปรุง 6 กันยายน 2569 (2026-09-06)

> สถานะ: ข้อเสนอแยกจากระบบหลัก ยังไม่มีผลต่อ source code หรือฐานข้อมูล

## In Scope

### ผู้ใช้

- 3 role: Patient, Doctor, Staff
- Patient สมัครด้วย `mail.wu.ac.th`
- Supabase signup/login/logout/session และ profile พื้นฐาน
- Doctor/Staff สร้างโดยผู้ดูแลผ่าน Supabase Dashboard
- ตรวจสิทธิ์ทั้งเมนูและ service

### ตารางและนัด

- Staff สร้าง แก้ เปิด และปิดรอบ
- รอบมี Doctor, วันที่, เวลา และ capacity
- Patient ดูรอบที่เปิด/ไม่เต็มและจอง
- Staff ยืนยันหรือยกเลิก
- Patient ยกเลิกนัดของตน

### ผลตรวจและยา

- Doctor ดูนัด confirmed ของตน
- บันทึก diagnosis, treatment และ prescription
- ปิดผลตรวจแล้ว Patient อ่านได้
- Staff จัด Catalog และ stock
- จ่ายทุก prescription ในผลตรวจแบบครบครั้งเดียว

### เตือน

- Patient สร้างหนึ่งเวลาเตือนต่อ prescription ที่จ่ายแล้ว
- แสดงเตือนเมื่อเปิดเว็บ
- เปิด/ปิดเตือนและบันทึกเวลาที่กดกินล่าสุด

### คุณภาพ

- Supabase Auth/PostgreSQL เป็น runtime data source
- 7 ตาราง, constraints, RLS และ RPC จ่ายยา
- Supabase repository สำหรับ runtime และ mock repository เฉพาะ tests
- Validation/error ภาษาไทย
- Automated tests แบบ deterministic
- Chrome 360px/1280px และ keyboard สำหรับ flow หลัก

## Out of Scope

| ส่วนที่ตัด | เหตุผลลดระบบ |
| --- | --- |
| Admin และ Pharmacist แยก role | ลด permission matrix และหน้าจอ |
| Student/employee subtype และข้อมูลสุขภาพหลายสถานะ | ลด field และ validation |
| Department และ Doctor entity แยก | Doctor ใช้ profile โดยตรง |
| ปฏิทิน Day/Week/Month ซับซ้อน | ใช้รายการรอบหรือปฏิทินพื้นฐาน |
| วันลาและ auto close/reopen | ตัด worker และสถานะเสริม |
| เลื่อนนัด/ข้อเสนอ 24 ชั่วโมง | ตัด reservation, deadline และ race condition |
| queue/no-show automation | Staff จัดสถานะพื้นฐานเอง |
| audit/version/idempotency ขั้นสูง | ไม่จำเป็นกับ demo ขนาดเล็ก |
| แบ่งจ่าย ยาค้าง และกันยา | จ่ายเต็มหรือปฏิเสธ |
| inventory log และ expiry/min stock | เก็บ stock กับ active เท่านั้น |
| email, cron, worker และ Web Push | เตือนเฉพาะขณะเปิดเว็บ |
| missed/deadline/pause/override | เก็บ last taken ล่าสุดเท่านั้น |
| Notification, Broadcast และ inbox | ไม่อยู่ใน flow รักษาหลัก |
| Dashboard และ KPI 5 บทบาท | ใช้รายการงานตรงแต่ละหน้า |
| Realtime และ Supabase server workflow ซับซ้อน | ใช้ query/RLS พื้นฐานและ RPC จ่ายยาเพียงจุดเดียว |

## ขอบเขตความปลอดภัยที่ยังคง

แม้ระบบย่อ ต้องคงหลักต่อไปนี้:

- ผู้ใช้เข้าถึงเฉพาะข้อมูลที่เกี่ยวข้อง
- Password ให้ Supabase Auth จัดการ ไม่เก็บใน profile, fixture หรือเอกสาร
- Browser ใช้ publishable key เท่านั้น; RLS และ least-privilege grants เปิดครบทุกตาราง
- Error ต้องไม่เผยข้อมูลคนอื่น
- การจ่ายล้มเหลวต้องไม่ลด stock บางส่วน
- ห้ามใช้ข้อมูลผู้ป่วยจริงหรือ secret ใน demo/tests

## ข้อจำกัดที่ยอมรับ

- การเตือนไม่ทำงานเมื่อเว็บปิด
- ไม่มีประวัติการกินยารายวัน มีเพียงเวลาที่กดล่าสุด
- ไม่มีประวัติ stock movement
- ไม่มีการจัดการยาขาดนอกจากแสดง error
- ไม่มีการรับประกัน concurrency ระดับ production สำหรับการจอง
- ความพร้อมใช้งานขึ้นกับ Supabase project และ network

## เงื่อนไขเปลี่ยนจากข้อเสนอเป็นงานพัฒนา

ต้องมีครบก่อนเริ่ม:

1. ทีมอนุมัติ 3 role, 6 ฟีเจอร์ และ 7 Entity
2. เจ้าของแต่ละโมดูลยืนยันขอบเขตและ contract
3. มีแผนรักษาหรือย้ายโค้ดเดิมโดยไม่ลบงานผู้อื่น
4. เตรียม Supabase local/test และ project runtime โดยไม่เปิดเผย secret
5. กำหนด branch, reviewer และลำดับ merge
