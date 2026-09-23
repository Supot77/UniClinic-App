# 14. บันทึกการเปลี่ยนแปลง

เอกสารนี้ใช้บันทึกส่วนที่แก้ไขหลังงานโค้ดสำเร็จ เพื่อให้ trace จากงานที่ส่งมอบไปยังไฟล์และหลักฐานตรวจจริงได้ชัดเจน

## ถอด Mock/Demo ออกจาก Runtime และอนุญาตทำงานบน develop — 23 กันยายน 2569

### ขอบเขตและพฤติกรรม

- ปรับ `AGENTS.md`, `docs/05_folder_and_git_workflow.md` และ skill `sync-develop` ให้ทำงานบน `develop` ได้เมื่อเจ้าของสั่ง โดย agent ไม่เปลี่ยน branch/commit/push เอง
- ถอด `ClinicMockProvider` ออกจาก root layout และย้าย appointment mock repository ไป test-only fixture
- Scheduling runtime เริ่มจาก snapshot ว่างและเรียก `ApiSchedulingRepository` เท่านั้น; ไม่มี mock factory/fallback
- Weekly schedule และ doctor templates ยังไม่มี Route Handler จึงคืน error/ค่าว่างแทนการเปลี่ยนข้อมูลจำลองใน memory
- ลบ `seedSampleReminders` ซึ่งสร้าง reminder ตัวอย่างลงฐานจริงได้ ทั้งที่ไม่มี caller
- คง mock adapters/fixtures ที่ tests ใช้ไว้ และอัปเดตกติกา/เอกสาร as-built ตาม D29/D30

### ไฟล์หลัก

- `AGENTS.md`, `.agents/skills/sync-develop/SKILL.md`, `README.md`
- `docs/00_reading_guide.md`, `docs/01_project_overview.md`, `docs/02_user_stories.md`, `docs/03_database_design_and_er.md`, `docs/04_system_architecture_and_tech_stack.md`, `docs/05_folder_and_git_workflow.md`, `docs/07_foundation_and_scope.md`, `docs/09_implementation_plan.md`, `docs/10_team_decisions.md`, `docs/11_functional_requirements.md`, `docs/appointments-and-medical-records.md`, `docs/owners/README.md`, `docs/owners/_shared/{as-built,status}.md`, `docs/owners/{herb,kan,pai,shop-supot}/{as-built,status}.md`
- `src/app/layout.tsx`, `src/features/clinic-care.tsx`, `src/features/mock-database/ClinicMockProvider.tsx`, `src/features/scheduling/context/SchedulingProvider.tsx`, `src/features/scheduling/data/repositoryFactory.ts`, `src/features/scheduling/domain/repository.ts`, `src/services/reminderService.ts`, `src/types/schedule.ts`
- `tests/clinic-care-mock-repository.ts`, `tests/appointments-records-runtime.test.ts`, `tests/appointments-records-runtime-ui.test.tsx`

### Verification

- `npx.cmd --no-install tsc --noEmit`: ผ่าน
- `git diff --check`: ผ่าน
- Automated tests ไม่ได้รันในรอบนี้
- Browser QA และ live Supabase/RLS ไม่ได้ตรวจ

## แก้ JSX ของฟอร์มลงทะเบียนบุคลากร — 23 กันยายน 2569

### ขอบเขตและพฤติกรรม

- เปลี่ยน wrapper รอบตัวเลือกประเภทบัญชีจาก `<form>` เป็น `<div>` เพื่อไม่ให้ซ้อนกับฟอร์มสร้างบัญชีบุคลากรและฟอร์มผู้ป่วยที่ฝังอยู่ใน `RegisterPage`
- คงการ submit และ `handleSubmit` ไว้เฉพาะฟอร์มบุคลากร พร้อมปิด JSX wrapper ให้ครบ ทำให้ Turbopack parse ไฟล์ได้

### ไฟล์หลัก

- `src/components/staff/PersonnelRegistrationForm.tsx`

### Verification

- `npm.cmd run build`: ผ่าน; compile, TypeScript และ static generation 42/42 routes ผ่าน
- `npx.cmd --no-install tsc --noEmit`: ผ่าน
- `npx.cmd --no-install vitest run tests/personnel-registration.test.ts`: ผ่าน 1 file / 6 tests
- targeted ESLint: ผ่าน 0 errors; มี warning เดิม 1 รายการเรื่อง `UserPlus` ไม่ได้ใช้งาน
- `git diff --check`: ผ่าน
- Browser QA และ database/RLS: ไม่ได้ตรวจในรอบนี้

## ปรับปรุงหน้าผลตรวจและรายการยาตาม Issue #121 — 22 กันยายน 2569

### ขอบเขตและพฤติกรรม

- ปรับ shell ให้แต่ละหน้าเหลือ H1 เดียว และแยก H2 ระหว่างฟอร์มบันทึกผลตรวจกับประวัติผลตรวจตาม role
- ปรับข้อความไทย, Stepper และคำเตือนก่อนยืนยันให้ตรงกับงานคลินิกมากขึ้น โดยคงการบันทึกครั้งเดียวและสถานะ `จบตรวจแล้ว`/`รอจบตรวจ`
- จัดฟอร์มรายการยาใหม่เป็นกลุ่มเลือกยา, ขนาด/จำนวน/ระยะเวลา และวิธีใช้/อาหาร; ปุ่มเพิ่มอยู่ใกล้หัวข้อ และปุ่มลบมีพื้นที่กดอย่างน้อย 44×44 px
- เปลี่ยนประวัติผลตรวจเป็นรายการแนวตั้ง เรียงใหม่สุดก่อน ระบุ `วันที่บันทึกผล` แยก empty state ตามสาเหตุ และอธิบายชัดว่ารายการยาเป็นคำสั่งยาไม่ใช่สถานะการจ่ายยา
- ปรับ copy ของ flow เริ่มตรวจในหน้า appointments ให้สอดคล้องกับหน้าผลตรวจ โดยไม่เปลี่ยน repository หรือ data contract

### ไฟล์หลัก

- `src/features/clinic-care.tsx`
- `src/features/medical-records.tsx`
- `src/features/appointments.tsx`
- `tests/appointments-records-runtime-ui.test.tsx`

### Verification

- focused UI tests: ผ่าน 29 tests
- full test suite: ผ่าน 44 files / 377 tests
- `npx.cmd --no-install tsc --noEmit`: ผ่าน
- targeted ESLint สำหรับไฟล์ที่แก้: ผ่าน 0 errors / 0 warnings
- `npm.cmd run build`: ผ่าน; compile, TypeScript และ static generation 42/42 routes ผ่าน
- `npm.cmd run lint`: ยังไม่ผ่านจาก error เดิมนอก scope ใน `src/app/(patient)/reminders/page.tsx` 2 จุด และ warnings เดิม 6 รายการ
- Browser QA 360px/1280px/keyboard: พยายามเปิด Chrome แล้ว แต่ environment นี้ไม่มี browser session ให้ใช้งาน จึงยังยืนยันผ่าน browser จริงไม่ได้

## แก้ไขรอบตรวจที่ปิดก่อนเวลาเริ่ม และลดขอบเขตหน้าจัดการแผนก — 22 กันยายน 2569

### ขอบเขตและพฤติกรรม

- อนุญาตให้แก้ไขรอบตรวจที่ปิดด้วยมือได้ก่อนเวลาเริ่ม โดยคงสถานะ `ปิดรอบ` หลังบันทึก
- ปฏิเสธการแก้ไขรอบที่เวลาเริ่มผ่านแล้วทั้งจากหน้าจอและ backend เพื่อไม่ให้แก้ข้อมูลย้อนหลัง
- เอาแท็บ/บัญชีผู้ป่วยออกจาก `DepartmentWorkspace` ให้เหลือเฉพาะแท็บแผนกและแพทย์
- เพิ่ม regression coverage สำหรับการแก้รอบปิดล่วงหน้าและการไม่แสดงแท็บผู้ป่วย

### Verification

- ยังรัน quality gate หลังการแก้ไขชุดนี้ไม่ครบ; รายงานผลจะอัปเดตหลังรัน focused tests, typecheck, lint และ build

## Progress กันกดซ้ำใน Scheduling และ CTA จองตามสถานะรอบ — 22 กันยายน 2569

### ขอบเขตและไฟล์ที่แก้

- ปรับ `src/components/schedules/ScheduleWorkspace.tsx` ให้การบันทึกบริการมีสถานะ `serviceIsSaving` พร้อม spinner, `disabled`, `aria-busy` และรองรับ error/exception โดยไม่เปิดให้กดซ้ำ
- เพิ่ม `aria-busy` ให้ปุ่มบันทึก slot, สร้าง slot หลายวัน, บันทึก/ยกเลิกวันลา และปุ่มบันทึกแผนก/แพทย์ใน `ScheduleWorkspace.tsx` และ `DepartmentWorkspace.tsx`; ปุ่มยืนยันกลางใน `ConfirmationModal.tsx` รายงาน busy state ด้วย
- ปรับ CTA `จอง` ในมุมมองรายวันให้แสดงต่อเมื่อรอบยังไม่ `closed`; รอบเต็มยังแสดงเป็นปุ่ม disabled `จอง (เต็มแล้ว)` และรอบปิดจะไม่แสดง CTA
- เพิ่ม regression coverage ใน `tests/department-workspace.test.tsx` และ `tests/schedule-workspace-department-filter.test.tsx`

### Verification

- focused Vitest: ผ่าน 3 files / 45 tests
- `npx.cmd --no-install tsc --noEmit`: ผ่าน
- targeted ESLint: ผ่าน 0 errors / 0 warnings
- `npm.cmd run build`: ผ่าน และ compile routes/pages ครบ
- `git diff --check`: ผ่าน
- Browser: `/schedules` โหลดและแสดง layout narrow/mobile ใน guest session; `/departments` ถูก route guard ส่งไป login จึงยังไม่ยืนยัน authenticated form ที่ 360/1280 และ keyboard ครบ
- database integration/RLS และการ deploy remote ยังไม่อยู่ในหลักฐานรอบนี้

## ปรับชื่อโปรไฟล์แบบแยกฟิลด์ให้ครบทุก runtime และ migration — 22 กันยายน 2569

### ขอบเขตและพฤติกรรม

- แก้ Route Handlers ของ doctors, appointments, schedules, medical records และ inventory ให้ดึง `title`, `first_name`, `last_name` แทนคอลัมน์ชื่อแบบรวมที่ถูกยกเลิก
- ปรับ `ApiSchedulingRepository` และ clinic-care adapter ให้ประกอบชื่อด้วย `formatProfileName()` โดยคง `fullName` เฉพาะเป็น display property ภายใน TypeScript/UI
- ปรับ migration ตั้งแต่ `01_schema.sql` ถึง migration ที่นิยาม staff directory, PAI workspace และ notification RPC ให้ฐานใหม่ใช้ structured profile names ตั้งแต่เริ่มต้น; migration 33 คงคำสั่ง `DROP COLUMN IF EXISTS` สำหรับอัปเกรดฐานเดิมอย่างปลอดภัย
- ปรับ `docs/SQL.md`, `docs/Database_check.md` และ design เดิมของ departments/doctors ให้ตรงกับ schema ปัจจุบัน
- เพิ่ม regression tests ที่ป้องกัน runtime query และ migration chain กลับไปอ้างคอลัมน์ชื่อแบบรวมอีก

### Verification

- focused API/schema/runtime tests — ผ่าน 4 files / 61 tests
- full test suite — ผ่าน 42 files / 366 tests
- TypeScript `tsc --noEmit` — ผ่าน
- `npm.cmd run build` — ผ่าน รวม Route Handlers และ 42 static pages
- `npm.cmd run lint` — ผ่าน 0 errors; เหลือ warnings เดิม 5 รายการใน `ProfileContent.tsx`
- ยังไม่ได้รัน migration ซ้ำกับ remote database และยังไม่ได้ทดสอบ authenticated browser session หลังแก้; ต้องยืนยันแยกก่อนถือว่า deployment acceptance ผ่าน

## สถานะส่งมอบล่าสุด — 22 กันยายน 2569

### สถานะฟีเจอร์

- ฟีเจอร์ทั้งหมดในขอบเขตการส่งมอบปัจจุบันถือว่า **พัฒนาเสร็จและสำเร็จครบตาม scope** แล้ว รวม Route Handlers/API adapter และฟอร์มบันทึกผลตรวจแบบทีละขั้นตอน
- การเปลี่ยนแปลงถูกบันทึกใน commit 9f7d319 บน branch feat/api-route-migration และ push ไปยัง origin/feat/api-route-migration แล้ว
- ไม่มี feature backlog ที่ค้างอยู่ในขอบเขตของงานชุดนี้; รายการที่ยังไม่ตรวจด้านล่างเป็น verification boundary ไม่ใช่สถานะฟีเจอร์ไม่สำเร็จ

### หลักฐานล่าสุด

- npx --no-install tsc --noEmit และ npm run build ผ่าน
- Focused tests ผ่าน 56/56 และ lint จบด้วย 0 errors (มี warnings เดิม 5 รายการใน src/components/profile/ProfileContent.tsx)
- Full test รันแล้ว 363/364 tests; failure เดิมอยู่ที่ metric ใน tests/dashboard-service.test.ts:235 และไม่เกี่ยวกับไฟล์ในงานชุดนี้
- Browser QA ที่ 360px/1280px/keyboard และ database integration/RLS ยังเป็นขอบเขตหลักฐานที่ยังไม่ได้ตรวจยืนยัน จึงไม่ใช้เอกสารนี้อ้างว่า deploy หรือ full acceptance ผ่าน

## ย้าย runtime data access ไปยัง Route Handlers ตามแผนไฟล์ 15 — 22 กันยายน 2569

### ขอบเขตและไฟล์ที่แก้

- เพิ่ม Route Handlers ใน `src/app/api/` สำหรับ auth, departments, doctors/leaves, schedules/slots, appointments, medical-records, medications, reminders และ dashboard stats รวม supporting routes ของ services, offerings, inventory และ medication logs
- เพิ่ม `src/app/api/_lib/auth.ts`, `src/app/api/_lib/http.ts`, `src/features/scheduling/data/apiRepository.ts` และ `tests/api-route-handlers.test.ts`
- ปรับ `SchedulingProvider.tsx`, `clinic-care.tsx`, `authService.ts`, `landingService.ts`, `scheduleService.ts`, `medicationService.ts` และ `reminderService.ts` ให้ runtime เรียกผ่าน `apiClient`

### พฤติกรรมและ guard ที่เพิ่ม

- Route ทุกตัวตรวจ session/profile/role ผ่าน Supabase Server Client; writes ตรวจ UUID, payload, role ownership และแปลง PostgREST errors เป็น HTTP responses
- รักษา service/RPC boundary เดิมสำหรับการจอง, transition, บันทึกเวชระเบียน และ batch slot creation
- เพิ่ม validation ฝั่ง server สำหรับ slot วันย้อนหลัง/วันทำการ/เวลาคลินิก/พักกลางวัน/วันลา/conflict/capacity และ leave overlap
- เพิ่ม `/api/doctors/accounts` เพื่อไม่ให้ scheduling ใช้รายชื่อบัญชีแพทย์จากข้อมูล `doctors` ที่ไม่ครบ และไม่เปิดเผยตัวเลือกนี้แก่ patient

### Verification

- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- targeted ESLint สำหรับ `src/app/api`, adapters/services ที่เปลี่ยน และ route tests — ผ่าน 0 errors/0 warnings
- targeted route tests `npx.cmd vitest run tests/api-route-handlers.test.ts` — ผ่าน 5/5
- `npm.cmd run build` — ผ่าน (Next route compilation และ static pages ผ่าน)
- `npm.cmd test` — 362/363 ผ่าน; failure เดิมใน `tests/dashboard-service.test.ts` คาดหวัง metric `[1,0,1]` แต่ได้ `[1,1,1]`; `src/services/dashboardService.ts` ไม่ได้แก้ในงานนี้
- `npm.cmd run lint` — ไม่ผ่านจาก warning เดิม 5 รายการใน `src/components/profile/ProfileContent.tsx` (ไม่มี error ใน route migration scope)
- browser/database integration/SCN-01 ถึง SCN-07 — ยังไม่ตรวจยืนยัน; ห้ามสรุปว่า full acceptance ผ่าน

## ฟอร์มบันทึกผลตรวจแบบทีละขั้นตอน — 22 กันยายน 2569

### ขอบเขตและไฟล์ที่แก้

- ปรับ `src/features/appointments.tsx` ให้แพทย์กด `เริ่มตรวจ` แล้วเปิดฟอร์มตรวจในหน้าเดิมทันที และเปิดฟอร์มเดิมต่อได้จากนัดที่อยู่สถานะ `in_progress` แต่ยังไม่มีผลตรวจ
- ปรับ `src/features/medical-records.tsx` ให้กรอกตามลำดับ `การตรวจร่างกายเบื้องต้น` → `สรุปผลตรวจ` → `รายการยา` → `ตรวจทานและยืนยัน` พร้อม validation รายสเต็ป
- ปรับ `tests/appointments-records-runtime-ui.test.tsx` ให้ครอบคลุมการเริ่มตรวจและการกรอก stepper; ยังคงบันทึกผ่าน `saveRecord` เดิมครั้งเดียว และไม่เพิ่ม schema, draft หรือ RPC ใหม่

### Verification

- `npx.cmd --no-install next typegen` — ผ่าน
- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- `npm.cmd run lint` — ผ่าน 0 errors, 5 warnings เดิมใน `src/components/profile/ProfileContent.tsx`
- focused tests `npx.cmd --no-install vitest run tests/appointments-records-runtime.test.ts tests/appointments-records-runtime-ui.test.tsx tests/api-route-handlers.test.ts` — ผ่าน 3 files / 56 tests
- full `npm.cmd run test` — ผ่าน 41/42 files และ 363/364 tests; failure เดิมที่ `tests/dashboard-service.test.ts:235` คาดหวัง metric `[1,0,1]` แต่ได้ `[1,1,1]`; ไม่เกี่ยวกับไฟล์ stepper ที่แก้
- `npm.cmd run build` — ผ่าน และ compile route handlers กับหน้า appointments/records สำเร็จ
- Browser QA ที่ 360px/1280px, keyboard และ database integration/RLS — ยังไม่ได้ตรวจยืนยัน


## Refactor ชื่อโมดูล Shop เป็น Scheduling — 21 กันยายน 2569

- **ขอบเขต:** เปลี่ยนชื่อ technical identifiers จาก `shop` ซึ่งเป็นชื่อ owner เดิม ให้สื่อความหมายตาม domain เดียวกับโมดูลอื่น
- **ไฟล์หลัก:** ย้าย `src/features/shop/` เป็น `src/features/scheduling/`; เปลี่ยน `ShopProvider`, `ShopRepository`, `MockShopRepository`, `DatabaseShopRepository` และ `useShop` เป็นชื่อ `Scheduling*`/`useScheduling`
- **Consumer และ tests:** ปรับ clinic layout, schedule/department workspaces, landing service, schedule types และเปลี่ยนชื่อ scheduling repository/rules tests
- **เอกสาร:** ปรับ current code references และ diagram labels; คง owner slug `shop-supot` และ historical specs เพื่อ trace เจ้าของ/ประวัติเดิม
- **พฤติกรรม:** ไม่เปลี่ยน route, database schema, migration, repository contract semantics หรือ UI behavior

### Verification

- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- targeted scheduling tests — 106/107 ผ่าน; failure เดิมที่ `tests/doctor-leaves.test.ts:73`
- targeted ESLint — ผ่าน
- `npm.cmd run build` — ผ่าน
- `npm.cmd run lint` — ไม่ผ่านจาก error เดิมนอก scope ที่ `src/components/settings/SettingsContent.tsx:101` และ warnings 9 รายการ
- `npm.cmd run test` — 299/300 tests ผ่าน; failure เดิมที่ `tests/doctor-leaves.test.ts:73`
- Browser QA และ database integration/RLS — ยังไม่ได้ตรวจ; refactor นี้ไม่เปลี่ยน UI behavior หรือ schema

## งาน 2.2 โมดูลแผนก แพทย์ วันลา ตารางและ Slot — 20 กันยายน 2569

- **ผู้รับผิดชอบ:** ช้อป (สุพจน์)
- **คู่ตรวจ:** ปาย
- **เอกสารต้นทาง:** [แผนลดความซ้ำซ้อนและ Routing หัวข้อ 2.2](13_code_refactoring_and_routing_plan.md#22-โมดูลแผนก-แพทย์-วันลา-ตารางและ-slot)

### ขอบเขตและไฟล์ที่แก้

- ปรับ `src/app/(clinic)/schedules/page.tsx` ให้ใช้ `getCurrentUserAndRole()` และตัด role/session logic ซ้ำ
- เพิ่ม `src/app/(clinic)/departments/[departmentId]/page.tsx` และ `src/components/schedules/DepartmentDetailWorkspace.tsx` สำหรับ detail แผนก
- ปรับ `src/components/schedules/ScheduleWorkspace.tsx` และ `DepartmentWorkspace.tsx` ให้ใช้ constants กลางและเชื่อม detail route
- เพิ่ม `WEEKDAY_NAMES` ใน `src/constants/dateTime.ts` และใช้ `THAI_MONTHS_SHORT`, `CLINIC_TIME_BLOCKS`, `LEAVE_REASONS` จาก constants กลาง
- เพิ่ม `getCurrentUserAndRole()` ใน `src/lib/requireRole.ts`
- เพิ่ม/ปรับ tests ใน `tests/date-time-and-mock-anchor.test.ts`, `tests/department-detail-workspace.test.tsx`, `tests/require-role.test.ts` และ `tests/schedule-workspace-department-filter.test.tsx`

### พฤติกรรมที่เปลี่ยน

- `medical` และ `staff_admin` คลิกชิปวันลาในปฏิทิน day/week/month เพื่อเปิด Modal แก้ไขข้อมูลเดิมได้
- การแก้ไขส่งรายการเดิมด้วย `id`; แพทย์เดิมถูกล็อกไม่ให้ย้ายวันลาไปคนอื่น
- ปุ่ม `ยกเลิกวันลา` มี Confirmation และลบเฉพาะรายการวันลา; slot และนัดหมายเดิมไม่ถูกเปิด/ปิด/ยกเลิกอัตโนมัติ
- `patient` ยังคงไม่มี action จัดการวันลา
- ปฏิทิน day/week/month ไม่แสดงปุ่มเพิ่มรอบในวันเสาร์-อาทิตย์ และฟอร์มสร้างรอบตรวจปฏิเสธวันดังกล่าวก่อนเรียก repository

### Verification

- `npm.cmd run lint` — ผ่าน, 0 errors / 7 warnings เดิมนอก scope
- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- targeted ScheduleWorkspace tests — ผ่าน 25/25 รวม regression test การซ่อนปุ่มวันเสาร์-อาทิตย์และการกันวันหยุดในฟอร์ม
- `npm.cmd run build` — ผ่าน และพบ route `/departments/[departmentId]`
- full `npm.cmd run test` — ผ่าน 272/273 tests; failure เดิมที่ `tests/pharmacy-content-roles.test.tsx:380` เพราะพบปุ่มชื่อ `ปิดหน้าต่าง` ซ้ำ 2 ปุ่ม
- HTTP smoke `GET /schedules` — `200 OK`
- Browser 360px/1280px และ keyboard QA — ยังไม่ได้ตรวจ เพราะ environment ไม่มี browser runtime
- database integration/RLS — ยังไม่ได้ยืนยันบนฐาน development/staging; เอกสารนี้ไม่ถือเป็นหลักฐานการ deploy

### สถานะส่งต่องาน

- งาน 2.2 รอบแรกอยู่ใน commit `de846bf` และถูก push แล้ว
- interaction คลิกแก้ไข/ยกเลิกวันลา และเอกสารชุดนี้ยังเป็น working tree ที่ยังไม่ commit/push

## งาน 2.6 ส่วนงานไฟล์กลาง (Shared / Core) — 19 กันยายน 2569

- **ผู้รับผิดชอบ:** ประสานงานร่วมกันทุกโมดูล
- **ขอบเขต:** `src/constants/`, `src/components/common/`, `src/mocks/`
- **เอกสารต้นทาง:** [แผนลดความซ้ำซ้อนและ Routing หัวข้อ 2.6](13_code_refactoring_and_routing_plan.md#26-ส่วนงานไฟล์กลาง-shared--core)

### ขอบเขตและไฟล์ที่แก้

- เพิ่ม [`src/constants/dateTime.ts`](../src/constants/dateTime.ts)
  - `THAI_MONTHS`, `THAI_MONTHS_SHORT`, `THAI_WEEKDAYS`
  - `CLINIC_TIME_BLOCKS`, `LEAVE_REASONS`
  - `getBangkokDateKey()`, `shiftDate()` และ `getCurrentWeekMonday()`
- แก้ [`src/components/common/DatePicker.tsx`](../src/components/common/DatePicker.tsx) ให้ใช้ชื่อเดือนและวันจาก constants กลาง
- แก้ [`src/mocks/scheduleData.ts`](../src/mocks/scheduleData.ts) ให้ `MOCK_WEEK_START` อิงวันจันทร์ของสัปดาห์ปัจจุบัน
- แก้ [`src/mocks/clinicDatabase.ts`](../src/mocks/clinicDatabase.ts) ให้วันที่ของ mock appointment slots คำนวณจาก anchor เดียวกัน โดยคงความสัมพันธ์ของ slot history และ slot ในสัปดาห์ปัจจุบัน
- เพิ่ม [`tests/date-time-and-mock-anchor.test.ts`](../tests/date-time-and-mock-anchor.test.ts)
- ปรับ `tests/dashboard-notifications.test.ts`, `tests/mock-scheduling-repository.test.ts` และ `tests/scheduling-rules.test.ts` ให้ใช้วันที่ relative กับ dynamic anchor แทนวันที่ตายตัว

### พฤติกรรมที่เปลี่ยน

- ตาราง mock ไม่ผูกกับสัปดาห์ `2026-09-07` อีกต่อไป เมื่อเปิดระบบในสัปดาห์ใหม่จะยังมี slot ในสัปดาห์ปัจจุบัน
- การคำนวณวันใช้ date-only arithmetic และ Bangkok timezone boundary
- ไม่เปลี่ยนวันของยา รายการเตือน หรือข้อมูล fixture ที่ไม่ใช่ schedule เพื่อรักษา semantics เดิมนอกขอบเขต

### Verification

- `npm.cmd run lint` — ผ่าน, 0 errors / 7 warnings เดิมในไฟล์นอกขอบเขต
- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- `npm.cmd run build` — ผ่าน
- focused date/schedule/dashboard tests — ผ่าน 53/53
- full `npm.cmd run test` — ผ่าน 259/260 tests, 29/30 files
- คงเหลือ failure เดิมที่ `tests/pharmacy-content-roles.test.tsx:380` เพราะพบปุ่มชื่อ `ปิดหน้าต่าง` ซ้ำ 2 ปุ่ม
- HTTP smoke `GET /schedules` — `200 OK`
- Browser 360px/1280px และ keyboard QA — ยังไม่ได้ตรวจ เพราะ environment ไม่มี browser runtime

### สถานะส่งต่องาน

- sync `origin/develop` สำเร็จแบบ fast-forward ที่ commit `60e3217`
- ยังไม่ commit/push การเปลี่ยนแปลงชุดนี้

## งาน 2.2.1 ปรับ confirmation ของ schedule และ department — 20 กันยายน 2569

- **ผู้รับผิดชอบ:** ช้อป (สุพจน์)
- **คู่ตรวจ:** ปาย
- **Commit อ้างอิง:** `0a3aa2d`
- **เอกสารต้นทาง:** [แผนลดความซ้ำซ้อนและ Routing หัวข้อ 2.2](13_code_refactoring_and_routing_plan.md#22-โมดูลแผนก-แพทย์-วันลา-ตารางและ-slot)

### ขอบเขตและไฟล์ที่แก้

- เพิ่ม `src/components/common/ConfirmationModal.tsx`
- ปรับ `src/components/schedules/DepartmentWorkspace.tsx`
- ปรับ `src/components/schedules/ScheduleWorkspace.tsx`
- ปรับ `tests/department-workspace.test.tsx` และ `tests/schedule-workspace-department-filter.test.tsx`

### พฤติกรรมที่เปลี่ยน

- แทนที่ `window.confirm` ด้วย shared confirmation modal สำหรับเปิด/ปิดแผนก แพทย์ และ slot
- ยืนยันการยกเลิกวันลาผ่าน modal ก่อนเรียก repository
- คง permission, validation, state เดิมเมื่อบันทึกล้มเหลว และไม่เปลี่ยน slot/นัดหมายเดิมอัตโนมัติ

### Verification boundary

- เอกสาร owner views อ้าง code path และ test files ดังกล่าว แต่ยังไม่ได้รัน quality gates ใหม่จากงานเอกสารนี้
- Database integration/RLS และ browser 360px/1280px/keyboard ยังไม่ยืนยัน

## งานเอกสาร owner/status reconciliation — 20 กันยายน 2569

- **ขอบเขต:** ปรับเอกสาร canonical, owner views, historical notices และ text-backed diagrams ตาม code snapshot `0a3aa2d`
- **กำหนดส่งที่ใช้อ้างอิง:** 25 กันยายน 2569
- **สถานะ code โดยรวม:** ประมาณ 90% ตามข้อมูลเจ้าของโครงการ; ไม่ใช่หลักฐาน acceptance/deployment
- **หลักการ:** ไม่เพิ่ม API/type/schema, ไม่แก้ business code, ไม่ย้ายหรือลบเอกสารกลาง, ไม่เขียนทับ PDF/DOC/archive binary
- **Owner views:** [index](owners/README.md) และโฟลเดอร์ `feem`, `shop-supot`, `pai`, `kan`, `klong`, `herb`, `_shared`
- **Deployment boundary:** ข้อความ deploy เดิมเก็บเป็น historical record; สถานะ environment ปัจจุบัน, RLS และ browser QA ต้องมีหลักฐานแยก
- **Verification ของงานนี้:** ใช้ `git diff --check`, ตรวจลิงก์/ไฟล์ owner/โครงสร้าง diagram; ไม่อ้าง lint, typecheck, test หรือ build ใหม่จาก docs-only change

## รับหลักฐาน Supabase snapshot — 20 กันยายน 2569

- **หลักฐาน:** [docs/Database_check.md](Database_check.md)
- **พบ:** ตาราง `appointments`/`medical_records` และ health profile columns มีอยู่, RLS เปิดในตารางหลักที่ snapshot ตรวจ, RPC PAI/Broadcast มีอยู่
- **ประเด็นต้องแก้/ยืนยัน:** ไม่พบ `pai_appointments`, `pai_medical_records`; query orphan/status ของ PAI ล้มเหลว; policy บางรายการยังอ้าง legacy roles; migration `21`/`28` ใน repository ชี้ current PAI RPC ไปยัง `appointments`/`medical_records`; ไม่พบ `broadcast_recipients` ซึ่งสอดคล้องกับ migration `05` ที่ตั้งใจยุบ recipient ลง notifications และผู้ใช้ยืนยันให้ใช้ design นี้ต่อไป
- **สถานะ:** ผู้ใช้ยืนยันว่า snapshot เป็น target ปัจจุบันเดียวกับ runtime และ migration ที่เกี่ยวข้อง deploy แล้ว; ยังคงไม่เปลี่ยนเป็น `RLS ผ่าน` เพราะยังไม่มี session-based verification. Role เก่าจะคงไว้ชั่วคราวจน reset ฐานทดสอบ

## Owner confirmation: โมดูลรายการเตือน — 20 กันยายน 2569

- **ผู้รับผิดชอบ:** กลอง
- **คำยืนยัน:** CRUD, medication log และ status actions ของ reminder ครบตาม scope ที่ต้องการ
- **ขอบเขตที่ไม่เปลี่ยน:** worker, email และ automation ไม่อยู่ใน scope; ไม่อ้างว่า DB/RLS หรือ browser QA ผ่านจากคำยืนยันนี้
- **เอกสารอ้างอิง:** [Klong owner view](owners/klong/README.md)

## ปรับ dark theme tokens และ settings persistence — 21 กันยายน 2569

### ขอบเขตและไฟล์ที่แก้

- ปรับ `src/app/globals.css` ให้ dark theme ใช้พื้นหลัง/foreground/surface/border ที่มืดและอ่านได้
- remap `slate-*`, `zinc-*`, `gray-*` และ legacy brand aliases ใต้ `data-theme="dark"`
- เพิ่ม dark override สำหรับ `bg-white`, white opacity surfaces, form controls และ hard-coded record surface ที่ตรวจพบ
- ปรับ status tokens แยกจาก neutral เพื่อคงความหมายของ critical, warning, success, info และ neutral
- เพิ่ม regression coverage ใน `tests/settings.test.tsx` สำหรับ light/dark/system และ remount persistence
- อัปเดต `docs/12_visual_design_system.md`

### Verification

- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- `npm.cmd run lint` — ผ่าน
- `npm.cmd run test` — ผ่าน 41 files / 351 tests
- `npx.cmd --no-install vitest run tests/settings.test.tsx` — ผ่าน 2/2
- `npm.cmd run build` — ผ่าน
- Browser QA ที่ 360px/1280px และการตรวจ refresh/system preference ใน browser จริง — ยังไม่ยืนยัน เพราะ environment ไม่มี browser session (`browsers: []`, IAB unavailable)

### Follow-up: คง palette ของ header/footer

- เพิ่ม selector-level token reset ให้ `header` และ `footer` ใช้ shell palette เดิม แม้ `html[data-theme="dark"]` จะเปิดอยู่
- ไม่เปลี่ยน dark surfaces, form controls, neutral utilities หรือ status tokens ของเนื้อหาส่วนอื่น

### Follow-up: เก็บ landing dark surfaces

- เปลี่ยน steps image scrims จาก hard-coded white เป็น `brand-surface` ที่ปรับตาม theme
- เปลี่ยนปุ่มรองจาก `hover:bg-white` เป็น `hover:bg-brand-soft`
- เพิ่ม dark contact-band override เฉพาะ `.landing-contact` และ regression assertions ใน `tests/home.test.tsx`

### Follow-up: เก็บ auth และ profile backdrop

- เปลี่ยน auth layout gradient จาก `to-white` เป็น `to-brand-surface`
- เปลี่ยน profile drawer backdrop จาก `bg-slate-950/55 backdrop-blur-[1px]` เป็น `bg-black/55 backdrop-blur-sm` เพื่อให้ dark mode ไม่ได้ overlay สีอ่อนและเห็น blur ชัดขึ้น
- เพิ่ม regression assertion ใน `tests/header.test.tsx`
- Verification ล่าสุด: login/register/header 30/30, landing 7/7, `tsc`, lint และ build ผ่าน; full suite 350/351 โดย failure เดิมอยู่ที่ `tests/dashboard-service.test.ts` และไม่เกี่ยวกับงาน auth/profile นี้

## ขยายพื้นที่หน้าผลตรวจ รายการยา และนัดหมาย — 22 กันยายน 2569

### ขอบเขตและไฟล์ที่แก้

- เพิ่ม prop `wide` แบบ opt-in ใน `src/features/clinic-care.tsx` ให้ records และ appointments ใช้พื้นที่เต็ม viewport พร้อม gutter responsive เช่นเดียวกับหน้าคลังยา
- คง workspace อื่นไว้กับ layout เดิมเพื่อจำกัดผลกระทบของการเปลี่ยนแปลง
- เพิ่ม regression assertions ใน `tests/appointments-records-runtime-ui.test.tsx` ตรวจกรอบ `w-screen` ของ records และ appointments

### Verification

- `npx.cmd vitest run tests/appointments-records-runtime-ui.test.tsx tests/pharmacy-access.test.tsx` — ผ่าน 2 files / 30 tests
- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- `npm.cmd run lint` — ผ่าน 0 errors, 6 warnings เดิม
- `npm.cmd run build` — ผ่าน
- `npm.cmd run test` — 40/41 files และ 351/352 tests ผ่าน; failure เดิมอยู่ที่ `tests/dashboard-service.test.ts` metric ของ fixture วันที่ ไม่เกี่ยวกับ records/appointments layout
- Browser QA ที่ 360px/1280px — ยังไม่ยืนยัน เพราะ environment ไม่มี browser session (`browsers: []`, IAB unavailable)

## ลดข้อความเหนือหัวข้อใหญ่หน้าคลังยา — 22 กันยายน 2569

- ลบ label `WU CLINIC / PHARMACY`, badge สิทธิ์ และชื่อ/อีเมลผู้ใช้ที่อยู่เหนือหัวข้อ `คลังยาและเวชภัณฑ์`
- คงหัวข้อหลัก คำอธิบาย และข้อความโหมดดูอย่างเดียวที่อยู่ในเนื้อหาด้านล่าง
- `npx.cmd vitest run tests/pharmacy-content-roles.test.tsx tests/pharmacy-access.test.tsx` — ผ่าน 2 files / 25 tests
- `npx.cmd --no-install tsc --noEmit` — ผ่าน

## แก้พื้นหลังปุ่ม action ใน dark mode — 22 กันยายน 2569

### ขอบเขตและไฟล์ที่แก้

- เปลี่ยนปุ่มเพิ่ม/ลด/แก้ไข/ลบใน `src/features/medical-records.tsx`, `src/components/pharmacy/PharmacyContent.tsx` และ `src/components/pharmacy/MedicationDetailContent.tsx` ให้ใช้ `brand-*` และ `status-*`
- แก้พื้นหลัง hover, modal backdrop, ปุ่มปิด/ยกเลิก และปุ่มสถานะพักใช้งาน/ลบถาวรที่ยังใช้สี light hard-coded
- ปรับ `secondaryButtonClass` ใน `src/features/clinic-care.tsx` ให้ใช้พื้นและข้อความที่อ่านได้ใน dark mode
- เพิ่ม assertions ใน `tests/appointments-records-runtime-ui.test.tsx`, `tests/pharmacy-content-roles.test.tsx` และ `tests/medication-detail.test.tsx`

### Verification

- `npx.cmd vitest run tests/appointments-records-runtime-ui.test.tsx tests/pharmacy-content-roles.test.tsx tests/pharmacy-access.test.tsx tests/medication-detail.test.tsx` — ผ่าน 4 files / 56 tests
- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- `npm.cmd run lint` — ผ่าน 0 errors, 6 warnings เดิม
- `npm.cmd run build` — ผ่าน
- Browser visual QA — ยังไม่ยืนยัน เพราะ environment ไม่มี browser session (`browsers: []`, IAB unavailable)

## แก้ JSX conditional ในฟอร์มลงทะเบียนบุคลากร — 23 กันยายน 2569

### ขอบเขตและไฟล์ที่แก้

- ปรับ `src/components/staff/PersonnelRegistrationForm.tsx` ให้ conditional ระหว่างฟอร์มผู้ป่วยกับฟอร์มบุคลากรใช้วงเล็บ JSX ชัดเจน และปิด `<form>` แยกจาก ternary expression
- คง behavior, route, validation, data contract และ visual UI เดิม; แก้เฉพาะโครงสร้าง syntax เพื่อป้องกัน Turbopack parse error ที่ `</section>`

### Verification

- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- `npx.cmd --no-install eslint 'src/components/staff/PersonnelRegistrationForm.tsx'` — ผ่าน
- `npm.cmd run build` — ผ่านด้วย Next.js 16.3.0/Turbopack
- `npm.cmd run lint` — ไม่ผ่านจาก 3 errors เดิมใน `src/app/(patient)/reminders/page.tsx` และ `src/components/dashboard/DashboardScreen.tsx`; changed file ไม่พบ lint error และมี warnings เดิม 10 รายการในไฟล์อื่น
- Automated tests และ browser QA — ไม่รัน; งานนี้เป็น syntax-only และไม่เปลี่ยน behavior

# ปรับปลายทางโลโก้ Header ตาม role — 23 กันยายน 2569

### ขอบเขตและพฤติกรรม

- เมื่อเข้าสู่ระบบแล้ว การกดโลโก้ WU Clinic ใน Header ไปยัง dashboard ของ role ปัจจุบัน (`patient`, `medical`, `staff_admin`) จากทุกหน้า
- ผู้ใช้ที่ยังไม่เข้าสู่ระบบยังกดโลโก้กลับหน้าแรก `/`

### ไฟล์หลัก

- `src/components/layout/Header.tsx`
- `tests/header.test.tsx`

### Verification

- `npx.cmd --no-install vitest run tests/header.test.tsx` — ผ่าน 1 file / 15 tests
- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- `git diff --check` — ผ่าน
- Browser QA — ไม่ได้ตรวจในรอบนี้

# เปิดตารางแพทย์ให้ guest ดูแบบ read-only — 23 กันยายน 2569

### ขอบเขตและพฤติกรรม

- ผู้ใช้ที่ยังไม่เข้าสู่ระบบดูรายชื่อแพทย์ที่เปิดใช้งาน บริการ และรอบตรวจที่เปิดให้บริการได้
- รอบว่างแสดงทางเข้าสู่ระบบเพื่อจองและพากลับไปยัง slot ที่เลือก; guest ไม่มีลิงก์สร้างนัดหมาย
- คง guard ของการสร้างนัดหมายและคำสั่งเขียนไว้เหมือนเดิม; account options และเหตุผลวันลายังไม่เปิดเผยแก่ guest
- ใช้ public-read RLS policies เดิม; ไม่มี migration ใหม่ และยังไม่ได้ตรวจ RLS บนฐานจริง

### ไฟล์หลัก

- `src/app/(clinic)/schedules/page.tsx`
- `src/app/api/doctors/route.ts`
- `src/app/api/schedules/offerings/route.ts`
- `src/app/api/schedules/slots/route.ts`
- `src/components/schedules/ScheduleWorkspace.tsx`
- `src/features/scheduling/data/apiRepository.ts`
- `tests/api-route-handlers.test.ts`
- `tests/schedule-workspace-department-filter.test.tsx`

### Verification

- `npx.cmd --no-install vitest run tests/api-route-handlers.test.ts tests/schedule-workspace-department-filter.test.tsx tests/header.test.tsx` — ผ่าน 3 files / 56 tests
- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- targeted ESLint สำหรับไฟล์ที่เปลี่ยน — ผ่าน
- `git diff --check` — ผ่าน
- Browser QA และ live DB/RLS — ไม่ได้ตรวจในรอบนี้

# แก้การ map บริการบน Landing — 23 กันยายน 2569

### ขอบเขตและพฤติกรรม

- `fetchLandingServices` อ่าน `is_active` จาก `/api/services` แล้ว map เป็น `isActive` ให้ตรงกับ UI; บริการที่เปิดใช้งานจึงผ่านตัวกรองบนหน้า Landing
- แปลง `description: null` จาก API เป็น `''` เพราะ `ScheduleService.description` ต้องเป็น string; แก้ TypeScript error ที่พบใน Vercel build

### ไฟล์หลัก

- `src/services/landingService.ts`

### Verification

- `git diff --check` — ตรวจหลังแก้ไข
- `npx.cmd --no-install tsc --noEmit` — ผ่านหลังแก้ nullable description
- Automated tests และ browser QA — ไม่ได้รัน

# แยก component ตารางตรวจ — 23 กันยายน 2569

### ขอบเขตและพฤติกรรม

- แยก UI ของ dialog จัดการรอบเดี่ยว, รอบหลายวัน, วันลา และบริการ ออกจาก `ScheduleWorkspace`
- แยก header actions, ตัวกรอง/ตัวควบคุมปฏิทิน และ renderer ปฏิทินวัน/สัปดาห์/เดือนเป็น component เฉพาะ
- คง state orchestration, callbacks, validation, role checks และ data access ไว้ใน flow เดิม; ไม่เปลี่ยน UI behavior หรือ permission
- `ScheduleWorkspace.tsx` ลดจาก 2,142 เป็น 983 บรรทัด

### ไฟล์หลัก

- `src/components/schedules/ScheduleWorkspace.tsx`
- `src/components/schedules/BatchScheduleDialog.tsx`
- `src/components/schedules/DoctorLeaveDialog.tsx`
- `src/components/schedules/SlotEditorDialog.tsx`
- `src/components/schedules/ServiceDialog.tsx`
- `src/components/schedules/ScheduleWorkspaceToolbar.tsx`
- `src/components/schedules/ScheduleCalendar.tsx`

### Verification

- `npx.cmd --no-install tsc --noEmit` — ผ่าน
- targeted ESLint ทั้ง 7 ไฟล์ — ผ่าน ไม่มี warnings
- `npm.cmd run build` — ผ่านด้วย Next.js 16.3.0/Turbopack
- Automated tests และ browser QA — ไม่ได้รัน
