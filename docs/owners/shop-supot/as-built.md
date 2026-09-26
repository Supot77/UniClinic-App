# ช้อป (สุพจน์) — As-built Trace

| Requirement | Route/component | Function/service/repository | Test/migration evidence | สถานะ |
| --- | --- | --- | --- | --- |
| ตารางตาม role และ filter | `/schedules`, `ScheduleWorkspace` | `SchedulesPage`, `SchedulingProvider`, `useScheduling`, role/doctor filter logic | `tests/schedule-workspace-department-filter.test.tsx`, `tests/require-role.test.ts` | ทำแล้วใน code |
| department/doctor/service management | `/departments`, `DepartmentWorkspace` มีแท็บบริการ เพิ่ม/แก้ไข code, ชื่อ, คำอธิบาย และเปิด/ปิดสถานะ; ฟอร์มเพิ่ม/แก้เปิดเป็น modal portal ลอยกลางจอ รองรับ light/dark; ความเชี่ยวชาญแพทย์เป็น combobox จากค่าที่ใช้อยู่และเพิ่มค่าใหม่ได้ | `saveDepartment`, `toggleDepartment`, `saveDoctor`, `toggleDoctor`, `saveService`, `toggleService` ผ่าน `SchedulingRepository`; แก้บริการส่ง ID เดิม; specialty ยังคงบันทึกเป็นข้อความเดิม | `tests/database-scheduling-repository.test.ts`, migrations `13`, `17`, `/api/services` | ทำแล้วใน code; UI flow รอบนี้ยังไม่ได้รันทดสอบ component, DB/RLS ยังไม่ยืนยัน |
| department detail route | `/departments/[departmentId]`, `DepartmentDetailWorkspace` | `DepartmentDetailPage`, detail workspace และ repository snapshot | `tests/department-detail-workspace.test.tsx` | ทำแล้วใน code |
| slot validation และ batch preview | schedule forms | `validateSlot`, `validateSlotPermission`, `buildSlotBatchPlan`, `getEarliestCreatableClinicStartTime`, `deriveSlotStatus`, `countAffectedSlots` | `src/features/scheduling/domain/rules.ts`, `tests/scheduling-rules.test.ts`, `tests/api-route-handlers.test.ts`, migration `24_batch_create_slots.sql` | ทำแล้วใน code; same-day creation is limited by Bangkok current time; RLS ยังไม่ยืนยัน |
| manual doctor leave | calendar leave chips/modal | `validateDoctorLeave`, `validateDoctorLeavePermission`, `saveDoctorLeave`, `deleteDoctorLeave` | `tests/doctor-leaves.test.ts`, migration `23_doctor_leaves.sql` | ทำแล้วใน code; DB/RLS ยังไม่ยืนยัน |
| confirmation สำหรับปิด/เปิดและยกเลิก | `ConfirmationModal`, `ScheduleWorkspace`, `DepartmentWorkspace` | `toggleClosed`, `toggleDepartment`, `toggleDoctor`, `cancelDoctorLeave` แยก request กับ confirm action | `tests/department-workspace.test.tsx`, `tests/schedule-workspace-department-filter.test.tsx`, commit `0a3aa2d` | ทำแล้วใน code |
| database-only runtime | `SchedulingProvider`, `ApiSchedulingRepository` | อ่าน/เขียนผ่าน Route Handlers; ปุ่มสร้างหลาย slot ใช้ manual batch API; ไม่มี weekly/recurring/template path หรือ mock fallback | `src/features/scheduling/data/apiRepository.ts`, Route Handlers, `src/features/scheduling/context/SchedulingProvider.tsx`; mock adapter ใช้โดย tests | Runtime ไม่มี mock; DB/RLS ยังไม่ยืนยัน |

## กติกาที่ต้องคงไว้

วันทำการ จ.–ศ. 08:30–16:30, ไม่ทับพักเที่ยง, ไม่สร้างย้อนหลังหรือก่อนเวลาปัจจุบันของวันเดียวกันตาม `Asia/Bangkok`, ไม่ทับ slot เดิม และไม่เปลี่ยน slot/นัดเดิมอัตโนมัติเมื่อบันทึกหรือยกเลิกวันลา
