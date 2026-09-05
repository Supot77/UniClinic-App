# WU Clinic Booking & Medication System

ปรับปรุง 5 กันยายน 2569 (2026-09-05) — ข้อกำหนดสำหรับพัฒนา ยังไม่ใช่หลักฐานว่าโค้ดหรือฐานข้อมูลทำครบแล้ว

มินิโปรเจกต์ COE67-331 ระบบคลินิกมหาวิทยาลัยและเตือนกินยา ส่ง 18 กันยายน 2569 package.json ใช้ชื่อ wu-clinic-booking โฟลเดอร์ในเครื่องชื่อ UniClinic-App

## เอกสารหลัก

เริ่มที่ [คู่มืออ่าน](docs/00_reading_guide.md), [ข้อสรุปทีม](docs/10_team_decisions.md), [เกณฑ์ตรวจรับ](docs/08_system_rules_and_acceptance.md) และ [แผนพัฒนา](docs/09_implementation_plan.md) งานรอบนี้ปรับ Markdown เท่านั้น โค้ด/ฐานข้อมูลยังไม่ได้รับรองว่าตรงข้อสรุปทั้งหมด

## ขอบเขต

5 บทบาท สมัคร @mail.wu.ac.th, จอง 1–14 วัน, เลื่อนนัดเสนอรอบใหม่รอตอบ 24 ชั่วโมง, แบ่งจ่าย/กันยา/รับค้าง, Staff ตั้งเตือนจากรับจริงแล้ว Patient ยืนยันเวลาและล็อก, อีเมลล่วงหน้า 10 นาทีและเตือนในเว็บตามเวลา, Broadcast โดย Admin และ Dashboard แยกบทบาท

| เจ้าของ | งาน | ผู้ตรวจ |
| --- | --- | --- |
| ฟีม | สมาชิก โปรไฟล์ สิทธิ์และ session | เฮิร์บ |
| ช้อป | แผนก แพทย์ ตารางและความจุรอบ | ปาย |
| ปาย | นัด เลื่อนนัด คิว ผลตรวจและแก้ใบสั่ง | ช้อป |
| กัญจน์ | คลัง แบ่งจ่าย กันยาและค้างจ่าย | กลอง |
| กลอง | เจ้าหน้าที่ตั้งเตือน ผู้ป่วยยืนยันเวลา บันทึกมื้อและอีเมล | กัญจน์ |
| เฮิร์บ | แจ้งเตือน Broadcast และ Dashboard 5 บทบาท | ฟีม |

## เริ่มต้นพัฒนา

ใช้ Node.js ที่เข้ากับ package.json และติดตั้งด้วย npm install จากนั้นสร้าง .env.local ตามการตั้งค่า Supabase ของทีม โดยไม่ commit คีย์

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

ไฟล์ฐานที่มี: supabase/migrations/01_schema.sql, 02_rls.sql และ supabase/seed.sql ยังไม่ได้ปรับตามกติกาใหม่ อย่ารัน docs/SQL.md เพื่ออัปเกรด หัวหน้าทีมดูแล service_role/รีเซ็ตเดโมและแจ้งทีมก่อนทุกครั้ง

```bash
npm run dev
```

เปิด [เว็บพัฒนา](http://localhost:3000) รุ่นใน package.json: Next.js 16.3.0, React 19.2.8, TypeScript 5, Tailwind CSS 4, Supabase และ Vitest

## ตรวจงานเมื่อพัฒนาโค้ด

```bash
npm run lint
npx --no-install tsc --noEmit
npm run test
npm run build
```

ยังไม่มี script ชื่อ typecheck ใน package.json ก่อน main ต้องผ่าน gates และกรณีหลัก; ก่อนนำเสนอ SCN-01–07, อีเมลจริง, Chrome 360px/1280px และ keyboard/loading/empty/error

## โครงสร้างและ Git

src/app แบ่ง (auth)/(clinic)/(patient)/(dashboard), src/components, services, hooks, lib, types; ฐานข้อมูลใน supabase และเอกสารใน docs ใช้ feature → dev → main ตาม [ข้อตกลง Git](docs/05_folder_and_git_workflow.md) งานนี้ไม่เปลี่ยน branch หรือรวมโค้ด

ER แยกตารางและชื่อ contract เป็นข้อเสนอใน [03](docs/03_database_design_and_er.md) ยังไม่กำหนดว่าระบบใหม่มี 11 หรือ 12 ตารางตายตัว
