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
