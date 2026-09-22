# ปาย — As-built Trace

| Requirement | Route/component | Function/service/RPC | Test/migration evidence | สถานะ |
| --- | --- | --- | --- | --- |
| ผู้ป่วยจอง slot และดูนัดของตน | `/appointments`, `PatientAppointmentWorkspace` | `AppointmentPage`, `ClinicRepository.book`, `pai_book_appointment` → `appointments` ตาม migration `21` | `tests/appointments-records-runtime.test.ts`, `tests/appointments-records-runtime-ui.test.tsx`, `docs/Database_check.md` parts 1, 2, 7 | ทำแล้วใน code; snapshot พบตารางเป้าหมาย แต่ DB/RLS/deployment ยังไม่ยืนยัน และไม่พบ initial `pai_appointments` |
| staff/medical จัดการสถานะนัดตาม role | appointment workspace | `allowedActions`, `ClinicRepository.transition`, `pai_transition_appointment` → `appointments` ตาม migration `21`, `31` | `src/features/clinic-care.tsx`, `tests/appointments-records-runtime.test.ts`, `tests/appointments-records-runtime-ui.test.tsx`, `docs/Database_check.md` part 7 | ทำแล้วใน code; `medical` อนุมัติ/ปฏิเสธได้เฉพาะนัดใน slot ของตน; DB/RLS deployment ยังต้องตรวจ |
| บันทึกผลตรวจและ prescription | `/records`, `MedicalRecordsPage` | `recordInputSchema`, `createClinicDatabaseRepository.saveRecord`, `pai_save_record` → `medical_records` ตาม migration `28` | `tests/medical-record-vitals-migration.test.ts`, runtime tests, migration `28_medical_record_vitals.sql`, `docs/Database_check.md` parts 1, 2, 7 | ทำแล้วใน code; snapshot พบตารางเป้าหมาย แต่ DB/RLS/deployment ยังไม่ยืนยัน และไม่พบ initial `pai_medical_records` |
| แยกข้อมูลตาม patient/doctor/staff | `ClinicRepository.load`, `useClinicWorkspace` | `actor`, `snapshotSchema`, PAI workspace RPC และ RLS | migrations `13_pai_manual_appointments_records.sql`, `14–16`, `21–22`, `docs/Database_check.md` parts 5–7 | ทำแล้วใน code; RLS integration ยังไม่ยืนยัน และ schema/RPC target ไม่ตรงกัน |
| ย้าย/เลื่อนนัดอัตโนมัติ | appointment route | ไม่พบ `reschedule` flow ใน active route | User Stories และ D22/D24 | นอก scope |
| deterministic test adapter | `createClinicMockRepository` | mock state isolation, booking, transition, save record | `tests/clinic-care-date-picker.test.tsx`, runtime tests | ทำแล้วใน code; ใช้เฉพาะ test/offline |

## กติกาสำคัญ

การจบตรวจต้องมีผลตรวจ, patient อ่านเฉพาะข้อมูลตนเอง, medical ทำงานกับนัดของตน และคำสั่งที่ไม่ผ่านต้องคง state เดิม
