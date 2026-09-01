# 03. การออกแบบฐานข้อมูลและ ER Diagram (Database Design & ER)

เอกสารนี้ระบุโครงสร้างฐานข้อมูล (Database Schema) ทั้งหมด 11 ตาราง ซึ่งสอดคล้องกับข้อกำหนดของระบบและการเชื่อมต่อกับ Supabase

---

## 📊 สรุปความสัมพันธ์ของตาราง (Entity Relationships)

```text
auth.users (Supabase)
   └── 1:1 ── profiles
                 ├── 1:1 ── doctors ── Many:1 ── departments
                 │             │
                 │             ├── 1:Many ── appointment_slots
                 │             │                 └── 1:Many ── appointments (Many:1 to profiles)
                 │             │                                   └── 1:1 ── medical_records
                 │             └── 1:Many ── medical_records
                 │
                 ├── 1:Many ── medication_reminders ── 1:Many ── medication_logs
                 │                    └── Many:1 ── medications
                 │                                      └── 1:Many ── inventory_logs (Many:1 to profiles/pharmacist)
                 │
                 └── 1:Many ── notifications
```

---

## 📑 รายละเอียดตารางข้อมูล (Data Dictionary)

### 1. `profiles` (ข้อมูลผู้ใช้งาน ขยายจาก Supabase Auth)
* `id` (uuid, PK, FK → `auth.users.id`)
* `student_id` (text, Unique, Nullable) - รหัสนักศึกษา/บุคลากร
* `full_name` (text, Not Null) - ชื่อ-นามสกุล
* `phone` (text, Nullable) - เบอร์โทรศัพท์
* `emergency_phone` (text, Nullable) - เบอร์ติดต่อฉุกเฉิน
* `address` (text, Nullable) - ที่อยู่
* `allergies` (text, Nullable) - ประวัติแพ้ยา/อาหาร
* `chronic_diseases` (text, Nullable) - โรคประจำตัว
* `role` (text, Not Null, Default: `'patient'`) - สิทธิ์: `patient`, `staff`, `doctor`, `pharmacist`, `admin`
* `avatar_url` (text, Nullable)
* `created_at`, `updated_at` (timestamptz)

### 2. `departments` (แผนกการรักษา)
* `id` (uuid, PK, Default: `gen_random_uuid()`)
* `name` (text, Not Null) - ชื่อแผนก (เช่น เวชปฏิบัติทั่วไป, ทันตกรรม)
* `description` (text, Nullable)
* `created_at`, `updated_at` (timestamptz)

### 3. `doctors` (ข้อมูลแพทย์)
* `id` (uuid, PK, FK → `profiles.id`)
* `specialty` (text, Nullable) - ความเชี่ยวชาญเฉพาะทาง
* `department_id` (uuid, FK → `departments.id`)
* `created_at`, `updated_at` (timestamptz)

### 4. `appointment_slots` (รอบเวลาตรวจของแพทย์)
* `id` (uuid, PK, Default: `gen_random_uuid()`)
* `doctor_id` (uuid, Not Null, FK → `doctors.id`)
* `slot_date` (date, Not Null) - วันที่เปิดรับตรวจ
* `start_time` (time, Not Null) - เวลาเริ่มต้น
* `end_time` (time, Not Null) - เวลาสิ้นสุด
* `max_capacity` (integer, Not Null, Default: 1) - จำนวนคิวสูงสุด
* `booked_count` (integer, Not Null, Default: 0) - จำนวนคิวที่จองแล้ว
* `status` (text, Not Null, Default: `'available'`) - สถานะ: `available`, `full`, `closed`
* `created_at`, `updated_at` (timestamptz)

### 5. `appointments` (รายการนัดหมาย/คิวตรวจ)
* `id` (uuid, PK, Default: `gen_random_uuid()`)
* `user_id` (uuid, Not Null, FK → `profiles.id`) - ผู้ป่วยที่จอง
* `slot_id` (uuid, Not Null, FK → `appointment_slots.id`)
* `queue_number` (integer, Nullable) - ลำดับคิว
* `reason` (text, Nullable) - อาการเบื้องต้น / เหตุผลที่นัด
* `status` (text, Not Null, Default: `'pending'`) - สถานะ: `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`, `rejected`
* `created_at`, `updated_at` (timestamptz)

### 6. `medical_records` (ประวัติการตรวจและการสั่งยา)
* `id` (uuid, PK, Default: `gen_random_uuid()`)
* `appointment_id` (uuid, Not Null, FK → `appointments.id`)
* `patient_id` (uuid, Not Null, FK → `profiles.id`)
* `doctor_id` (uuid, Not Null, FK → `doctors.id`)
* `diagnosis` (text, Nullable) - ผลการวินิจฉัย
* `treatment_notes` (text, Nullable) - คำแนะนำการดูแลตัวเอง
* `prescribed_medications` (jsonb, Nullable) - รายการยาที่สั่ง โครงสร้าง JSON ที่ต้องใช้:
  ```json
  [
    {
      "medication_id": "uuid-ของยา",
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "3 ครั้ง/วัน (เช้า-กลางวัน-เย็น)",
      "duration_days": 5,
      "quantity": 15
    }
  ]
  ```
* `created_at`, `updated_at` (timestamptz)

### 7. `medications` (คลังยาและเวชภัณฑ์)
* `id` (uuid, PK, Default: `gen_random_uuid()`)
* `name` (text, Not Null) - ชื่อยา
* `type` (text, Not Null) - ชนิดของยา (เม็ด, แคปซูล, น้ำ)
* `category` (text, Not Null) - หมวดหมู่ยา
* `stock` (integer, Not Null, Default: 0) - ยาคงเหลือ
* `min_stock` (integer, Not Null, Default: 0) - จุดเตือนยาใกล้หมด
* `expiry_date` (date, Nullable) - วันหมดอายุ
* `description` (text, Nullable) - สรรพคุณ
* `ingredients` (text, Nullable) - ส่วนประกอบ
* `is_active` (boolean, Default: true)
* `created_at`, `updated_at` (timestamptz)

### 8. `inventory_logs` (ประวัติการจัดการคลังยา - ตอบโจทย์ Feedback อาจารย์)
* `id` (uuid, PK, Default: `gen_random_uuid()`)
* `medication_id` (uuid, Not Null, FK → `medications.id`)
* `pharmacist_id` (uuid, Not Null, FK → `profiles.id`) - เภสัชกรที่ทำรายการ
* `action` (text, Not Null) - การกระทำ: `add` (รับเข้า), `dispense` (จ่ายยา), `adjust` (ปรับยอด), `damage` (ยาชำรุด)
* `quantity` (integer, Not Null) - จำนวนที่มีการเปลี่ยนแปลง (เช่น +100 หรือ -2)
* `reason` (text, Nullable) - เหตุผลประกอบ
* `created_at` (timestamptz, Not Null, Default: `now()`)

### 9. `medication_reminders` (การตั้งเวลาเตือนกินยา)
* `id` (uuid, PK, Default: `gen_random_uuid()`)
* `user_id` (uuid, Not Null, FK → `profiles.id`)
* `medication_id` (uuid, Not Null, FK → `medications.id`)
* `reminder_times` (text[], Not Null) - เวลาที่ต้องกิน เช่น `['08:00', '12:00', '18:00']`
* `start_date` (date, Not Null)
* `end_date` (date, Nullable)
* `status` (text, Not Null, Default: `'active'`) - สถานะ: `active`, `completed`, `paused`
* `created_at`, `updated_at` (timestamptz)

### 10. `medication_logs` (ประวัติบันทึกการกินยาแต่ละมื้อ)
* `id` (uuid, PK, Default: `gen_random_uuid()`)
* `reminder_id` (uuid, Not Null, FK → `medication_reminders.id`)
* `scheduled_datetime` (timestamptz, Not Null) - เวลาที่ถึงกำหนดกิน
* `actual_datetime` (timestamptz, Nullable) - เวลาที่กดยืนยันกินจริง
* `status` (text, Not Null, Default: `'pending'`) - สถานะ: `pending`, `taken`, `missed`
* `created_at`, `updated_at` (timestamptz)

### 11. `notifications` (กล่องแจ้งเตือนภายในระบบ)
* `id` (uuid, PK, Default: `gen_random_uuid()`)
* `user_id` (uuid, Not Null, FK → `profiles.id`) - ผู้รับข้อความ
* `type` (text, Not Null) - ประเภท: `reminder`, `appointment`, `broadcast`, `system`
* `title` (text, Not Null)
* `message` (text, Not Null)
* `is_read` (boolean, Not Null, Default: false)
* `created_at` (timestamptz, Not Null, Default: `now()`)
