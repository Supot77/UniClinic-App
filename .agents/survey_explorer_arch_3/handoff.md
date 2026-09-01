# Handoff Report: Technical Architecture & Database Blueprint

**Agent ID:** `survey_explorer_arch_3` (teamwork_preview_explorer)  
**Parent Agent:** `orchestrator` (`966b74b8-e2a5-4a5b-99bf-24d8f9216981`)  
**Mission:** Database Schema, Row-Level Security (RLS), Concurrency/Race Condition Engine & Architecture Blueprint for WU Clinic Booking & Medication System.  
**Report Artifact:** `D:\Mini Project WEB\wu-clinic-booking\.agents\survey_explorer_arch_3\arch_analysis.md`

---

## 1. Observation

1. **Authoritative Requirements (`ORIGINAL_REQUEST.md`)**:
   - Lines 12-44 define 6 core functional modules:
     - R1: 5 Core University Clinic Services (General Medicine, Mental Health, Medical Certificate, Vaccinations, Physical Therapy) with configurable slot durations (15, 30, 45, 60 mins).
     - R2: Doctor schedules and online slot booking with race condition & concurrency prevention.
     - R3: Medication master data, stock tracking, and low-stock alerts.
     - R4: Personal patient medication reminders and intake compliance logging.
     - R5: Central notification hub and clinic admin analytics dashboard.
     - R6: Role-based authentication (Student vs Staff/Admin) with strict Row Level Security (RLS).

2. **Existing Workspace State**:
   - `package.json` (lines 11-16): Next.js 16.3.0, React 19.2.8, `@supabase/supabase-js` 2.112.3, Tailwind CSS v4.
   - `src/app/` contains 6 page routes corresponding to developer contributions: `feem-auth`, `shop-schedules`, `pai-appointments`, `gun-inventory`, `glong-reminders`, `herb-dashboard`.
   - `src/components/schedules/BookingModal.tsx` (lines 67-73): Current booking mechanism is a non-atomic client-side update (`update({ status: 'booked' }).eq('id', slot.id)`) without transactional locking, which is vulnerable to double-booking race conditions.
   - `src/lib/supabaseClient.ts` (lines 1-7): Supabase client configured with environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

---

## 2. Logic Chain

1. **Relational Data Modeling**:
   - From R1-R6, 12 normalized tables are required: `profiles`, `departments`, `doctors`, `doctor_schedules`, `appointment_slots`, `appointments`, `medications`, `inventory_transactions`, `medication_reminders`, `medication_logs`, `notifications`, `clinic_audit_logs`.
   - Tables are linked via explicit foreign keys with cascade and restrict policies to maintain referential integrity.

2. **Concurrency & Race Condition Elimination**:
   - Direct client updates (`supabase.from('appointment_slots').update()`) cannot prevent race conditions because multiple clients can read `status = 'available'` simultaneously.
   - **Solution**: A dedicated PostgreSQL stored procedure `book_appointment_slot(p_slot_id, p_user_id, ...)` executing `SELECT ... FOR UPDATE` acquires an exclusive row lock on the target slot.
   - **Second-layer constraint**: A partial unique index `CREATE UNIQUE INDEX idx_uq_active_slot_booking ON appointments(slot_id) WHERE status IN ('pending', 'confirmed');` provides a database-level mathematical guarantee against duplicate bookings.

3. **Row Level Security (RLS) & PDPA Compliance**:
   - Strict policies created using helper functions `is_staff_or_admin()`:
     - `profiles`: Users view/edit their own profile; Staff/Admin can view all.
     - `appointments`: Students view/insert their own appointments only; Staff can view all.
     - `medication_reminders` & `medication_logs`: Strict user isolation (`user_id = auth.uid()`).
     - `medications` & `inventory_transactions`: Read available to authenticated users; stock mutations restricted to Staff/Admin.
     - `departments` & `doctors`: Public read-only; mutations restricted to Staff/Admin.

4. **Business Logic & Analytics RPCs**:
   - `adjust_medication_stock`: Atomically modifies stock quantities, logs audit transactions, and dispatches automated low-stock notifications to staff if stock falls below `min_stock_level`.
   - `get_patient_compliance_rate`: Calculates patient intake compliance percentage (`taken / total * 100`).
   - `get_admin_dashboard_metrics`: Aggregates today's appointments, low stock counts, department distributions, and 30-day no-show rates.

---

## 3. Caveats

- **External Supabase Instance Execution**: The provided DDL script and RPC definitions in `arch_analysis.md` must be executed against the Supabase database via Supabase SQL Editor or migration scripts in Milestone 1.
- **Client Auth Integration**: The client UI must authenticate using `@supabase/supabase-js` so that `auth.uid()` and JWT role claims are populated for RLS enforcement.
- **No caveats** regarding schema coverage — all 6 modules R1-R6 are comprehensively mapped.

---

## 4. Conclusion

The comprehensive technical blueprint and database architecture for the WU Clinic Booking & Medication System has been fully formulated and documented in:
`D:\Mini Project WEB\wu-clinic-booking\.agents\survey_explorer_arch_3\arch_analysis.md`

Key architecture deliverables:
1. Complete PostgreSQL DDL for 12 normalized tables with constraints, indexes, and cascades.
2. Complete Row Level Security (RLS) policies and security helper functions.
3. Concurrency-safe atomic booking RPC (`book_appointment_slot`) with pessimistic locking (`SELECT FOR UPDATE`) and unique constraints.
4. Stock adjustment and compliance rate calculation RPCs.
5. TypeScript domain models and service contracts for Next.js App Router.

---

## 5. Verification Method

1. **Inspect Blueprint File**:
   - View `D:\Mini Project WEB\wu-clinic-booking\.agents\survey_explorer_arch_3\arch_analysis.md` to confirm all 8 sections (Architecture Overview, DDL, RLS, Concurrency RPCs, Inventory RPCs, Seed Data, TypeScript types, Service contracts) are fully specified.
2. **SQL Syntax Validation**:
   - The PostgreSQL DDL, helper functions, and RPC procedures conform to standard PostgreSQL 15+ syntax supported by Supabase.
3. **Invalidation Condition**:
   - The design would be invalidated if requirements R1-R6 are altered to omit departments, medications, or user isolation, or if non-relational storage were requested.
