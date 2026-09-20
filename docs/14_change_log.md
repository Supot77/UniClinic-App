# 14. บันทึกการเปลี่ยนแปลง

เอกสารนี้ใช้บันทึกส่วนที่แก้ไขหลังงานโค้ดสำเร็จ เพื่อให้ trace จากงานที่ส่งมอบไปยังไฟล์และหลักฐานตรวจจริงได้ชัดเจน

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
- ปรับ `tests/dashboard-notifications.test.ts`, `tests/mock-shop-repository.test.ts` และ `tests/shop-rules.test.ts` ให้ใช้วันที่ relative กับ dynamic anchor แทนวันที่ตายตัว

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
