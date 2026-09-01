# Project: WU Clinic Booking & Medication System (COE67-331)

## Architecture
- **Framework**: Next.js 16.3 (App Router, Turbopack) + React 19 + TypeScript 5 + Tailwind CSS v4.
- **Backend & Database**: Supabase (PostgreSQL 15+) with Row-Level Security (RLS) and PostgreSQL RPC Stored Procedures for atomic operations.
- **State Management & Data Fetching**: Supabase JS Client with Realtime subscriptions, custom React hooks, and optimistic UI updates.
- **Testing Harness**: Vitest + @testing-library/react + @testing-library/jest-dom + jsdom.
- **Code Layout**:
  - `src/app/`: Next.js App Router pages (`feem-auth`, `shop-schedules`, `pai-appointments`, `gun-inventory`, `glong-reminders`, `herb-dashboard`, `/`, `layout.tsx`).
  - `src/components/`: Reusable modular UI components partitioned by domain (`auth/`, `schedules/`, `appointments/`, `inventory/`, `reminders/`, `dashboard/`, `notifications/`, `common/`).
  - `src/lib/`: Core utilities (`supabaseClient.ts`, `auth.ts`, `database.types.ts`, `constants.ts`).
  - `src/hooks/`: Reusable hooks (`useAuth.ts`, `useSchedules.ts`, `useAppointments.ts`, `useInventory.ts`, `useReminders.ts`, `useNotifications.ts`, `useDashboard.ts`).
  - `src/types/`: TypeScript interface definitions.
  - `supabase/`: SQL migration scripts (`schema.sql`, `rls.sql`, `rpc.sql`, `seed.sql`).
  - `tests/`: Comprehensive E2E and unit test suites organized by tiers (`tier1_features/`, `tier2_boundaries/`, `tier3_interactions/`, `tier4_scenarios/`).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Supabase Database Schema | 12 normalized PostgreSQL tables with foreign keys and indexes | M1 | survey |
| 2 | Row Level Security (RLS) Matrix | Strict PDPA isolation for patient records and role-based staff access | M1 | survey |
| 3 | Supabase Auth & Role RBAC | Login, registration, role switcher (Student vs Staff/Admin) and route guards | M1 | survey |
| 4 | 5 University Clinic Departments | General Medicine, Mental Health, Medical Certificate, Vaccinations, Physical Therapy | M2 | survey |
| 5 | Configurable Slot Durations | 15, 30, 45, 60 minute appointment slot intervals | M2 | survey |
| 6 | Doctor Schedule Management | Staff CRUD interface for daily doctor working hours and available slots | M2 | survey |
| 7 | Atomic Concurrency Booking RPC | `SELECT FOR UPDATE` & partial unique index preventing double-booking race conditions | M2 | survey |
| 8 | Realtime Slot Status Sync | Instant availability updates via Supabase Realtime channel | M2 | survey |
| 9 | Appointment Lifecycle & Status Tracking | Pending, Confirmed, Completed, Cancelled with cancellation & reschedule workflows | M2 | survey |
| 10 | Medication Master Catalog | Comprehensive catalog (brand, generic, dosage, category, expiry, min stock) | M3 | survey |
| 11 | Stock Health & Low-Stock Alerts | Dynamic calculation of Adequate / Reorder / Critical stock with UI alerts | M3 | survey |
| 12 | Debounced Inventory Search & Filter | Fast debounced search by name/generic and category filtering | M3 | survey |
| 13 | Stock In/Out Adjustment Engine | Transactional stock modification with audit history logging | M3 | survey |
| 14 | Personal Medication Reminders | Daily reminder schedules with configurable times and frequencies | M4 | survey |
| 15 | Dose Confirmation & Log Entry | "Taken" (กินแล้ว) / "Skipped" (ข้ามมื้อ) with timestamped medication logs | M4 | survey |
| 16 | Mathematical Compliance Calculation | Patient intake compliance rate percentage with historical progress trends | M4 | survey |
| 17 | Realtime Notification Center | In-app notification hub for appointments, medication times, and clinic alerts | M5 | survey |
| 18 | Clinic Executive Admin Dashboard | Real-time KPI metrics: daily appointments, department loads, 30-day no-show rate | M5 | survey |
| 19 | Inventory Health KPI Widget | Executive summary of low-stock and expiring medications | M5 | survey |
| 20 | Mobile-First Responsive & Skeletons | Responsive layout, loading skeletons, empty states, and error handling | M6 | survey |
| 21 | Test Suite Tiers 1-4 (>=10 AC Tests) | Comprehensive Vitest suite covering valid/invalid cases across all modules | E2E-Test | survey |
| 22 | Adversarial Hardening (Tier 5) | White-box edge case testing and vulnerability mitigation | M6 | survey |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite Track | Vitest test runner setup, test harness, Tiers 1-4 requirement-driven test cases (>=30 tests), publish TEST_READY.md | none | IN_PROGRESS |
| 1 | Core Database, RLS & Auth RBAC | Complete SQL migrations (tables, RLS, RPCs, seed data), Supabase Auth helper, Role guard, profile management | none | IN_PROGRESS |
| 2 | Clinic Services & Doctor Booking Engine | 5 Department catalog, doctor schedule CRUD, atomic booking RPC with concurrency control, appointment lifecycle | M1 | PLANNED |
| 3 | Medication Inventory & Low-Stock Alerts | Full drug master data CRUD, stock adjustment transactions, debounced search, low-stock visual badges and triggers | M1 | PLANNED |
| 4 | Personal Reminders & Compliance Tracker | Patient reminder schedule CRUD, Taken/Skipped dose logging, real-time compliance rate calculation & visualization | M1 | PLANNED |
| 5 | Notification Hub & Admin Analytics Dashboard | Global notification dropdown/bell, realtime alerts, Admin Dashboard KPIs (daily queue, dept distribution, no-show rate) | M1, M2, M3, M4 | PLANNED |
| 6 | Final Integration & 100% E2E Pass (Tiers 1-5) | Full system integration, pass 100% of E2E tests, zero console errors, mobile polish, Phase 2 adversarial hardening | E2E, M1-M5 | PLANNED |

---

## Interface Contracts

### 1. Database & Supabase Types (`src/types/database.ts`)
- `Profile`: `{ id: string, email: string, full_name: string, role: 'student' | 'staff' | 'admin', student_id?: string, phone?: string }`
- `Department`: `{ id: string, name_th: string, name_en: string, description: string, default_duration_minutes: number, icon_name: string }`
- `Doctor`: `{ id: string, department_id: string, name: string, specialty: string, avatar_url?: string }`
- `AppointmentSlot`: `{ id: string, doctor_id: string, start_time: string, end_time: string, status: 'available' | 'booked' | 'blocked' }`
- `Appointment`: `{ id: string, slot_id: string, user_id: string, department_id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled', notes?: string }`
- `Medication`: `{ id: string, name_th: string, name_en: string, generic_name: string, dosage: string, category: string, current_stock: number, min_stock_level: number, expiry_date: string }`
- `MedicationReminder`: `{ id: string, user_id: string, medication_id?: string, custom_med_name?: string, dosage: string, frequency_per_day: number, reminder_times: string[] }`
- `MedicationLog`: `{ id: string, reminder_id: string, user_id: string, scheduled_time: string, actual_time?: string, status: 'taken' | 'skipped' | 'missed' }`
- `Notification`: `{ id: string, user_id: string, title: string, message: string, type: 'appointment' | 'medication' | 'announcement' | 'system', is_read: boolean }`

### 2. Concurrency RPC Contracts
- `book_appointment_slot(p_slot_id UUID, p_user_id UUID, p_notes TEXT)` -> Returns JSON `{ success: boolean, appointment_id: UUID, message: text }`
  - Acquires exclusive lock (`SELECT ... FOR UPDATE`) on target slot. Rejects if slot is not `available`.
- `cancel_appointment(p_appointment_id UUID, p_user_id UUID, p_reason TEXT)` -> Returns JSON `{ success: boolean, message: text }`
  - Reverts appointment status to `cancelled` and releases slot back to `available`.
- `adjust_medication_stock(p_medication_id UUID, p_quantity_change INT, p_transaction_type TEXT, p_notes TEXT)` -> Returns JSON `{ success: boolean, new_stock: int, status: text }`
- `get_patient_compliance_rate(p_user_id UUID, p_days INT)` -> Returns JSON `{ total_doses: int, taken_doses: int, compliance_rate: float }`
- `get_admin_dashboard_metrics()` -> Returns JSON `{ total_today: int, confirmed_today: int, pending_today: int, no_show_rate: float, low_stock_count: int, department_distribution: JSON }`

---

## Code Layout
- `src/lib/supabaseClient.ts`: Supabase client initialization.
- `src/lib/mockData.ts` & `src/lib/fallbackStorage.ts`: Resilient fallback layer when Supabase network credentials are local/offline in demo mode.
- `src/services/`: Modular service layer (`authService.ts`, `bookingService.ts`, `inventoryService.ts`, `reminderService.ts`, `notificationService.ts`, `dashboardService.ts`).
- `src/hooks/`: React custom hooks wrapping services with loading/error states and optimistic updates.
- `src/components/`: Reusable domain components with responsive mobile-first Tailwind styling and loading skeletons.
- `tests/`: Comprehensive Vitest suites.
