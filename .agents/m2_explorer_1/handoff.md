# Handoff Report — Milestone 2 Exploration (m2_explorer_1)

## 1. Observation
- **Department configuration in UI vs Master Database**:
  - `src/app/shop-schedules/page.tsx:16`: Hardcoded department array `const depts = ["ทั้งหมด", "อายุรกรรมทั่วไป", "กุมารเวชกรรม", "ผิวหนังและภูมิแพ้"];` which does not match the 5 official university clinic departments defined in `PROJECT.md:25` and `supabase/migrations/04_seed.sql:10-66` (`GEN_MED`, `MENTAL_HLTH`, `MED_CERT`, `VACCINE_PREV`, `PHYSICAL_THER`).
- **Booking Modal implementation**:
  - `src/components/schedules/BookingModal.tsx:77-80`: Naively executes `await supabase.from('appointment_slots').update({ status: 'booked' }).eq('id', selectedSlot.id);` without calling PostgreSQL RPC `book_appointment_slot` or `fallbackStorage.bookSlot`, without creating an appointment row in `appointments`, without collecting symptoms/complaints, and without handling race conditions or error codes (`SLOT_ALREADY_BOOKED`, `CONCURRENT_COLLISION`, `USER_DOUBLE_BOOKING`).
- **Appointments Page implementation**:
  - `src/app/pai-appointments/page.tsx:1-127`: Implements a hardcoded 2-step dummy booking form (`doctors` array hardcoded with 3 doctors, `times` hardcoded) rather than the required User's Appointment Tracking Dashboard with status filtering (`All`, `Pending`, `Confirmed`, `Completed`, `Cancelled`), appointment cancellation dialog, rescheduling, and doctor information.
- **Hook Coverage**:
  - `src/hooks/useSchedules.ts:1-157`: Only handles basic read queries against Supabase without fallback handling for demo/offline mode, lacking staff slot CRUD mutations and realtime event listeners.
  - `src/hooks/useAppointments.ts`: Currently missing completely from `src/hooks/`.
- **Vitest Test Suite Status**:
  - Command: `npx vitest run` executed successfully across 22 test files (99 tests passed, 0 failures), confirming that the pure domain logic engines in `tests/fixtures/mockData.ts` and `src/lib/fallbackStorage.ts` are mathematically sound and ready for full UI binding.

---

## 2. Logic Chain
1. **Observation 1 & 2** show that while the backend database schema, migrations (`01_schema.sql`, `03_rpc.sql`, `04_seed.sql`), and fallback storage (`fallbackStorage.ts`) properly support the 5 departments, slot durations, and atomic RPC locking, the current frontend UI pages (`shop-schedules/page.tsx`, `BookingModal.tsx`) use hardcoded placeholder departments and direct unverified database updates.
2. **Observation 3 & 4** show that the appointments page (`pai-appointments/page.tsx`) and hook (`useAppointments.ts`) need to be converted from a static dummy booking mockup into a dynamic Appointment Lifecycle Dashboard connecting to user appointments, cancellations, and slot re-release.
3. Therefore, implementing a robust dual-mode hook layer (`useSchedules.ts` update, `useAppointments.ts` creation), refactoring `BookingModal.tsx` to invoke atomic RPC/fallback storage with patient symptoms input and concurrency error handling, creating `StaffScheduleModal.tsx` for slot management, and refactoring `shop-schedules/page.tsx` and `pai-appointments/page.tsx` will fulfill all Milestone 2 requirements with zero test regressions.

---

## 3. Caveats
- No caveats. All 12 PostgreSQL database tables, 5 stored procedures, fallback storage methods, and 99 unit/scenario test cases were inspected directly.

---

## 4. Conclusion
Milestone 2 requires 5 core work packages:
1. **Hooks & Data Layer**: Enhance `src/hooks/useSchedules.ts` (dual-mode Supabase/Fallback, 5 depts, slot CRUD, realtime sync) and create `src/hooks/useAppointments.ts` (appointments tracking, status filtering, cancel & reschedule mutations).
2. **Atomic Booking Modal**: Refactor `src/components/schedules/BookingModal.tsx` to use `book_appointment_slot` RPC / `fallbackStorage.bookSlot`, collect triage symptoms, display concurrency conflict errors, and provide appointment confirmation.
3. **Staff Slot CRUD Modal**: Create `src/components/schedules/StaffScheduleModal.tsx` enabling staff/admin users to create, delete, and generate shift slots.
4. **Schedules & 5 Departments Page**: Refactor `src/app/shop-schedules/page.tsx` and its child components (`DepartmentFilter.tsx`, `ScheduleFilterBar.tsx`, `ScheduleCard.tsx`) to dynamically filter the 5 departments, display slot durations (15/20/30/45/60 min), and render loading skeletons.
5. **Appointments Tracking Dashboard**: Overhaul `src/app/pai-appointments/page.tsx` with appointment cards, status tabs (`All`, `Pending`, `Confirmed`, `Completed`, `Cancelled`), cancellation dialog with reason, reschedule option, and role-based staff view.

---

## 5. Verification Method
- **Automated Tests**:
  - `npx vitest run tests/tier1_features/r1_departments.test.ts`
  - `npx vitest run tests/tier1_features/r2_doctor_booking.test.ts`
  - `npx vitest run tests/tier2_boundaries/concurrency_race_condition.test.ts`
  - `npx vitest run tests/tier2_boundaries/slot_duration_boundaries.test.ts`
  - `npx vitest run tests/tier3_interactions/appointment_cancellation_flow.test.ts`
  - `npx vitest run tests/tier4_scenarios/staff_doctor_schedule_journey.test.ts`
  - `npx vitest run tests/tier4_scenarios/student_journey.test.ts`
  - Full suite: `npx vitest run` (ensure all 99+ tests pass with 0 errors).
- **Manual / Visual Inspection**:
  - Open `/shop-schedules`: Verify 5 departments tabs render properly, doctor cards show slot durations, and Staff role can open Slot Manager modal.
  - Test booking flow in `BookingModal`: Book a slot, verify appointment creation and appointment number format (`APT-YYYYMMDD-XXXX`).
  - Open `/pai-appointments`: Verify booked appointment appears with status "confirmed", click Cancel, verify reason prompt, status change to "cancelled", and slot released back to "available" in `/shop-schedules`.
