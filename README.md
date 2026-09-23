# WU Clinic Booking & Medication System

ปรับปรุง 20 กันยายน 2569 (2026-09-20) — code progress โดยประมาณ 90%; ยังแยกจากหลักฐาน DB/RLS, deployment และ browser QA

มินิโปรเจกต์ COE67-331 ระบบคลินิกมหาวิทยาลัยและเตือนกินยา กำหนดส่ง 25 กันยายน 2569 package.json และโฟลเดอร์โครงการใช้ชื่อ wu-clinic-booking

## เอกสารหลัก

เริ่มที่ [คู่มืออ่าน](docs/00_reading_guide.md), [ข้อสรุปทีม](docs/10_team_decisions.md), [เกณฑ์ตรวจรับ](docs/08_system_rules_and_acceptance.md), [แผนพัฒนา](docs/09_implementation_plan.md), [Owner views](docs/owners/README.md) และ [บันทึกการเปลี่ยนแปลง](docs/14_change_log.md) Runtime ใช้ Supabase ผ่าน repository; mock/fixture ใช้เฉพาะ automated tests และไม่มี demo fallback ในแอป

## ขอบเขต

มาตรฐานสีและองค์ประกอบเว็บสำหรับทุกโมดูล: [ธีมกลาง WU Clinic](docs/12_visual_design_system.md) ใช้ `brand-*` จาก `src/app/globals.css`

3 บทบาท: ผู้ป่วยสมัคร @mail.wu.ac.th และบันทึกข้อมูลของตน, แพทย์/เภสัชกรบันทึกผลตรวจและจัดการยา, เจ้าหน้าที่/แอดมินจัดการ slot นัดหมาย บัญชี รายการเตือน และ Broadcast ด้วยมือ แต่ละ role มี entry page/dashboard และ role-specific container เมื่อสิทธิ์หรือข้อมูลต่างกัน การมี function ใน code ไม่ถือเป็นหลักฐานว่า deploy, RLS หรือ browser QA ผ่านแล้ว

| เจ้าของ | งาน | ผู้ตรวจ |
| --- | --- | --- |
| ฟีม | สมาชิก โปรไฟล์ สิทธิ์และ session | เฮิร์บ |
| ช้อป (สุพจน์) | แผนก แพทย์ วันลา ตารางและ slot (ตาม D26) | ปาย |
| ปาย | นัด คิว ผลตรวจ และรายการยา | ช้อป (สุพจน์) |
| กัญจน์ | คลังและจ่ายเต็ม | กลอง |
| กลอง | รายการเตือนแบบ manual | กัญจน์ |
| เฮิร์บ | Broadcast และ Dashboard | ฟีม |

สถานะรายโมดูลและหลักฐานล่าสุดอยู่ใน [owner index](docs/owners/README.md) โดยแยก `ทำแล้วใน code`, `ทำบางส่วน/ยังมีช่องว่าง`, `เป็น target ยังไม่พบ code`, `ยังไม่ยืนยัน DB/RLS`, `ยังไม่ตรวจ browser` และ `นอก scope` ออกจากกัน

## เริ่มต้นพัฒนา

ใช้ Node.js ที่เข้ากับ package.json และติดตั้งด้วย npm install จากนั้นสร้าง .env.local ตามการตั้งค่า Supabase ของทีม โดยไม่ commit คีย์

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Runtime เชื่อม Supabase จริงผ่าน repository contract และ session ของผู้ใช้ โดย RLS เป็นขอบเขตสิทธิ์สุดท้าย ไฟล์ migration ที่ใช้กับ schema ปัจจุบันระบุใน [แบบข้อมูลและ ER](docs/03_database_design_and_er.md) อย่ารัน `docs/SQL.md` เพื่ออัปเกรด ก่อนรัน migration/seed ต้องยืนยัน project เป้าหมาย สำรองข้อมูลเมื่อจำเป็น และห้ามเปิด `service_role` ใน browser หรือ commit secret

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

ยังไม่มี script ชื่อ typecheck ใน package.json ก่อน main ต้องผ่าน gates และกรณีหลัก; ก่อนนำเสนอตรวจ AC01–AC22 รวม database integration/RLS, Chrome 360px/1280px และ keyboard/loading/empty/error โดยไม่ใช้อีเมลจริง

## โครงสร้างและ Git

src/app แบ่ง (auth)/(clinic)/(patient)/(dashboard), src/components, services, hooks, lib, types; route/layout guard และ role-specific page/container แยก flow ที่ข้อมูลหรือคำสั่งต่างกัน ฐานข้อมูลใน supabase และเอกสารใน docs ใช้ feature → develop → main ตาม [ข้อตกลง Git](docs/05_folder_and_git_workflow.md)

Data contract และลำดับ migration ปัจจุบันอยู่ใน [03](docs/03_database_design_and_er.md) ส่วน design spec รุ่นเก่าเป็นเอกสารอ้างอิงทางประวัติศาสตร์ Scope ปัจจุบันอยู่ใน [10](docs/10_team_decisions.md), [08](docs/08_system_rules_and_acceptance.md) และ [11](docs/11_functional_requirements.md)
