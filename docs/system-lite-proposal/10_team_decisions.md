# 10. บันทึกการตัดสินใจสำหรับข้อเสนอระบบย่อ

ปรับปรุง 6 กันยายน 2569 (2026-09-06)

> สถานะ: บันทึกสิ่งที่ใช้จัดทำข้อเสนอ ไม่ใช่มติให้แก้ระบบหลักหรือเริ่มพัฒนา

## LITE-D01 — รูปแบบเอกสาร

- สร้างข้อเสนอใหม่ใน `docs/system-lite-proposal/`
- ใช้เลขและหัวข้อ 00–11 ให้เทียบกับเอกสารหลักได้
- ลงรายละเอียดระดับ User Story, ER, Data Dictionary, architecture, rules, AC, scenario, plan และ FR
- ไม่แก้เอกสาร 00–11 เดิม

## LITE-D02 — จำนวนบทบาท

เสนอให้เหลือ 3 บทบาท:

| บทบาท | รวมจากระบบเดิม | หน้าที่หลัก |
| --- | --- | --- |
| Patient | patient | จอง ดูผล ดูยา และเตือนตนเอง |
| Doctor | doctor | ดูนัดตน ตรวจ และสั่งยา |
| Staff | staff + pharmacist | ตาราง นัด Catalog stock และจ่ายยา |

ตัด subtype นักศึกษา/บุคลากรออกจากกฎธุรกิจ เหลือ Patient สมัครด้วยอีเมลมหาวิทยาลัย

ไม่มี Admin role ในแอป ผู้ดูแลโครงการสร้าง Doctor/Staff และกำหนด role ผ่าน Supabase Dashboard

## LITE-D03 — 6 ฟีเจอร์

1. สมัครและเข้าสู่ระบบ
2. จัดการตารางตรวจ
3. จองและจัดการนัด
4. บันทึกผลตรวจ
5. จ่ายยาและตัดสต๊อก
6. เตือนกินยาในเว็บ

ฟีเจอร์ทุกตัวต้องเป็น flow พื้นฐาน ไม่มี automation หรือข้อยกเว้นหลายชั้น

## LITE-D04 — 7 Entity

ใช้ `profiles`, `schedules`, `appointments`, `medical_records`, `medications`, `prescriptions`, `reminders`

การตัด Entity:

- Doctor เป็น profile role doctor
- ไม่มี Department
- สถานะจ่ายอยู่ใน prescription
- stock อยู่ใน medication
- reminder เก็บ last taken ล่าสุด ไม่มี log รายมื้อ
- ไม่มี notification, email job หรือ broadcast

## LITE-D05 — นัดหมายพื้นฐาน

- นัดมี 4 สถานะ: pending, confirmed, completed, cancelled
- pending และ confirmed ใช้ capacity
- ไม่มี rejected แยก; Staff ใช้ cancelled
- ไม่มี in-progress, no-show, queue number, reschedule proposal หรือ auto confirmation
- Patient จองอนาคต; Staff ยืนยันหรือยกเลิก

## LITE-D06 — ผลตรวจ

- หนึ่งนัดมีหนึ่ง medical record
- appointment `confirmed` หมายถึงผลตรวจยังแก้ได้
- Doctor แก้ผลของนัดตนก่อนปิด
- appointment `completed` หมายถึงผลตรวจปิดและแก้ไม่ได้ใน scope
- Patient เห็นผลหลัง appointment completed
- prescription เป็นรายการลูกของ record

## LITE-D07 — การจ่ายยา

- Staff ทำหน้าที่จ่ายยา
- จ่ายทุก prescription ที่ pending ใน record พร้อมกัน
- หาก stock ตัวใดไม่พอ ปฏิเสธทั้งชุด
- จ่ายสำเร็จแล้วลด stock และเปลี่ยนเป็น dispensed
- ไม่มีแบ่งจ่าย ยาค้าง กันยา คืนยา expiry/min-stock หรือ inventory history

## LITE-D08 — เตือน

- Patient ตั้งหนึ่งเวลาต่อ prescription ที่จ่ายแล้ว
- เตือนเฉพาะเมื่อเปิดเว็บ
- เปิด/ปิดและแก้เวลาได้
- กดกินแล้วเก็บ `last_taken_at` ล่าสุด
- ไม่มี email, worker, Web Push, missed, deadline, pause, override หรือ audit

## LITE-D09 — Data Source

- ข้อมูล runtime ทุกอย่างเก็บใน Supabase Auth/PostgreSQL
- ใช้ 7 ตารางธุรกิจพร้อม constraints, indexes และ RLS
- Runtime ใช้ Supabase repository; ไม่มี localStorage หรือ mock fallback
- UI ไม่ผูกกับ Supabase query โดยตรง เรียกผ่าน service/repository contract
- Mock repository ใช้เฉพาะ automated tests ซึ่ง deterministic และไม่มี external network
- ใช้ RPC หนึ่งจุดสำหรับจ่ายยาทั้งชุดและตัด stock แบบ transaction
- Browser ใช้ publishable key; แอปไม่ใช้ secret/legacy `service_role` key

## LITE-D10 — การลดจากระบบหลัก

| ระบบหลัก | ระบบย่อเสนอ |
| --- | --- |
| 5 role | 3 role |
| 20 Entity ใน Data Dictionary | 7 Entity |
| ตารางประจำ แผนก วันลา และ auto worker | รอบตรวจพื้นฐาน |
| นัดหลายสถานะและเลื่อน 24 ชั่วโมง | pending/confirmed/completed/cancelled |
| แบ่งจ่าย ยาค้าง กันยา audit/version | จ่ายเต็มครั้งเดียว |
| มื้อยา deadline, missed, email และ override | เวลาเดียวและ last taken ล่าสุด |
| Broadcast/inbox/Dashboard ตาม role | รายการงานในหน้าฟีเจอร์ |
| normalized Supabase 20 ตารางและ RPC หลาย flow | Supabase 7 ตาราง + RLS + RPC จ่ายยาจุดเดียว |
| AC58 และ SCN7 | LITE-AC26 และ LITE-SCN6 |

## LITE-D11 — สิ่งที่ต้องรักษาแม้ลดระบบ

- Role และ ownership ตรวจที่ service
- RLS ตรวจซ้ำที่ PostgreSQL
- ข้อมูลผู้ป่วยแต่ละคนแยกกัน
- ความจุและ stock ไม่ติดลบ
- Error ไม่เปลี่ยน state บางส่วน
- ไม่ใช้ข้อมูลจริงหรือ secret
- UI มี loading, empty, error, responsive และ keyboard
- แยก “ข้อเสนอ”, “พัฒนาแล้ว” และ “ทดสอบผ่านแล้ว”

## เรื่องที่ต้องให้ทีมตัดสินใจก่อนพัฒนา

| เรื่อง | ทางเลือกที่ข้อเสนอนี้ใช้ | ผู้ต้องยืนยัน |
| --- | --- | --- |
| วิธีอยู่ร่วมกับโค้ดเดิม | ยังไม่เลือกว่าจะปรับเดิมหรือสร้าง route แยก | หัวหน้าทีม/เจ้าของทุกโมดูล |
| Auth/Profile | Patient ใช้ Supabase Auth; Doctor/Staff สร้างผ่าน Dashboard | ฟีม/เฮิร์บ |
| ปฏิทิน | รายการรอบหรือปฏิทินพื้นฐาน | ช้อป/ปาย |
| การจ่ายทั้ง record | จ่ายทุก pending prescription พร้อมกัน | กัญจน์/ปาย |
| การเตือนเมื่อเปิดเว็บ | ไม่มี background guarantee | กลอง/เฮิร์บ |
| ข้อมูล demo | 4 บัญชีหลักและยาอย่างน้อย 3 รายการ | ทุกคน |
| Supabase project | แยก local/test/runtime และห้ามใช้ production data ใน automated tests | หัวหน้าทีม/ฟีม |

เมื่อทีมตอบเรื่องเหล่านี้ ต้องอัปเดตข้อเสนอให้ตรงกันทุกไฟล์ก่อนเริ่ม implementation
