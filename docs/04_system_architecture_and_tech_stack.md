# 04. สถาปัตยกรรมระบบและแนวทางการเชื่อมต่อ (System Architecture & Tech Stack)

เอกสารนี้อธิบายสถาปัตยกรรมทางเทคนิค รูปแบบการเชื่อมต่อ API และวิธีหลีกเลี่ยงความซ้ำซ้อนในการพัฒนา เพื่อให้ทีมทำงานได้รวดเร็วและเสถียรที่สุด

---

## 🛠️ รายละเอียด Tech Stack

* **Frontend Framework:** Next.js 15 (React 19, TypeScript, App Router)
* **Styling & Icons:** Tailwind CSS v4, Lucide React / FontAwesome
* **Backend as a Service (BaaS):** Supabase (PostgreSQL, Supabase Auth, Storage)
* **Email Notification Service:** Resend API หรือ Supabase Inbucket/SMTP
* **Cron Job / Background Worker:** Supabase `pg_cron` / Edge Functions หรือ Vercel Cron

---

## 📐 รูปแบบสถาปัตยกรรม (Direct BaaS Architecture)

เพื่อลดความซ้ำซ้อนและประหยัดเวลาพัฒนา 17 วัน เราจะ**ไม่สร้าง API Route คั่นกลางแบบดั้งเดิมสำหรับงาน CRUD ทั่วไป** แต่จะใช้ความสามารถของ Supabase Client ในการเชื่อมต่อโดยตรง

```text
┌─────────────────────────────────────────────────────────────┐
│                 Next.js Frontend (App Router)               │
│                                                             │
│  [Client Components]            [Server Actions / Pages]    │
│  (Forms, Interactive UI)        (Data Fetching, SSR)        │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
      createClientComponent()        createServerComponent()
               │                              │
               └──────────────┬───────────────┘
                              │ Supabase JS SDK
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Backend                       │
│                                                             │
│  ├── Supabase Auth (JWT, Cookie Session Management)         │
│  ├── PostgreSQL Database (Protected with RLS Policies)       │
│  └── Storage (Avatars, Uploaded Files)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 จุดเน้นสำคัญในการพัฒนา (Best Practices vs. Redundancies)

### 1. ระบบยืนยันตัวตน (Authentication) - ฟีม
* **ห้ามทำ:** อย่าเขียนระบบแฮชรหัสผ่านด้วย `bcrypt` เอง หรือสร้างตาราง `sessions` ในฐานข้อมูลเหมือนในตัวอย่างเดิมของอาจารย์
* **สิ่งที่ต้องทำ:** ใช้ `supabase.auth.signUp()` และ `supabase.auth.signInWithPassword()` โดยตรง Supabase จะดูแลเรื่อง Cookie, JWT และการ Refresh Token ให้อัตโนมัติ

### 2. การจัดการข้อมูลและการป้องกันความปลอดภัย (RLS) - ช้อป, ปาย, กัญจน์
* ทุกตารางจะเปิดใช้งาน **Row Level Security (RLS)** ใน Supabase
* การดึงข้อมูลสามารถเขียนคำสั่งใน `services/` ได้โดยตรง เช่น:
  ```typescript
  // ตัวอย่าง services/appointmentService.ts
  import { supabase } from "@/lib/supabase";

  export async function getAppointments(userId: string) {
    const { data, error } = await supabase
      .from("appointments")
      .select(`*, slot:appointment_slots(*, doctor:doctors(*, profile:profiles(full_name)))`)
      .eq("user_id", userId);
    if (error) throw error;
    return data;
  }
  ```

### 3. สถาปัตยกรรมการแจ้งเตือน (Notifications Architecture) - กลอง & เฮิร์บ

```text
[Cron Job / Edge Function] 
       │ ตรวจสอบตาราง medication_reminders และ medication_logs ทุกๆ 15 นาที
       ▼
┌──────────────────────────────────────────────────────────────┐
│  พบรายการยาที่ถึงเวลาทานแต่ยังไม่ได้ทาน (status = 'pending')    │
└──────┬───────────────────────────────────────────────┬───────┘
       │                                               │
       ▼ (1. ส่งแจ้งเตือนภายนอก)                         ▼ (2. ส่งแจ้งเตือนภายใน)
[ยิง Resend Email API]                       [Insert ลงตาราง notifications]
       │                                               │
       ▼                                               ▼
ส่งเข้า Email ผู้ป่วย                          ผู้ป่วยเห็นในเว็บ (In-app Notification)
```
