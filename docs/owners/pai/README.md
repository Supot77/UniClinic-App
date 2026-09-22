# ปาย — นัดหมาย คิว ผลตรวจ และเวชระเบียน

## เจ้าของ

- เจ้าของ: ปาย
- คู่ตรวจ: ช้อป (สุพจน์)
- ขอบเขต: appointment booking, queue/status transition, medical record และ prescription input

## Code boundary

- `src/app/(clinic)/appointments/`, `src/app/(clinic)/records/`
- `src/features/appointments.tsx`
- `src/features/medical-records.tsx`
- `src/features/clinic-care.tsx`
- PAI RPC/migrations และ `tests/appointments-records-*`

## Dependency และ handoff

รับ slot contract จาก scheduling และส่ง `appointmentId`, `patientId`, `doctorId`, สถานะตรวจ และ prescription ไปยัง pharmacy

## เอกสารอ้างอิง

- [User Stories](../../02_user_stories.md)
- [Database and ER](../../03_database_design_and_er.md)
- [Acceptance Criteria](../../08_system_rules_and_acceptance.md)
- [Implementation Plan](../../09_implementation_plan.md)
