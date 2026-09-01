# Milestone 2: Clinic Services & Doctor Booking Engine — Technical Analysis & Implementation Plan

**Author**: m2_explorer_1 (Teamwork Explorer)  
**Date**: 2026-08-28  
**Scope**: 5 Clinic Departments Catalog, Doctor Schedules CRUD, Concurrency-Safe Atomic Booking Engine, and User Appointment Tracking Lifecycle.

---

## 1. Executive Summary & Problem Boundary

Milestone 2 establishes the core healthcare service delivery and scheduling engine for the WU Clinic Web Application. According to `ORIGINAL_REQUEST.md` (R1, R2) and `PROJECT.md` (Features 4–9), Milestone 2 must deliver:
1. **5 University Clinic Departments & Master Data**: General Medicine & Primary Care (15 min), Mental Health & Counseling (45 min), Medical Certificate & Health Check (20/30 min), Vaccinations & Preventive Care (15 min), and Physical Therapy (45/60 min).
2. **Doctor Schedules & Real-time Slots Management**: Dynamic schedule listing, filtering by 5 departments, date selection, search, slot duration display, and a dedicated Staff Schedule CRUD interface for clinic personnel to manage doctor shifts and bookable slots.
3. **Atomic Concurrency-Safe Booking Engine**: Modal booking utilizing PostgreSQL RPC `book_appointment_slot` with pessimistic row locking (`SELECT ... FOR UPDATE`) or resilient local simulated concurrency engine (`fallbackStorage.bookSlot`), handling race conditions, double booking prevention, and generating formatted appointment numbers (`APT-YYYYMMDD-XXXX`).
4. **Comprehensive Appointment Tracking & Lifecycle (`/pai-appointments`)**: Active patient appointment dashboard, status tabs (`All`, `Pending`, `Confirmed`, `Completed`, `Cancelled`), appointment cancellation workflow with automatic slot release and notification trigger, rescheduling, and staff appointment management.
5. **Mobile-First Responsive UX**: Apple Design System styling (`#0a2540`, `#0066cc`, `#f5f5f7`), loading skeletons, informative empty states, and resilient error recovery.

---

## 2. Deep-Dive Codebase Findings & Gap Analysis

### 2.1 Department & Doctor Master Data
| Feature / Element | Database Schema (`01_schema.sql` / `04_seed.sql`) | Fallback Storage (`mockMasterData.ts`) | Current Page (`shop-schedules/page.tsx`) | Status & Required Changes |
|---|---|---|---|---|
| **5 Departments** | `d1...` Gen Med (15m)<br>`d2...` Mental Health (45m)<br>`d3...` Med Cert (20m)<br>`d4...` Vaccine (15m)<br>`d5...` Physical Therapy (45m) | Fully configured 5 departments matching schema | Hardcoded 3 unrelated depts: `["อายุรกรรมทั่วไป", "กุมารเวชกรรม", "ผิวหนังและภูมิแพ้"]` | **CRITICAL FIX**: Dynamically load the 5 official university clinic departments from DB/fallbackStorage. |
| **Doctor Records** | 6 doctors with assigned departments, licenses, rooms, and bios | 6 doctors with rich metadata | Mapped via basic join in `useSchedules.ts` | **ENHANCE**: Show room location, specialty, slot durations, and doctor profile details on Schedule Cards. |
| **Configurable Durations** | Check constraint `(15, 20, 30, 45, 60)` | Supported across departments & slots | Not displayed as badges | **ADD**: Display slot duration chips (`15 นาที`, `30 นาที`, `45 นาที`) on cards & modal. |

---

### 2.2 Doctor Schedules & Staff Management (`src/app/shop-schedules/page.tsx`)
- **Current Deficiencies**:
  - `useSchedules.ts` only supports read operations and fails completely if Supabase is offline/unconfigured.
  - Staff / Admin users have no interface to create, edit, delete, or generate doctor slots.
  - Realtime subscription on `appointment_slots` is not yet attached to update slot availability live.
  - Lacks loading skeletons (only uses a single standard spinner).
- **Target Implementation**:
  - Add resilient dual-mode data fetching in `useSchedules.ts` (Supabase Client + `fallbackStorage`).
  - Add `StaffScheduleModal.tsx`: Allows staff/admin to add new slots (specifying Doctor, Date, Start Time, End Time, Capacity) and generate standard morning/afternoon shift slots.
  - Real-time synchronization via Supabase Realtime channel for slot status updates.
  - Skeleton loaders matching the 2-column grid layout.

---

### 2.3 Atomic Concurrency Booking Modal (`src/components/schedules/BookingModal.tsx`)
- **Current Deficiencies**:
  - Naive direct update: `supabase.from('appointment_slots').update({ status: 'booked' }).eq('id', selectedSlot.id)`.
  - Does NOT insert into `appointments` table.
  - Does NOT call the atomic `book_appointment_slot` RPC or `fallbackStorage.bookSlot`.
  - Does NOT collect patient chief complaint, symptoms, or notes.
  - No concurrency error handling (e.g. `SLOT_ALREADY_BOOKED`, `CONCURRENT_COLLISION`, `USER_DOUBLE_BOOKING`).
  - Does NOT trigger notifications or create appointment numbers.
- **Target Implementation**:
  - Step 1: Slot selection with real-time availability badges.
  - Step 2: Patient triage input form (Symptoms, Chief Complaint, Notes).
  - Step 3: Atomic Booking Execution:
    - Calls `supabase.rpc('book_appointment_slot', { ... })` if configured, or `fallbackStorage.bookSlot({ ... })`.
    - Handles conflict responses gracefully with user-friendly error banners and auto-refresh of slots.
  - Step 4: Success Screen displaying Appointment Number, QR/Badge, Date, Time, Doctor, Room, and quick CTA to `/pai-appointments`.

---

### 2.4 Appointments Tracking Page (`src/app/pai-appointments/page.tsx`)
- **Current Deficiencies**:
  - Currently contains static dummy mock step 1 & 2 cards without any connection to database or user appointments.
  - Lacks status filtering, cancellation modal, reschedule feature, or role distinction.
- **Target Implementation**:
  - Build complete Appointment Tracking Dashboard:
    - Status Filter Tabs: `All (ทั้งหมด)`, `Confirmed (ยืนยันแล้ว)`, `Pending (รอดำเนินการ)`, `Completed (เสร็จสิ้น)`, `Cancelled (ยกเลิกแล้ว)`.
    - Search by doctor name, appointment number, or patient name.
    - Role-based scoping:
      - `Student`: Sees their personal appointments and cancel/reschedule actions.
      - `Staff / Admin`: Sees all clinic appointments, with ability to filter by department/date, confirm pending appointments, or mark completed.
    - Cancel Appointment Modal:
      - Asks for reason (`ติดธุระด่วน`, `ติดเรียน/สอบ`, `อาการดีขึ้นแล้ว`, `อื่นๆ`).
      - Calls `cancel_appointment` RPC / `fallbackStorage.cancelAppointment`.
      - Automatically restores slot status to `available` and fires notification.
    - Reschedule Modal:
      - Allows picking a new available slot with the doctor.
    - Loading skeletons and empty states with "จองคิวตรวจใหม่" CTA.

---

### 2.5 Custom Hooks: `useSchedules.ts` & `useAppointments.ts`
- **`src/hooks/useSchedules.ts`**:
  - Update to support:
    - Dual mode: Supabase + `fallbackStorage`.
    - Department fetching & Doctor list with department details.
    - Slots query by doctor & date.
    - Staff slot management methods: `createSlot`, `deleteSlot`, `generateBatchSlots`.
    - Realtime channel subscription on `appointment_slots`.
- **`src/hooks/useAppointments.ts`** (New File):
  - `appointments`: `AppointmentWithDetails[]`.
  - `loading`, `error`, `refreshAppointments`.
  - `cancelAppointment(appointmentId: string, reason?: string)`.
  - `rescheduleAppointment(appointmentId: string, newSlotId: string)`.
  - `updateAppointmentStatus(appointmentId: string, status: AppointmentStatus)`.
  - Realtime channel subscription on `appointments`.

---

## 3. Step-by-Step Implementation Roadmap for Worker

```
[Phase 1: Hooks & Services Layer]
  ├── Update src/hooks/useSchedules.ts (Dual-mode, 5 depts, slot CRUD, realtime sync)
  └── Create src/hooks/useAppointments.ts (Dual-mode, status filters, cancel/reschedule mutations, realtime sync)

[Phase 2: Booking Engine & Modal Polish]
  ├── Overhaul src/components/schedules/BookingModal.tsx (Atomic RPC / fallback, triage symptoms form, concurrency alerts, confirmation screen)
  └── Create src/components/schedules/StaffScheduleModal.tsx (Slot CRUD & shift generator for Staff/Admin)

[Phase 3: Schedules Page & Components]
  ├── Update src/components/schedules/DepartmentFilter.tsx (Dynamic 5 depts with icons & count)
  ├── Update src/components/schedules/ScheduleFilterBar.tsx (Search, Date picker, 5 Dept chips, Staff "Add Slot" button)
  ├── Update src/components/schedules/ScheduleCard.tsx (Doctor avatar, room, license, slot duration badge, available slots, book button)
  └── Update src/app/shop-schedules/page.tsx (Integration, loading skeleton, empty state, staff mode)

[Phase 4: Appointments Tracking Page & Components]
  ├── Create src/components/appointments/AppointmentCard.tsx (Status badges, doctor info, appointment number, cancellation & reschedule actions)
  ├── Create src/components/appointments/CancelAppointmentModal.tsx (Reason prompt, atomic cancel RPC/fallback)
  ├── Create src/components/appointments/RescheduleModal.tsx (Slot selection, atomic slot swap)
  ├── Create src/components/appointments/AppointmentFilterBar.tsx (Status tabs, search, date filter)
  └── Overhaul src/app/pai-appointments/page.tsx (Full tracking dashboard, role RBAC view, skeletons, empty states)

[Phase 5: Verification & Testing]
  ├── Run Vitest test suite (`npm run test` or `npx vitest run`) to confirm 100% pass across all tiers
  └── Perform end-to-end verification of booking race conditions, cancellation slot release, and responsive UI
```

---

## 4. Concurrency & Race-Condition Strategy

1. **Supabase Database Layer**:
   - `SELECT ... FOR UPDATE` row-level lock on `appointment_slots` inside PostgreSQL RPC `book_appointment_slot`.
   - Partial unique index `idx_uq_active_slot_booking` on `appointments(slot_id) WHERE status IN ('pending', 'confirmed')` preventing database-level duplicates.
2. **Demo / Offline Fallback Layer**:
   - `fallbackStorage.bookSlot` verifies `slot.status === 'available'` and `slot.current_booked < slot.max_capacity`.
   - Double-booking checks verify the user does not have an existing active appointment at the identical date & time.
   - Atomic state transition: `status -> 'booked'`, `current_booked -> 1`, version incremented.
3. **Frontend UI Handling**:
   - Disables submit buttons with spinner during booking operation.
   - Traps error codes (`SLOT_ALREADY_BOOKED`, `CONCURRENT_COLLISION`, `USER_DOUBLE_BOOKING`) and presents clear actionable feedback in Thai.
   - Automatically refreshes available slot list when conflict occurs.

---

## 5. Mobile-First & Visual Design Standards

- **Color Palette**: Apple-inspired clean palette (`#0a2540` Navy, `#0066cc` Royal Blue, `#f5f5f7` Background, `#1d1d1f` Text, `#e0e0e0` Borders).
- **Typography & Radii**: `apple-tight-headline`, `rounded-[18px]` for primary cards, `rounded-2xl` for modals, `rounded-full` for chips and pills.
- **Skeletons**: Pulse animated skeleton cards for schedules (`h-48 rounded-[18px] bg-zinc-200`) and appointments.
- **Empty States**: SVG illustrations with friendly Thai guidance and action CTAs.
- **Developer Attribution Banners**:
  - `shop-schedules`: ผู้พัฒนาคนที่ 2 (Shop) - ตารางเวรแพทย์และแผนกบริการ
  - `pai-appointments`: ผู้พัฒนาคนที่ 3 (Pai) - ระบบติดตามและจัดการนัดหมายพบแพทย์
