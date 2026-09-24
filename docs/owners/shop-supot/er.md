# ER — Scheduling ของสุพจน์

เรียบเรียง 23 กันยายน 2569 จาก schema migrations และการใช้งานตารางที่พบใน code ปัจจุบัน

## ขอบเขต

แบบจำลองนี้เก็บเฉพาะข้อมูลแผนก แพทย์ บริการ วันลา ตาราง และ slot ในขอบเขต owner สุพจน์ บัญชี `profiles` เป็น shared data; `appointments` อยู่ใน owner view ของปายและแสดงที่นี่เฉพาะจุดเชื่อม slot

## ER

```mermaid
erDiagram
    PROFILES ||--o| DOCTORS : "บัญชีแพทย์"
    DEPARTMENTS o|--o{ DOCTORS : "จัดกลุ่มความเชี่ยวชาญ"
    PROFILES o|--o{ SERVICES : "ผู้สร้าง"
    PROFILES o|--o{ DAILY_SERVICE_OFFERINGS : "ผู้สร้าง"
    SERVICES ||--o{ DAILY_SERVICE_OFFERINGS : "เปิดบริการ"
    DOCTORS ||--o{ DAILY_SERVICE_OFFERINGS : "ให้บริการ"
    DAILY_SERVICE_OFFERINGS ||--o{ APPOINTMENT_SLOTS : "เปิดรอบตรวจ"
    DOCTORS ||--o{ DOCTOR_LEAVES : "มีวันลา"
    AUTH_USERS o|--o{ DOCTOR_LEAVES : "ผู้บันทึก"
    APPOINTMENT_SLOTS ||--o{ APPOINTMENTS : "ถูกเลือกในนัด"

    PROFILES {
        uuid id PK
        text role
    }
    AUTH_USERS {
        uuid id PK
    }
    DEPARTMENTS {
        uuid id PK
        text name
        text description
        boolean is_active
    }
    DOCTORS {
        uuid id PK, FK
        uuid department_id FK
        text specialty
    }
    SERVICES {
        uuid id PK
        text code UK
        text name
        text description
        boolean is_active
        uuid created_by FK
    }
    DAILY_SERVICE_OFFERINGS {
        uuid id PK
        uuid service_id FK
        uuid doctor_id FK
        date offering_date
        boolean is_active
        uuid created_by FK
    }
    APPOINTMENT_SLOTS {
        uuid id PK
        uuid daily_service_offering_id FK
        uuid doctor_id FK
        date slot_date
        time start_time
        time end_time
        int max_capacity
        int booked_count
        text status
    }
    DOCTOR_LEAVES {
        uuid id PK
        uuid doctor_id FK
        date start_date
        date end_date
        text reason
        uuid created_by FK
        timestamptz created_at
    }
    APPOINTMENTS {
        uuid id PK
        uuid slot_id FK
    }
```

`PROFILES` และ `APPOINTMENTS` เป็น shared/external entities; `AUTH_USERS` แสดงเฉพาะ FK ผู้บันทึกวันลา. ความสัมพันธ์จาก slot ไป appointment เป็น handoff ไป flow นัดหมายของปาย

## Key และกติกาความสัมพันธ์

| ความสัมพันธ์ | ข้อกำหนดใน schema/code |
| --- | --- |
| `profiles.id` → `doctors.id` | `doctors.id` เป็น PK และ FK ไปยังบัญชี profile เดียวกัน |
| `profiles.id` → `services.created_by` และ `daily_service_offerings.created_by` | ผู้สร้างอาจอ้างบัญชี profile หนึ่งบัญชี |
| `auth.users.id` → `doctor_leaves.created_by` | ผู้บันทึกวันลาอาจอ้างบัญชี Auth หนึ่งบัญชี |
| `departments.id` → `doctors.department_id` | แพทย์มีแผนกได้ไม่เกินหนึ่งรายการ; `department_id` เว้นว่างได้ |
| `services` → `daily_service_offerings` | offering หนึ่งรายการอ้างบริการเดียว; unique ต่อ `(service_id, doctor_id, offering_date)` |
| `doctors` → `daily_service_offerings` | offering หนึ่งรายการอ้างแพทย์เดียว; มี unique key `(id, doctor_id, offering_date)` รองรับ FK แบบประกอบของ slot |
| `daily_service_offerings` → `appointment_slots` | FK `(daily_service_offering_id, doctor_id, slot_date)` อ้าง `(id, doctor_id, offering_date)` จึงบังคับแพทย์และวันที่ให้ตรงกับ offering |
| `doctors` → `doctor_leaves` | `start_date <= end_date`; exclusion constraint กันช่วงลาซ้อนของแพทย์คนเดียวกัน; การลบแพทย์ลบวันลาที่อ้างถึง |
| `appointment_slots` → `appointments` | `appointments.slot_id` อ้าง `appointment_slots.id`; การจองและจัดการนัดอยู่ใน owner ของปาย |

## ข้อมูลที่ยังไม่ยืนยัน

รายละเอียดนี้อิง migrations และ code ใน repository จึงยังไม่ยืนยันว่า schema หรือ policy ถูก apply ใน Supabase เป้าหมายแล้ว ต้องตรวจ migration history, constraints และ session-based RLS บนฐานเป้าหมายแยกต่างหาก รายละเอียดวันเวลา ความจุ สิทธิ์ และผลจากวันลาดู [User Stories](user-stories.md) และ [Use Cases](use-cases.md)

## แหล่งอ้างอิง

- `supabase/migrations/01_schema.sql` — `departments`, `doctors`, `appointment_slots`, `appointments`
- `supabase/migrations/13_services_and_daily_offerings.sql` — services, offerings และ composite FK
- `supabase/migrations/23_doctor_leaves.sql` — วันลาและข้อจำกัดช่วงวันที่
- `supabase/migrations/24_batch_create_slots.sql` — operation สร้าง slot หลายรายการ
- `src/features/scheduling/data/apiRepository.ts` และ `src/app/api/` — API data paths
- [ER กลาง](../../03_database_design_and_er.md) — แผนที่ข้อมูลส่วนระบบอื่น