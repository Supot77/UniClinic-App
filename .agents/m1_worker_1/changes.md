# Changes Report: Milestone 1 — Database Architecture, RLS, RPCs & Auth RBAC

**Agent**: `m1_worker_1` (Implementer / QA / Specialist)  
**Date**: 2026-08-28  
**Scope**: Core Database Engine, Security Matrix, Stored Procedures, Seed Master Data, Client-side Type Definitions, Offline Fallback Storage, Dual-mode AuthContext & Hooks, Protected Routes, Header, and Auth UI.

---

## 1. Files Created & Modified

### Database Migrations (`supabase/migrations/`)
1. `supabase/migrations/01_schema.sql`
   - 12 normalized tables: `profiles`, `departments`, `doctors`, `doctor_schedules`, `appointment_slots`, `appointments`, `medications`, `inventory_transactions`, `medication_reminders`, `medication_logs`, `notifications`, `clinic_audit_logs`.
   - Explicit Foreign Keys, check constraints, cascading rules, and partial unique index (`idx_uq_active_slot_booking` on `appointments` where `status IN ('pending', 'confirmed')`).
   - Indexes on query paths (`slot_date`, `status`, `department_id`, `doctor_id`, `user_id`, `category`, `stock_quantity`).

2. `supabase/migrations/02_rls.sql`
   - Row-Level Security enabled on all 12 tables.
   - Helper functions: `public.is_staff_or_admin()`, `public.is_admin()`, `public.get_current_user_role()`.
   - Strict PDPA isolation for patient appointments, medication reminders, dose logs, and notifications (`user_id = auth.uid()`).
   - Administrative policies granting read/write access to clinic staff and directors.

3. `supabase/migrations/03_rpc.sql`
   - `public.book_appointment_slot`: Atomic booking procedure using pessimistic row locking (`SELECT * FROM appointment_slots WHERE id = p_slot_id FOR UPDATE`), double-booking checks, unique constraint handling, slot status mutation, notification trigger, and audit logging.
   - `public.cancel_appointment`: Atomic appointment cancellation releasing slot back to `available` (`current_booked = current_booked - 1`).
   - `public.adjust_medication_stock`: Transactional stock modifier with audit logging and automated low-stock notifications to staff when `stock_quantity <= min_stock_level`.
   - `public.get_patient_compliance_rate`: Calculates mathematical intake compliance rate percentage over date intervals.
   - `public.get_admin_dashboard_metrics`: Aggregates real-time clinic KPIs (today's appointments, total patients, low stock meds, 30-day no-show rate, department loads).

4. `supabase/migrations/04_seed.sql`
   - 5 University Clinic Departments:
     - `GEN_MED` (General Medicine, 15m slot duration)
     - `MENTAL_HLTH` (Mental Health & Counseling, 45m slot duration)
     - `MED_CERT` (Medical Certificate, 20m slot duration)
     - `VACCINE_PREV` (Vaccinations & Preventive Care, 15m slot duration)
     - `PHYSICAL_THER` (Physical Therapy & Rehabilitation, 45m slot duration)
   - 6 Medical Specialists with departments, license numbers, room numbers, and bios.
   - Doctor recurring schedules and slot generation data.
   - 8 distinct medications across categories with adequate, low, and critical stock tiers.
   - 3 pre-configured Thai demo user profiles (`somchai.jai@wu.ac.th`, `somying.nurse@wu.ac.th`, `walai.director@wu.ac.th`).
   - Sample reminders, intake logs, and notifications.

### TypeScript Interfaces & Client Foundation (`src/types/`, `src/lib/`)
5. `src/types/database.ts`
   - Comprehensive Supabase `Database` schema definition matching PostgreSQL tables, rows, inserts, updates, and RPC parameters.
   - Composite domain models (`DoctorWithDepartment`, `AppointmentSlotWithDetails`, `AppointmentWithDetails`, `MedicationReminderWithLogs`, `DashboardMetrics`, `ComplianceMetrics`).

6. `src/types/auth.ts`
   - UserRole (`student` | `staff` | `admin`), `Profile`, `DemoPersona`, `AuthContextType`, `SignInCredentials`, `SignUpCredentials`.

7. `src/lib/mockAuthData.ts`
   - 3 Thai test personas with role metadata, avatar URLs, student ID, and Thai descriptions.

8. `src/lib/mockMasterData.ts`
   - Full master data catalog for 5 departments, 6 doctors, 8 medications, initial slots, sample appointments, reminders, dose logs, and dashboard metrics.

9. `src/lib/fallbackStorage.ts`
   - Zero-backend offline storage engine utilizing `localStorage` and memory fallbacks.
   - Implements full CRUD, concurrency simulation, slot locking, stock adjustments, compliance rate calculation, and notification dispatch.

### React State Management, Hooks & Components (`src/context/`, `src/hooks/`, `src/components/`, `src/app/`)
10. `src/context/AuthContext.tsx`
    - Dual-mode Auth provider: automatically checks real Supabase session, seamlessly falls back to offline demo personas if unconfigured or network fails.
    - Provides `signIn`, `signUp`, `signOut`, `switchRole`, `switchDemoUser`, and `updateProfile`.

11. `src/hooks/useAuth.ts`
    - `useAuth` hook exposing boolean role helpers (`isStudent`, `isStaff`, `isAdmin`, `isStaffOrAdmin`, `isAuthenticated`, `isDemoMode`).
    - `useRequireAuth` route guard hook.

12. `src/components/auth/ProtectedRoute.tsx`
    - High-level route guard with role-based access denial screens and login redirection.

13. `src/components/auth/DemoRoleSwitcher.tsx`
    - Interactive 1-click persona & role switcher widget in the header and navigation, featuring colored role badges.

14. `src/components/layout/Header.tsx`
    - Upgraded with active route highlighting, role badges, demo switcher, mobile menu drawer, and profile management links.

15. `src/app/feem-auth/page.tsx`
    - Interactive Apple-style authentication hub with 4 functional tabs: Sign In, Sign Up, 1-Click Demo Persona selection, and User Profile health info management.

16. `src/app/layout.tsx`
    - Wrapped with `<AuthProvider>`.

---

## 2. Verification Summary

- **TypeScript Type Check**: `npx tsc --noEmit` -> **0 errors (Exit code 0)**.
- **ESLint**: `npm run lint` -> **0 errors, 0 warnings (Exit code 0)**.
- **Vitest Test Suite**: `npm test` -> **20/20 test files passed, 66/66 test cases passed (100% PASS)**.
- **Turbopack Build**: `npm run build` -> **Compiled and prerendered 10/10 static routes in 1.5s with zero errors**.
