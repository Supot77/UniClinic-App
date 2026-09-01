# Milestone 2 Adversarial Challenge Report

**Target Milestone**: Milestone 2 — Doctor Schedules & Appointment Booking Engine  
**Review Archetype**: EMPIRICAL CHALLENGER (`m2_challenger_1`)  
**Verdict**: **APPROVE**  
**Timestamp**: 2026-08-28T11:15:00+07:00  

---

## 1. Challenge Summary

| Area | Stress Vectors Tested | Status | Empirical Test Case |
|---|---|---|---|
| **Race Condition & Concurrency** | 20 parallel swarm bookings on same slot; Double-booking by same user | **PASSED** | `ADV-M2-RACE-01`, `ADV-M2-RACE-02`, `ADV-M2-RACE-03` |
| **Cancellation & Slot Release** | Slot availability restoration; Booked count decrement; Version increment; Immediate rebooking | **PASSED** | `ADV-M2-CANCEL-01`, `ADV-M2-CANCEL-02`, `ADV-M2-CANCEL-03` |
| **5 Department & Duration Filter** | 5 departments verification; 15, 20, 30, 45, 60m chips; Doctor filtering | **PASSED** | `ADV-M2-DEPT-01`, `ADV-M2-DEPT-02`, `ADV-M2-DEPT-03` |
| **Lifecycle State Machine** | Pending -> Confirmed -> Completed; Pending/Confirmed -> Cancelled; Staff/Doctor UI actions | **PASSED** | `ADV-M2-LIFE-01`, `ADV-M2-LIFE-02`, `ADV-M2-LIFE-03` |
| **Automated Test Suite** | Full suite execution | **PASSED** | 111/111 passing across 23 test suites |

---

## 2. Adversarial Test Dimensions & Results

### Dimension 1: Atomic Booking & Concurrency Resilience
- **Vector**: 20 simultaneous parallel calls to `bookingService.bookAppointment()` on an identical available slot.
  - **Empirical Result**: Exactly 1 request succeeded (200 OK / success: true) and 19 requests failed gracefully with conflict codes (`SLOT_ALREADY_BOOKED` / `CONCURRENT_COLLISION`).
  - **Slot Integrity**: `current_booked` remained bounded at 1 (never exceeding `max_capacity`), and slot status correctly transitioned to `booked`.
- **Vector**: Single student attempting to book two different slots at the same date and time.
  - **Empirical Result**: Second booking was rejected with `error_code: 'USER_DOUBLE_BOOKING'` and descriptive Thai error message.

### Dimension 2: Cancellation & Immediate Slot Recovery
- **Vector**: User books a slot, then cancels with reason.
  - **Empirical Result**: Appointment marked `cancelled`, `cancellation_reason` preserved, slot status restored to `available`, `current_booked` decremented to 0, and slot `version` incremented.
- **Vector**: Double-cancellation attack (attempting to cancel an already cancelled appointment).
  - **Empirical Result**: Handled idempotently with error message `"การนัดหมายนี้ถูกยกเลิกไปแล้ว"`.
- **Vector**: Secondary user re-booking a slot immediately following primary user cancellation.
  - **Empirical Result**: Secondary user successfully acquired the newly released slot without state collision.

### Dimension 3: Department Filtering & Slot Duration Chips
- **Vector**: Verified master data configuration for all 5 university clinic departments:
  1. `GEN_MED` — บริการตรวจรักษาโรคทั่วไปและทำแผล (15 mins default)
  2. `MENTAL_HLTH` — บริการให้คำปรึกษาสุขภาพจิตและความเครียด (45 mins default)
  3. `MED_CERT` — บริการตรวจสุขภาพและออกใบรับรองแพทย์ (20 mins default)
  4. `VACCINE_PREV` — บริการฉีดวัคซีนและเวชศาสตร์ป้องกัน (15 mins default)
  5. `PHYSICAL_THER` — บริการกายภาพบำบัดและฟื้นฟูออฟฟิศซินโดรม (45 mins default)
- **Vector**: `DoctorFilter` component tested with duration chips (15, 20, 30, 45, 60 mins) and department selector callbacks.

### Dimension 4: Appointment Lifecycle State Machine
- **Vector**: Multi-step state transitions (`pending` -> `confirmed` -> `completed` with consultation notes).
- **Vector**: Pre-consultation cancellation paths (`pending` -> `cancelled` and `confirmed` -> `cancelled`).
- **Vector**: UI action buttons rendered in `AppointmentCard` appropriately filtered by user role (`isStaff: true` displays `✓ ยืนยันนัด` and `✓ ตรวจเสร็จสิ้น`).

---

## 3. Constructive Observations & Recommendations

1. **`fetchAvailableSlots()` in `BookingModal.tsx`**:
   - *Observation*: In `BookingModal.tsx`, when `bookAppointment` fails due to `SLOT_ALREADY_BOOKED`, line 123 sets `conflictError(...)`, and line 130 immediately calls `fetchAvailableSlots()`. Because `fetchAvailableSlots()` starts with `setConflictError(null);`, the conflict error banner can be transiently reset if `loadingSlots` takes over.
   - *Recommendation*: Update `fetchAvailableSlots` or pass a parameter `clearConflictError = true/false` so that slot re-fetching after a collision preserves the conflict error message for the user.

---

## 4. Final Verdict

**VERDICT**: **APPROVE**  
All core database migrations (`03_rpc.sql`), fallback storage engines (`fallbackStorage.ts`), booking services (`bookingService.ts`), and user interface components meet all Milestone 2 functional, boundary, and concurrency requirements. Automated test suite passes 100% (111 tests, 23 files).
