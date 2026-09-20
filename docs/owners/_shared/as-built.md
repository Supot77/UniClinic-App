# Shared / Core — As-built Trace

| Requirement | Route/component | Function/service/repository/RPC/migration | Test/evidence | สถานะ |
| --- | --- | --- | --- | --- |
| ใช้ role canonical 3 ค่า | shared auth/route guards | `src/types/database.ts`, `src/lib/requireRole.ts`: `canonicalRole`, `getCurrentUserAndRole`, `requireRole` | `tests/require-role.test.ts`, `supabase/migrations/06_consolidate_roles.sql`, `07_consolidate_user_roles.sql` | ทำแล้วใน code; DB/RLS ยังไม่ยืนยัน |
| ใช้ Supabase client ตาม execution context | auth/session layouts and middleware | `src/utils/supabase/client.ts`, `src/utils/supabase/server.ts`, `src/utils/supabase/middleware.ts`, `src/lib/supabaseClient.ts` | auth/session code และ route guards | ทำแล้วใน code; deployment ยังไม่ยืนยัน |
| แยก shared date/time logic | schedule, department และ appointment UI | `src/constants/dateTime.ts`: `THAI_MONTHS`, `THAI_MONTHS_SHORT`, `THAI_WEEKDAYS`, `CLINIC_TIME_BLOCKS`, `LEAVE_REASONS`, date helpers | `tests/date-time-and-mock-anchor.test.ts` | ทำแล้วใน code |
| ใช้ shared confirmation feedback | schedule/department workspace | `src/components/common/ConfirmationModal.tsx`, `Toast.tsx`, `DatePicker.tsx` | `tests/toast.test.tsx`, `tests/department-workspace.test.tsx`, `tests/schedule-workspace-department-filter.test.tsx` | ทำแล้วใน code |
| mock deterministic สำหรับ test/offline | test setup and repository adapters | `src/mocks/`, `src/features/mock-database/`, `src/features/shop/data/mockRepository.ts` | `tests/setup.ts`, mock repository tests | ทำแล้วใน code; ไม่ใช่หลักฐาน production runtime |
| migration/RLS เป็น contract ร่วม | shared database boundary | `supabase/migrations/`, `src/types/database.ts` | `tests/supabase-setup.test.ts`, migration tests เฉพาะบางส่วน | ยังไม่ยืนยัน DB/RLS |

## ข้อจำกัด

งานนี้อ้างเฉพาะไฟล์ใน repository ไม่ตรวจฐาน Supabase จริง ไม่อ่าน secret และไม่สรุปผล deployment จาก migration ที่มีอยู่
