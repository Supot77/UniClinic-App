# ช้อป (สุพจน์) — As-built Trace

| Requirement | Route/component | Function/service/repository | Test/migration evidence | สถานะ |
| --- | --- | --- | --- | --- |
| ตารางตาม role และ filter | `/schedules`, `ScheduleWorkspace` | `SchedulesPage`, `ShopProvider`, `useShop`, role/doctor filter logic | `tests/schedule-workspace-department-filter.test.tsx`, `tests/require-role.test.ts` | ทำแล้วใน code |
| department/doctor/service management | `/departments`, `DepartmentWorkspace` | `saveDepartment`, `toggleDepartment`, `saveDoctor`, `toggleDoctor`, `saveService`, `toggleService` ผ่าน `ShopRepository` | `tests/department-workspace.test.tsx`, `tests/database-shop-repository.test.ts`, migrations `13`, `17` | ทำแล้วใน code; DB/RLS ยังไม่ยืนยัน |
| department detail route | `/departments/[departmentId]`, `DepartmentDetailWorkspace` | `DepartmentDetailPage`, detail workspace และ repository snapshot | `tests/department-detail-workspace.test.tsx` | ทำแล้วใน code |
| slot validation และ batch preview | schedule forms | `validateSlot`, `validateSlotPermission`, `buildSlotBatchPlan`, `deriveSlotStatus`, `countAffectedSlots` | `src/features/shop/domain/rules.ts`, `tests/shop-rules.test.ts`, migration `24_batch_create_slots.sql` | ทำแล้วใน code; RLS ยังไม่ยืนยัน |
| manual doctor leave | calendar leave chips/modal | `validateDoctorLeave`, `validateDoctorLeavePermission`, `saveDoctorLeave`, `deleteDoctorLeave` | `tests/doctor-leaves.test.ts`, migration `23_doctor_leaves.sql` | ทำแล้วใน code; DB/RLS ยังไม่ยืนยัน |
| confirmation สำหรับปิด/เปิดและยกเลิก | `ConfirmationModal`, `ScheduleWorkspace`, `DepartmentWorkspace` | `toggleClosed`, `toggleDepartment`, `toggleDoctor`, `cancelDoctorLeave` แยก request กับ confirm action | `tests/department-workspace.test.tsx`, `tests/schedule-workspace-department-filter.test.tsx`, commit `0a3aa2d` | ทำแล้วใน code |
| database-first runtime | `ShopProvider`, `DatabaseShopRepository`, `MockShopRepository` | `DatabaseShopRepository` ใช้เมื่อ Supabase client มี; `createShopRepository()` คืน mock สำหรับ fallback/offline | `src/features/shop/data/repositoryFactory.ts`, `databaseRepository.ts`, `mockRepository.ts` | ทำบางส่วน/ยังมี mock; DB/RLS ยังไม่ยืนยัน |

## กติกาที่ต้องคงไว้

วันทำการ จ.–ศ. 08:30–16:30, ไม่ทับพักเที่ยง, ไม่สร้างย้อนหลัง, ไม่ทับ slot เดิม และไม่เปลี่ยน slot/นัดเดิมอัตโนมัติเมื่อบันทึกหรือยกเลิกวันลา
