# ระบบคลินิกตรวจสุขภาพและแจ้งเตือนการกินยา (Campus Health Clinic & Medication Reminder System)

> **วิชา:** มินิโปรเจกต์รายวิชาเว็บแอปพลิเคชัน (COE67-331) — วิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยวลัยลักษณ์  
> **กำหนดส่ง / นำเสนอ:** 18 กันยายน 2569

---

## 📌 ภาพรวมโครงการ (Project Overview)

ระบบเว็บแอปพลิเคชันสำหรับบริการคลินิกตรวจสุขภาพภายในมหาวิทยาลัย อำนวยความสะดวกในการนัดหมายแพทย์ล่วงหน้า การจัดการคิวตรวจหน้างาน การบันทึกประวัติการตรวจรักษา (Medical Records) การจัดการคลังยาและการจ่ายยาโดยเภสัชกร ตลอดจนระบบแจ้งเตือนการรับประทานยาส่วนบุคคลสำหรับนักศึกษาและบุคลากรผ่าน In-app Notification และ Email อัตโนมัติ

---

## 🛠️ เทคโนโลยีหลัก (Tech Stack)

* **Frontend Framework:** [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
* **Styling & Icons:** [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/) + [Recharts](https://recharts.org/)
* **Backend as a Service (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL 15+, Supabase Auth, Row Level Security, Realtime, Storage)
* **Email Service:** [Resend API](https://resend.com/) / Supabase Inbucket
* **Testing:** [Vitest](https://vitest.dev/) + [@testing-library/react](https://testing-library.com/) + jsdom

---

## 👥 สมาชิกและโมดูลความรับผิดชอบ (Team & Modules)

แบ่งการทำงานเป็น 6 โมดูลหลักตามโฟลเดอร์เพื่อรองรับการพัฒนาคู่ขนาน:

| ลำดับ | ผู้รับผิดชอบ | โมดูลหลัก | ขอบเขตความรับผิดชอบ | เส้นทางหลัก (Route / Service) |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **ฟีม** | **Auth & Profiles** | ระบบสมัครสมาชิก/ล็อกอินด้วย Email & Password ผ่าน Supabase Auth, จัดการสิทธิ์ (RBAC: `patient`, `staff`, `doctor`, `pharmacist`, `admin`), แก้ไขโปรไฟล์และประวัติแพ้ยา | `app/(auth)/`<br>`services/authService.ts` |
| 2 | **ช้อป** | **Departments & Schedules** | จัดการแผนกคลินิก, ข้อมูลแพทย์ประจำแผนก, สร้างและจัดการรอบเวลาออกตรวจ (Appointment Slots) | `app/(clinic)/departments/`<br>`app/(clinic)/schedules/`<br>`services/scheduleService.ts` |
| 3 | **ปาย** | **Appointments & Records** | ระบบจองคิวตรวจของผู้ป่วย, จัดการคิวหน้างานของเจ้าหน้าที่/แพทย์, บันทึกผลวินิจฉัยและรายการสั่งยา (Medical Records) | `app/(clinic)/appointments/`<br>`app/(clinic)/records/`<br>`services/appointmentService.ts` |
| 4 | **กัญจน์** | **Pharmacy & Inventory** | จัดการสต๊อกคลังยา, เภสัชกรกดยืนยันจ่ายยาตัดสต๊อก, บันทึกประวัติการนำเข้า-ออก-เบิกจ่าย (Inventory Logs) | `app/(clinic)/pharmacy/`<br>`services/medicationService.ts` |
| 5 | **กลอง** | **Reminders & Email Worker** | ผู้ป่วยตั้งเวลาเตือนกินยารายวัน, บันทึกสถานะการกินยา (Taken/Skipped), คำนวณความสม่ำเสมอ (Compliance Rate), ส่งอีเมลเตือนอัตโนมัติ | `app/(patient)/reminders/`<br>`services/reminderService.ts` |
| 6 | **เฮิร์บ** | **Notifications & Dashboard** | กล่องข้อความแจ้งเตือนภายในเว็บ (In-app Notifications), ประกาศข่าวสาร (Broadcast), แดชบอร์ดสรุปสถิติและตัวชี้วัด (KPIs) สำหรับผู้บริหารและแพทย์ | `app/(patient)/notifications/`<br>`app/(dashboard)/dashboard/`<br>`services/dashboardService.ts` |

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```text
wu-clinic-booking/
├── docs/                        # เอกสารความต้องการ ระบบ และเกณฑ์ตรวจรับ
│   ├── 00_reading_guide.md      # คู่มือลำดับการอ่านเอกสาร
│   ├── 01_project_overview.md   # ภาพรวมและขอบเขตงาน
│   ├── 02_user_stories.md       # ข้อกำหนดผู้ใช้งาน
│   ├── 03_database_design_and_er.md # ฐานข้อมูล 11 ตาราง & ER Diagram
│   ├── 04_system_architecture_and_tech_stack.md # สถาปัตยกรรมระบบ
│   ├── 05_folder_and_git_workflow.md # โครงสร้างโฟลเดอร์และข้อตกลง Git
│   ├── 06_development_roadmap.md # แผนการดำเนินงาน 4 ระยะ
│   ├── 07_foundation_and_scope.md # พื้นฐานและขอบเขตระบบ
│   ├── 08_system_rules_and_acceptance.md # กติการะบบและ Acceptance Criteria
│   ├── 09_implementation_plan.md # แผนพัฒนาและรายการตัดสินใจ
│   ├── 10_team_decisions.md     # ประเด็นหารือร่วมกับทีม
│   └── SQL.md                   # สคริปต์ SQL อ้างอิง
├── src/
│   ├── app/                     # Next.js App Router (Route Groups)
│   │   ├── (auth)/              # 👤 [ฟีม] login, register, profile
│   │   ├── (clinic)/            # 🏥 [ช้อป, ปาย, กัญจน์]
│   │   │   ├── departments/     # แผนกตรวจ
│   │   │   ├── schedules/       # ตารางแพทย์
│   │   │   ├── appointments/    # จองคิวตรวจ
│   │   │   ├── records/         # ประวัติการรักษา
│   │   │   └── pharmacy/        # คลังยาและประวัติเบิกจ่าย
│   │   ├── (patient)/           # 💊 [กลอง, เฮิร์บ]
│   │   │   ├── reminders/       # แจ้งเตือนกินยา
│   │   │   └── notifications/   # ศูนย์แจ้งเตือนในระบบ
│   │   ├── (dashboard)/         # 📊 [เฮิร์บ] แดชบอร์ดสถิติ
│   │   │   └── dashboard/
│   │   ├── layout.tsx           # Layout กลาง
│   │   └── page.tsx             # Landing Page
│   ├── components/              # UI Components แยกตามโดเมน
│   │   ├── common/              # คอมโพเนนต์ส่วนกลาง (Button, Card, Badge, Modal, etc.)
│   │   ├── layout/              # Header, Footer
│   │   ├── auth/                # คอมโพเนนต์ระบบสมาชิก
│   │   ├── reminders/           # คอมโพเนนต์ระบบเตือนกินยา
│   │   └── dashboard/           # คอมโพเนนต์กราฟและสถิติ
│   ├── context/                 # Context Providers (AuthContext)
│   ├── hooks/                   # Custom React Hooks
│   ├── lib/                     # Supabase Client & Helper กลาง
│   ├── services/                # Supabase Service Layer แยกฟังก์ชัน
│   └── types/                   # TypeScript Interfaces & Database Types
├── supabase/                    # DDL SQL Migrations, RLS และ Seed Data
│   └── migrations/
└── tests/                       # Test Suites (Vitest)
```

---

## 🗄️ โครงสร้างฐานข้อมูล (Database Schema)

ระบบใช้งาน PostgreSQL บน Supabase ทั้งหมด 11 ตาราง พร้อม Row Level Security (RLS):

1. **`profiles`**: ข้อมูลผู้ใช้, รหัสนักศึกษา, สิทธิ์ (`patient`, `staff`, `doctor`, `pharmacist`, `admin`), ข้อมูลแพ้ยา/โรคประจำตัว
2. **`departments`**: แผนกการรักษา
3. **`doctors`**: ข้อมูลแพทย์, ความเชี่ยวชาญ, แผนกที่สังกัด
4. **`appointment_slots`**: รอบเวลาออกตรวจของแพทย์, ความจุคิว, สถานะรอบตรวจ (`available`, `full`, `closed`)
5. **`appointments`**: ข้อมูลการจองคิวตรวจ, ลำดับคิว, อาการเบื้องต้น, สถานะคิว (`pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`, `rejected`)
6. **`medical_records`**: ผลการตรวจวินิจฉัยของแพทย์, คำแนะนำ, รายการสั่งยา (`prescribed_medications` รูปแบบ JSONB)
7. **`medications`**: คลังยาและเวชภัณฑ์, สต๊อกคงเหลือ, จุดเตือนยาใกล้หมด (`min_stock`), วันหมดอายุ
8. **`inventory_logs`**: บันทึกประวัติการนำเข้า, จ่ายยา, ปรับยอดสต๊อกโดยเภสัชกร
9. **`medication_reminders`**: การตั้งค่ารอบเวลาเตือนกินยาของผู้ป่วย
10. **`medication_logs`**: ประวัติบันทึกการกินยาแต่ละมื้อ (`pending`, `taken`, `missed`)
11. **`notifications`**: กล่องข้อความแจ้งเตือนภายในระบบ (`reminder`, `appointment`, `broadcast`, `system`)

---

## 🚀 เริ่มต้นใช้งาน (Getting Started)

### 1. ความต้องการของระบบ (Prerequisites)
* Node.js >= 20.x
* บัญชีและโปรเจกต์ Supabase

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables)
สร้างไฟล์ `.env.local` ที่ Root Directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. ฐานข้อมูล (Database Migrations)
นำไฟล์ SQL ใน `supabase/migrations/` ไปรันใน Supabase SQL Editor ตามลำดับ:
1. `01_schema.sql` (สร้างตาราง, Primary Key, Foreign Key และ Indexes)
2. `02_rls.sql` (กำหนดสิทธิ์การเข้าถึงข้อมูล Row Level Security)
3. `seed.sql` (ข้อมูลจำลองเริ่มต้น)

### 5. รันเซิร์ฟเวอร์สำหรับพัฒนา (Development Server)
```bash
npm run dev
```
เปิดใช้งานที่ [http://localhost:3000](http://localhost:3000)

### 6. รันการทดสอบ (Testing)
```bash
npm run test
```

---

## 🌿 ข้อตกลงการใช้ Git (Git & Branching Workflow)

* **`main`**: โค้ดเสร็จสมบูรณ์ พร้อมส่งมอบและนำเสนอ
* **`develop`**: กิ่งหลักสำหรับรวมโค้ดที่ผ่านการทดสอบร่วมกัน
* **Feature Branches**: แตกกิ่งออกจาก `develop` ตามชื่อผู้รับผิดชอบ:
  * `feat/auth-feem`
  * `feat/schedule-shop`
  * `feat/appointment-pai`
  * `feat/pharmacy-kan`
  * `feat/reminder-klong`
  * `feat/dashboard-herb`
* **Zero-Conflict Rules**: แก้ไขเฉพาะไฟล์ในโฟลเดอร์ของตนเอง, ดึงโค้ดล่าสุดจาก `develop` สม่ำเสมอ, และเปิด Pull Request (PR) เข้าหา `develop` เท่านั้น

