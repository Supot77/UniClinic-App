# 05. โครงสร้างโฟลเดอร์และข้อตกลงการใช้ Git/GitHub (Folder & Git Guidelines)

เอกสารนี้ระบุการแบ่งโฟลเดอร์ในโปรเจกต์ และข้อตกลงการใช้งาน GitHub เพื่อให้ผู้พัฒนาทั้ง 6 คนสามารถทำงานคู่ขนานกันได้โดยไม่เกิด Code Conflict

---

## 📂 โครงสร้างโฟลเดอร์แบบแบ่งตามฟีเจอร์ (Feature-based Modular Structure)

```text
campus-clinic-web/
├── app/
│   ├── (auth)/                  # 👤 [ฟีม] หน้า Login, Register, Profile
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── profile/page.tsx
│   │
│   ├── (clinic)/
│   │   ├── departments/page.tsx # 👤 [ช้อป] แผนกและตารางตรวจแพทย์
│   │   ├── schedules/page.tsx   # 👤 [ช้อป]
│   │   ├── appointments/page.tsx# 👤 [ปาย] ระบบจองคิวและนัดหมาย
│   │   ├── records/page.tsx     # 👤 [ปาย] บันทึกการตรวจ (Medical Records)
│   │   └── pharmacy/page.tsx    # 👤 [กัญจน์] คลังยาและประวัติ Inventory Logs
│   │
│   ├── (patient)/
│   │   ├── reminders/page.tsx   # 👤 [กลอง] ตั้งเวลาแจ้งเตือนกินยา
│   │   └── notifications/page.tsx # 👤 [เฮิร์บ] กล่องแจ้งเตือน In-app
│   │
│   ├── (dashboard)/             # 👤 [เฮิร์บ] หน้าแดชบอร์ดสรุปสถิติ
│   │   └── dashboard/page.tsx
│   │
│   ├── layout.tsx               # ⚠️ ส่วนกลาง (Navbar/Footer หลัก)
│   ├── page.tsx                 # ⚠️ หน้าแรก (Landing Page)
│   └── globals.css              # ⚠️ สไตล์กลาง
│
├── components/                  # ชิ้นส่วน UI แยกตามคนทำ
│   ├── common/                  # ⚠️ กองกลาง: Button, Modal, Navbar, Input, Badge
│   ├── auth/                    # 👤 [ฟีม] ฟอร์มล็อกอิน, การ์ดโปรไฟล์
│   ├── schedule/                # 👤 [ช้อป] ตารางปฏิทิน, การ์ดข้อมูลแพทย์ (ห้ามปายแตะ)
│   ├── appointment/             # 👤 [ปาย] การ์ดคิวตรวจ, ฟอร์มนัดหมาย (ห้ามช้อปแตะ)
│   ├── pharmacy/                # 👤 [กัญจน์] ตารางสต๊อกยา, ฟอร์มเบิกจ่ายยา
│   ├── reminders/               # 👤 [กลอง] การ์ดยาที่ต้องกิน, สวิตช์เปิด/ปิดเตือน
│   └── dashboard/               # 👤 [เฮิร์บ] กราฟ, การ์ดสรุปตัวเลข
│
├── services/                    # ฟังก์ชันคุยกับ Supabase (แยกตามไฟล์)
│   ├── authService.ts           # 👤 [ฟีม]
│   ├── scheduleService.ts       # 👤 [ช้อป]
│   ├── appointmentService.ts    # 👤 [ปาย]
│   ├── medicationService.ts     # 👤 [กัญจน์]
│   ├── reminderService.ts       # 👤 [กลอง]
│   └── dashboardService.ts      # 👤 [เฮิร์บ]
│
├── lib/
│   └── supabase.ts              # ⚠️ Client กลางสำหรับเรียกใช้ Supabase
└── types/
    └── database.ts              # ⚠️ Type ของ Supabase Tables (ห้ามแก้ตามใจชอบ)
```

---

## 🛡️ กฎเหล็กป้องกัน Git Merge Conflict (Zero-Conflict Rules)

1. **ทำงานเฉพาะในพื้นที่ของตนเอง:** ทุกคนมีโฟลเดอร์ของตัวเองใน `app/`, `components/`, และ `services/` ห้ามเข้าไปแก้ไขไฟล์ของเพื่อนเด็ดขาด
2. **ไฟล์กองกลางต้องสร้างให้เสร็จตั้งแต่วันแรก:** เช่น `lib/supabase.ts`, `components/common/` และ `types/database.ts` ให้หัวหน้าทีมหรือฟีมทำไว้ก่อน จากนั้นให้ทุกคน `git pull` ไปใช้
3. **ห้าม Commit ข้อมูล Secret:** ไฟล์ `.env.local` ต้องอยู่ใน `.gitignore` เสมอ ให้แชร์ค่า Key ผ่าน `.env.example` แทน

---

## 🌿 ข้อตกลงการใช้ Git Branching & GitHub

### โครงสร้างกิ่ง (Branches)
* **`main`**: สำหรับโค้ดเวอร์ชันเสร็จสมบูรณ์ พร้อมนำเสนออาจารย์ (ห้าม Push ตรงเด็ดขาด)
* **`dev`**: สำหรับรวมโค้ดล่าสุดของทุกคนที่ผ่านการทดสอบแล้ว
* **Feature Branches**: กิ่งของแต่ละคน แตกออกจาก `dev` โดยตั้งชื่อดังนี้:
  * `feat/auth-feem`
  * `feat/schedule-shop`
  * `feat/appointment-pai`
  * `feat/pharmacy-kan`
  * `feat/reminder-klong`
  * `feat/dashboard-herb`

### วงจรการทำงานประจำวัน (Daily Git Workflow)
```bash
# 1. ก่อนเริ่มงานทุกเช้า: ดึงโค้ดล่าสุดจาก dev เข้ากิ่งของตัวเอง
git checkout feat/your-feature
git pull origin dev

# 2. เขียนโค้ดในโฟลเดอร์ของตัวเอง และบันทึกงาน
git add .
git commit -m "feat(pharmacy): add inventory logs table UI"

# 3. ก่อนส่งงาน: ดึง dev มาตรวจสอบว่าไม่มี conflict
git pull origin dev

# 4. ส่งโค้ดขึ้น GitHub
git push origin feat/your-feature

# 5. เปิด Pull Request (PR) บน GitHub: จาก feat/your-feature เข้าหา dev
```
