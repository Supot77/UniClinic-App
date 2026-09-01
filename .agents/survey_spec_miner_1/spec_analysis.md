# Specification Analysis & Requirements Extraction
**WU Clinic Booking & Medication System (COE67-331 Walailak University)**
**Document Version**: 1.0.0  
**Author**: survey_spec_miner_1 (teamwork_preview_spec_miner)  
**Date**: 2026-08-28  

---

## 1. Executive Summary & Specification Scope

The **WU Clinic Booking & Medication System** is an enterprise-grade university healthcare management and medication adherence web application built for Walailak University (COE67-331). The platform connects students, staff, medical practitioners, and clinic administrators into a unified digital ecosystem.

### Core Architectural Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.
- **Backend & Database**: Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Realtime WebSockets).
- **Security & Compliance**: Role-Based Access Control (RBAC), Row Level Security (RLS) for PDPA compliance, Atomic Transactions for Concurrency.
- **UX Paradigm**: Mobile-first responsive, Apple-inspired human interface guidelines, accessible typography, optimistic updates, skeleton loaders, and zero console errors.

---

## 2. Comprehensive Module Deconstruction (R1 to R6)

### Module R1: University Clinic Service & Master Data (ระบบบริการและแผนกสุขภาพมหาวิทยาลัย)

#### Functional Scope
R1 establishes the master catalog of clinical services provided at Walailak University Medical Center. It defines 5 distinct primary departments, operating protocols, consultation durations, and medical staff assignments.

#### Department Specifications
1. **แผนกที่ 1: บริการตรวจรักษาโรคทั่วไปและทำแผล (General Medicine & Primary Care)**
   - *Scope*: Diagnosis and treatment of acute illnesses (fever, flu, gastritis, minor trauma), dressing changes, suture removal, and basic triage.
   - *Default Slot Duration*: **15 minutes** (Fast-turnaround triage and consultation).
   - *Required Metadata*: Department ID, Thai/EN Name, Description, Clinic Room No., Assigned Doctors, Operating Hours.
2. **แผนกที่ 2: บริการให้คำปรึกษาสุขภาพจิตและความเครียด (Mental Health & Counseling)**
   - *Scope*: Confidential psychiatric and psychological counseling for students and staff facing academic stress, anxiety, depression, and personal challenges.
   - *Default Slot Duration*: **45 minutes** (In-depth 1-on-1 counseling session).
   - *Required Metadata*: Department ID, Thai/EN Name, Confidentiality Flag, Dedicated Private Consultation Room, Assigned Counselors/Psychiatrists.
3. **แผนกที่ 3: บริการตรวจสุขภาพและออกใบรับรองแพทย์ (Medical Certificate & Health Screening)**
   - *Scope*: Physical checkups, vital sign screening, and medical certificate issuance for internships, employment, student activity clearance, and sick leave.
   - *Default Slot Duration*: **30 minutes** (Physical exam + documentation review).
   - *Required Metadata*: Department ID, Thai/EN Name, Certificate Types Supported, Fee/Free Status, Requirements Checklist.
4. **แผนกที่ 4: บริการฉีดวัคซีนและเวชศาสตร์ป้องกัน (Vaccinations & Preventive Care)**
   - *Scope*: Seasonal influenza vaccines, Hepatitis B, Tetanus, HPV, COVID-19 boosters, and preventative health education.
   - *Default Slot Duration*: **15 minutes** (Vaccine administration and 15-min post-vaccine observation protocol).
   - *Required Metadata*: Department ID, Thai/EN Name, Available Vaccine List, Batch Number Tracking, Cold Chain Requirements.
5. **แผนกที่ 5: บริการกายภาพบำบัดและฟื้นฟูออฟฟิศซินโดรม (Physical Therapy & Rehabilitation)**
   - *Scope*: Ergonomic physical therapy, musculoskeletal rehabilitation, electrotherapy/ultrasound treatment, and posture correction for office syndrome.
   - *Default Slot Duration*: **45 minutes** (Hands-on therapy and targeted exercises).
   - *Required Metadata*: Department ID, Thai/EN Name, Equipment Availability, Therapy Room Number.

---

### Module R2: Doctor Schedules & Appointment Booking Engine (ระบบจัดการตารางแพทย์และการจองคิวออนไลน์)

#### Functional Scope
R2 provides doctor schedule administration, multi-parameter search for patients, high-integrity booking mechanics with atomic race-condition prevention, and full appointment lifecycle tracking.

#### Functional Breakdown
1. **Doctor Schedule Management (Staff / Admin)**:
   - Manage doctor availability per date and time range.
   - Define custom or recurring slot durations (15 / 30 / 45 mins).
   - Bulk generate slots or modify/cancel individual slots.
   - Slot attributes: `id`, `doctor_id`, `department_id`, `slot_date`, `start_time`, `end_time`, `status` (`available`, `booked`, `blocked`, `cancelled`).
2. **Patient Search & Real-time Discovery**:
   - Filter by Department (Dropdown / Chips).
   - Filter by Doctor Name (Instant Text Search).
   - Filter by Date Picker (Calendar).
   - Real-time availability indicator: instantly shows remaining slots without page reload.
3. **Concurrency & Double-Booking Prevention**:
   - **Problem**: Simultaneous booking requests from two users for the same slot.
   - **Solution Contract**: Database-level conditional update (`UPDATE appointment_slots SET status = 'booked' WHERE id = :slot_id AND status = 'available'`) or Postgres Transaction with `FOR UPDATE` row-level lock.
   - Exactly one user succeeds with confirmation; the second user receives an immediate `409 Conflict` error ("คิวนี้ถูกจองไปแล้ว กรุณาเลือกช่วงเวลาอื่น") and the UI refreshes available slots.
4. **Appointment Lifecycle & Status State Machine**:
   - State Transitions:
     - `Pending`: Initial appointment request submitted (if clinic requires approval) or created.
     - `Confirmed`: Confirmed appointment with assigned doctor and room.
     - `Completed`: Patient arrived, consultation finished, prescription/notes logged.
     - `Cancelled`: Cancelled by patient or staff prior to appointment.
   - Cancellation & Rescheduling:
     - Patients can cancel their appointment with a required reason field.
     - Rescheduling cancels the old slot (re-marking it `available`) and claims the new slot atomically.

---

### Module R3: Medication Inventory & Master Data (ระบบจัดการฐานข้อมูลคลังยาและเวชภัณฑ์)

#### Functional Scope
R3 manages the pharmacy inventory catalog, master drug definitions, real-time stock levels, automated stock health classification, low-stock threshold alerting, and debounced instant search.

#### Data Model & Master Catalog Fields
- `id`: Unique identifier (UUID / BigInt).
- `name`: Trade / Brand Name (e.g. "Amoxicillin 500mg GPO", "Tylenol 500mg").
- `generic_name`: Active Pharmaceutical Ingredient / Generic Name (e.g. "Amoxicillin Trihydrate", "Paracetamol").
- `dosage`: Strength and form (e.g. "500 mg Tablet", "60 ml Syrup", "15 g Topical Cream").
- `category`: Pharmacological / Therapeutic Class (e.g. "ยาปฏิชีวนะ (Antibiotics)", "ยาลดไข้บรรเทาปวด (Analgesics/Antipyretics)", "ยาแก้แพ้ (Antihistamines)", "ยาระบบทางเดินหายใจ (Respiratory)", "เวชภัณฑ์ทั่วไป (Supplies)").
- `expiry_date`: Expiration date (`YYYY-MM-DD`).
- `stock_quantity`: Current on-hand quantity in units (tablets, bottles, tubes).
- `min_stock`: Minimum stock safety threshold.
- `unit`: Dispensing unit (เม็ด, แคปซูล, ขวด, หลอด, แผง).
- `status`: Computed stock status.

#### Stock Status Computation Rules
1. **มีเพียงพอ (Sufficient / In Stock)**: `stock_quantity > min_stock` $\rightarrow$ Green badge (`#10b981`).
2. **ต้องสั่งเพิ่ม (Low Stock / Reorder Needed)**: `0 < stock_quantity <= min_stock` $\rightarrow$ Amber warning badge (`#f59e0b`).
3. **วิกฤตใกล้หมด / หมดสต็อก (Critical / Out of Stock)**: `stock_quantity == 0` or `stock_quantity <= 0.2 * min_stock` $\rightarrow$ Rose red critical badge (`#f43f5e`).
4. **ยาหมดอายุ / ใกล้หมดอายุ (Expired / Near Expiry Alert)**: `expiry_date <= CURRENT_DATE` or within 30 days.

#### Debounced Search Specification
- Real-time search across `name`, `generic_name`, and `category`.
- Debounce delay: **300ms** to optimize network bandwidth and eliminate UI stuttering.

---

### Module R4: Personal Medication Reminders & Compliance (ระบบแจ้งเตือนการทานยาส่วนบุคคลและบันทึกประวัติ)

#### Functional Scope
R4 empowers patients to schedule, manage, and adhere to their prescribed medication regimens. It tracks every dose event and calculates verifiable compliance rates.

#### Functional Specifications
1. **Medication Reminder Configuration**:
   - Associated with authenticated patient (`user_id`).
   - Fields: Medication name, Dosage instruction (e.g. "1 เม็ด หลังอาหารเช้า-เย็น", "ก่อนอาหาร 30 นาที"), Frequency per day (1x, 2x, 3x, 4x), Scheduled times array (e.g. `["08:00", "12:00", "18:00", "21:00"]`), Start date, End date, Active toggle.
2. **Interactive Dose Confirmation**:
   - **Mark as Taken (กินแล้ว)**:
     - Patient clicks "กินแล้ว".
     - System logs event to `medication_logs` with exact timestamp `taken_at = NOW()`.
     - Visual celebration / checkmark state.
   - **Mark as Skipped (ข้ามมื้อ)**:
     - Patient clicks "ข้ามมื้อ".
     - System prompts for skip reason (e.g. ลืม, คลื่นไส้/แพ้ยา, อาการดีขึ้นแล้ว, แพทย์สั่งหยุด).
     - System logs event with `status = 'skipped'`, `reason`, and timestamp.
3. **Compliance Rate Metric Formula**:
   $$\text{Compliance Rate (\%)} = \left( \frac{\sum \text{Doses Taken}}{\sum (\text{Doses Taken} + \text{Doses Skipped} + \text{Doses Missed})} \right) \times 100\%$$
   - **Rating Tiers**:
     - $\ge 80\%$: **ดีเยี่ยม (Excellent Adherence)** — Green.
     - $50\% - 79\%$: **ปานกลาง (Moderate Adherence)** — Yellow/Amber.
     - $< 50\%$: **ต้องปรับปรุง (Low Adherence / At Risk)** — Red.

---

### Module R5: Notification Center & Admin Analytics Dashboard (ศูนย์แจ้งเตือนและแดชบอร์ดสรุปผลผู้บริหารคลินิก)

#### Functional Scope
R5 unifies personal event alerts and system broadcasts with high-level administrative KPIs for clinic decision-makers.

#### Functional Breakdown
1. **Real-time Notification Center**:
   - Multi-category notifications:
     - *Appointment Alerts*: Booking confirmed, appointment reminder (24h before), doctor schedule cancellation.
     - *Medication Reminders*: Scheduled dose reminder, low compliance warning.
     - *Clinic Announcements*: University vaccination campaigns, emergency clinic closures, seasonal health advisories.
   - Realtime delivery: Subscribes to Supabase Realtime channel for live in-app toast and badge counter update.
2. **Executive Admin Dashboard Metrics**:
   - **Daily Queue Load (คิวตรวจประจำวัน)**: Real-time counter of today's total appointments, broken down by Pending, Confirmed, Completed, Cancelled.
   - **Departmental Utilization (สถิติการใช้งานแยกตามแผนก)**: Distribution chart / breakdown across the 5 primary departments.
   - **No-Show Rate Analysis (อัตราผู้ป่วยผิดนัด / ไม่มาตามนัด)**:
     $$\text{No-Show Rate (\%)} = \left( \frac{\text{Cancelled / No-Show Appointments}}{\text{Total Scheduled Appointments}} \right) \times 100\%$$
   - **Inventory Health Index (สถานะคลังยาภาพรวม)**: Proportion of Sufficient vs. Low Stock vs. Critical/Expired items.
   - **System Activity Feed**: Chronological log of recent bookings, dispensing, and system notifications.

---

### Module R6: Authentication & PDPA / RLS Security (ระบบสมาชิก การควบคุมสิทธิ์และความปลอดภัย)

#### Functional Scope
R6 enforces enterprise-grade identity, role separation, and database-level data isolation complying with Thailand PDPA (Personal Data Protection Act) standards.

#### Security & Access Control Specifications
1. **Role Separation**:
   - `Student / Patient`:
     - Access: Self-profile, service catalog, doctor schedules, booking appointments for self, self-medication reminders, self-medication logs, self-notifications.
     - Denied: Administrative dashboards, inventory editing, other patients' records, doctor slot configuration.
   - `Staff / Admin / Doctor`:
     - Access: All clinical departments, slot creation/management, all patient appointments, medication inventory CRUD, admin analytics dashboard, clinic-wide announcement broadcasts.
2. **Row Level Security (RLS) Matrix**:
   - `profiles`:
     - SELECT: Owner or role in (`staff`, `admin`).
     - UPDATE: Owner or role in (`staff`, `admin`).
   - `appointments`:
     - SELECT: `user_id = auth.uid()` OR `auth.jwt() ->> 'role' IN ('staff', 'admin')`.
     - INSERT: `user_id = auth.uid()` (authenticated users only).
     - UPDATE: `user_id = auth.uid()` (for cancellation) OR `auth.jwt() ->> 'role' IN ('staff', 'admin')`.
   - `medication_reminders` & `medication_logs`:
     - Strict 100% Patient Isolation: `user_id = auth.uid()` for all SELECT, INSERT, UPDATE, DELETE operations. No cross-patient read even via direct SDK calls.
   - `medicines` (Inventory):
     - SELECT: All authenticated users.
     - INSERT/UPDATE/DELETE: Restricted strictly to `role IN ('staff', 'admin')`.
   - `appointment_slots`:
     - SELECT: All authenticated users (to view availability).
     - INSERT/UPDATE/DELETE: Restricted strictly to `role IN ('staff', 'admin')`. (Atomic status update permitted via secure RPC/booking function).
3. **UI / UX Non-Functional Standards**:
   - Mobile-First Responsive layout with fluid grid breakpoints (`sm: 640px`, `md: 768px`, `lg: 1024px`).
   - Full Skeleton Loaders during network fetch states to eliminate layout shifts (CLS = 0).
   - Descriptive Empty States for zero-data queries.
   - Inline and Toast Error Handling for all API failures.

---

## 3. Features Discovered Table

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1: Services | 5 Clinic Departments | Catalog of 5 university departments with metadata and clinical scope | Department ID / Filter | Department card, name (TH/EN), description, room, doctor list | Returns fallback empty list if DB unpopulated | ORIGINAL_REQUEST.md § R1 |
| 2 | R1: Services | Configurable Slot Durations | Configurable durations (15m general/vaccine, 30m certificate, 45m counseling/PT) | Service/Dept configuration | Slot intervals generated accordingly (e.g. 09:00, 09:15, 09:30) | Default to 30 min fallback on missing duration | ORIGINAL_REQUEST.md § R1 |
| 3 | R2: Schedules | Doctor Slot Management | Staff creates, updates, and removes available doctor consultation slots | `doctor_id`, `slot_date`, `start_time`, `end_time`, `duration` | Created slots in DB, rendered in schedule view | Validation error if end_time <= start_time or overlap | ORIGINAL_REQUEST.md § R2 |
| 4 | R2: Schedules | Schedule & Slot Filtering | Real-time filter by department, doctor name, and appointment date | `dept`, `searchTerm`, `selectedDate` | Filtered list of doctor cards and available slots | Displays "ไม่พบตารางแพทย์" empty state | ORIGINAL_REQUEST.md § R2, `useSchedules.ts` |
| 5 | R2: Booking | Concurrency Booking Engine | Atomic reservation of slot preventing race condition / double-booking | `slot_id`, `user_id`, `notes` | Confirmed appointment record, slot status updated to `booked` | 409 Conflict ("คิวนี้ถูกจองไปแล้ว") on race condition | ORIGINAL_REQUEST.md § R2, AC § Clinic Services |
| 6 | R2: Booking | Appointment Status State Machine | Tracks status across Pending $\rightarrow$ Confirmed $\rightarrow$ Completed / Cancelled | Appointment ID, target status, reason | Updated appointment record with status badge and history | 403 Forbidden if student updates other's status | ORIGINAL_REQUEST.md § R2 |
| 7 | R2: Booking | Appointment Cancellation & Reschedule | Allows patient or staff to cancel or reschedule prior to appointment | Appointment ID, cancellation reason | Status set to `cancelled`, slot freed for others | 400 Bad Request if cancelling past appointment | ORIGINAL_REQUEST.md § R2 |
| 8 | R3: Inventory | Medication Master Catalog | Comprehensive drug master list with trade name, generic, dosage, category | Medicine record fields | Rendered inventory table with sorting and badges | 400 Validation error on missing required fields | ORIGINAL_REQUEST.md § R3, `gun-inventory/page.tsx` |
| 9 | R3: Inventory | Stock Status Auto-Calculation | Evaluates stock quantity against min_stock to classify: Sufficient / Low / Critical | `stock_quantity`, `min_stock`, `expiry_date` | Computed status string and color badge | Defaults to "ต้องสั่งเพิ่ม" if stock <= min_stock | ORIGINAL_REQUEST.md § R3, AC § Medication |
| 10 | R3: Inventory | Debounced Inventory Search | Instant search filtering medicines by name or category with 300ms debounce | Search query string | Filtered inventory list without excessive queries | Displays empty table row if no match | ORIGINAL_REQUEST.md § R3 |
| 11 | R3: Inventory | Stock Adjustment & Full CRUD | Staff can add, edit, delete, and adjust stock quantities | Stock delta, reason, medicine ID | Updated stock balance with transaction log | 400 Bad Request if reducing stock below zero | ORIGINAL_REQUEST.md § R3 |
| 12 | R4: Reminders | Personal Medication Schedule | Patient creates custom reminders with dosage and times per day | Medicine name, dosage, frequency, time array | Saved reminder schedule, card rendered in patient dashboard | 400 Error if no scheduled time provided | ORIGINAL_REQUEST.md § R4, `glong-reminders/page.tsx` |
| 13 | R4: Reminders | Mark Taken Confirmation | Patient logs taken dose with instant timestamp recording | Reminder ID, timestamp | Insert into `medication_logs` (status='taken'), updates compliance | 400 Error on invalid log insertion | ORIGINAL_REQUEST.md § R4, AC § Medication |
| 14 | R4: Reminders | Mark Skipped with Reason | Patient logs skipped dose along with mandatory/optional reason | Reminder ID, skip reason | Insert into `medication_logs` (status='skipped'), updates compliance | 400 Error on failure to record | ORIGINAL_REQUEST.md § R4 |
| 15 | R4: Reminders | Compliance Rate Calculation | Calculates adherence percentage (taken / total scheduled) with rating tiers | Aggregated logs for patient | Adherence percentage (e.g. 92%), progress ring, status badge | Shows 100% or N/A when no scheduled doses exist | ORIGINAL_REQUEST.md § R4 |
| 16 | R5: Dashboard | Notification Center | Realtime inbox for appointment alerts, medication reminders, and announcements | User ID, unread filter | Notification dropdown/page with unread count badge | Graceful fallback if realtime socket disconnects | ORIGINAL_REQUEST.md § R5, `herb-dashboard/page.tsx` |
| 17 | R5: Dashboard | Daily Queue KPI Metric | Summarizes today's clinic appointments by status (Pending/Confirmed/Done) | Current date | KPI card with count, change trend %, and status split | Displays "0 คิว" when no appointments today | ORIGINAL_REQUEST.md § R5 |
| 18 | R5: Dashboard | Department Volume Statistics | Aggregates appointment load across all 5 clinic departments | Date range | Department distribution chart / metric list | Shows 0% for departments with zero bookings | ORIGINAL_REQUEST.md § R5 |
| 19 | R5: Dashboard | No-Show Rate Metric | Computes ratio of missed/cancelled appointments to total bookings | Appointment status counts | Calculated No-Show percentage (e.g. 4.2%) with trend | Displays 0% if total bookings is 0 | ORIGINAL_REQUEST.md § R5 |
| 20 | R5: Dashboard | Inventory Health KPI | Aggregates stock health counts (Sufficient, Low, Critical, Expired) | Medication table scan | KPI counter and breakdown list of critical items | Shows "สต็อกปกติ" if zero critical items | ORIGINAL_REQUEST.md § R5 |
| 21 | R6: Auth & RBAC | Supabase Auth Integration | Sign-up, Sign-in, Sign-out with Student vs Staff role assignment | Email, Password, Full Name, Role | JWT session token, authenticated profile state | 401 Unauthorized / Invalid credentials error toast | ORIGINAL_REQUEST.md § R6, `feem-auth/page.tsx` |
| 22 | R6: Security | Row Level Security (RLS) | Enforces PostgreSQL policies preventing cross-user health data access | `auth.uid()`, query context | Filtered dataset restricted strictly to authorized user | Returns empty array `[]` or 403 Forbidden | ORIGINAL_REQUEST.md § R6, AC § Auth |
| 23 | R6: UI/UX | Mobile-First Responsive Design | Responsive layout adapting to mobile, tablet, and desktop viewports | Screen viewport size | Dynamic fluid grid, mobile navigation bar, touch targets | Responsive CSS / no horizontal overflow | ORIGINAL_REQUEST.md § R6 |
| 24 | R6: UI/UX | Skeleton Loaders & Empty States | Shimmer skeleton cards during async fetch; clean empty states for zero results | Data loading boolean state | Animated skeleton layout $\rightarrow$ populated content / empty state | Smooth transition without layout jumps | ORIGINAL_REQUEST.md § R6 |

---

## 4. Edge Cases & Boundary Conditions

| # | Feature | Input / Scenario | Observed / Expected Behavior |
|---|---------|------------------|------------------------------|
| 1 | R2: Concurrency | Two users click "Confirm Booking" on the exact same slot at the identical millisecond ($t_0$) | Database atomic conditional update ensures exactly 1 transaction commits (`status = 'booked'`). User 1 gets 200 OK & confirmation. User 2 gets 409 Conflict error with message "คิวนี้ถูกจองไปแล้ว กรุณาเลือกช่วงเวลาอื่น", preventing double booking. |
| 2 | R2: Slot Validation | Staff sets slot `end_time` earlier than or equal to `start_time` (e.g. 10:00 - 09:30) | Form validation rejects submission immediately with error: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น". |
| 3 | R2: Booking Past Date | Patient attempts to book a slot for a past date or time that has already elapsed | API and UI disable past slots; booking attempt returns 400 Bad Request: "ไม่สามารถจองคิวย้อนหลังได้". |
| 4 | R2: Reschedule Collision | Patient attempts to reschedule into a slot that was just taken by another user during the modal open period | System re-checks slot status at commit time, rejects reschedule with conflict alert, and offers available alternative slots. |
| 5 | R3: Inventory Stock Cut | Staff tries to dispense/deduct 100 units when stock quantity is currently 40 units | Validation blocks transaction with error: "จำนวนยาในคลังไม่เพียงพอ (คงเหลือ 40 เม็ด)". |
| 6 | R3: Expiry Date Past | Staff adds or views a medicine whose `expiry_date` is in the past (e.g. 2025-12-31) | System displays red "หมดอายุแล้ว (Expired)" warning badge and prevents dispensing this batch in new appointments. |
| 7 | R3: Negative Stock | Direct API attempt to update `stock_quantity` to a negative integer (e.g. -5) | Database check constraint `CHECK (stock_quantity >= 0)` rejects update with constraint violation error. |
| 8 | R4: Compliance Zero Base | New patient has just registered medication reminders but no past doses have elapsed yet | Compliance calculator detects total scheduled doses = 0, displays "100%" or "ยังไม่มีประวัติการทาน" gracefully without `NaN` or division-by-zero crash. |
| 9 | R4: Mark Action Idempotency | Patient taps "กินแล้ว" repeatedly in quick succession (network lag / double tap) | Frontend disables button during submission; backend enforces unique constraint on `(reminder_id, scheduled_date, scheduled_time)` to prevent duplicate log entries. |
| 10 | R4: Future Dose Confirmation | Patient tries to mark "กินแล้ว" for a reminder scheduled 3 days in the future | UI restricts check-in to current day / active dose window (e.g. $\pm 2$ hours of scheduled time). |
| 11 | R5: Dashboard Zero Data | Clinic opens on Day 1 with 0 appointments, 0 notifications, and 0 stock items | Dashboard metrics render clean "0", "0%", empty state illustrations without uncaught runtime exceptions. |
| 12 | R6: Cross-User Health Data Access | User A (Student) queries Supabase REST API `GET /rest/v1/medication_logs?user_id=eq.UserB` | Supabase RLS policy `auth.uid() = user_id` filters out all User B records; User A receives an empty array `[]` with 0 records exposed. |
| 13 | R6: Unauthenticated Route Guard | Unauthenticated user navigates directly via browser URL to `/herb-dashboard` or `/pai-appointments` | Next.js middleware / client auth guard detects missing session and redirects immediately to `/feem-auth?redirect=...`. |
| 14 | R6: Role Escalation Attack | Student user sends PATCH request to update their profile `role` to `'admin'` | Supabase RLS policy prevents non-admin users from updating the `role` column in `profiles`. |

---

## 5. Acceptance Criteria & Testable Assertions

### Category 1: Authentication & Security (R6)
- **AC-AUTH-01**: Given an unauthenticated visitor, when they navigate to any protected route (e.g., `/glong-reminders`, `/herb-dashboard`, `/gun-inventory`), then the application must redirect them to `/feem-auth` without rendering private user data.
- **AC-AUTH-02**: Given a user logged in with role `Student`, when they query the `appointments` or `medication_reminders` table via Supabase SDK, then they must only receive records where `user_id = auth.uid()`.
- **AC-AUTH-03**: Given a user logged in with role `Student`, when they attempt to create/update/delete records in `medicines` or `departments`, then the operation must be rejected by RLS with an authorization error.
- **AC-AUTH-04**: Given a user logged in with role `Staff` or `Admin`, when they access `/herb-dashboard` and `/gun-inventory`, then full CRUD operations and aggregate metrics must be accessible.

### Category 2: Clinic Services & Doctor Schedules (R1, R2)
- **AC-SRV-01**: Given the schedules view, when loaded, then all 5 clinical departments (General Medicine, Mental Health, Medical Certificate, Vaccination, Physical Therapy) must be displayed with accurate metadata and slot durations (15/30/45 min).
- **AC-SCHED-01**: Given the doctor schedule list, when filtered by department, doctor name, or date, then only matching slots from the Supabase database are rendered.
- **AC-SCHED-02**: Given an empty query result, when no doctor matches the filter criteria, then a friendly empty state ("ไม่พบตารางแพทย์") is displayed.

### Category 3: Appointment Booking Engine & Concurrency (R2)
- **AC-BOOK-01**: Given an available doctor slot, when an authenticated patient selects the slot and confirms booking, then an appointment record is created in `appointments`, the slot status is updated to `booked`, and a confirmation card is displayed.
- **AC-BOOK-02 (Concurrency Test)**: Given an available slot $S_1$, when Patient A and Patient B simultaneously submit booking requests for $S_1$, then exactly 1 patient receives a success confirmation and the other patient receives an explicit conflict notification ("คิวนี้ถูกจองไปแล้ว กรุณาเลือกช่วงเวลาอื่น").
- **AC-BOOK-03**: Given a confirmed appointment, when the patient or staff clicks "ยกเลิกนัดหมาย" with a reason, then the appointment status changes to `cancelled` and the associated slot becomes available for re-booking.

### Category 4: Medication Inventory & Stock Management (R3)
- **AC-MED-01**: Given the medication inventory table, when rendered, then every medicine displays its trade name, generic name, dosage, category, expiry date, stock quantity, min stock, and computed status badge.
- **AC-MED-02**: Given a medicine with `stock_quantity = 500` and `min_stock = 100`, then its status must evaluate to `มีเพียงพอ` (Green). Given `stock_quantity = 50` and `min_stock = 100`, then its status must evaluate to `ต้องสั่งเพิ่ม` (Amber). Given `stock_quantity = 0`, then its status must evaluate to `วิกฤตใกล้หมด` (Red).
- **AC-MED-03**: Given the inventory search input, when a user types a query (e.g. "Amox"), then the search is debounced by 300ms before executing the query against the database.
- **AC-MED-04**: Given an authorized staff member, when they update the stock count or add a new medicine, then the changes must persist to Supabase immediately and update the table.

### Category 5: Personal Medication Reminders & Compliance (R4)
- **AC-REM-01**: Given an authenticated patient, when they create a medication reminder with times (e.g., 08:00, 12:00, 18:00), then the schedule persists in `medication_reminders` for that `user_id`.
- **AC-REM-02**: Given a scheduled dose, when the patient clicks "กินแล้ว (Taken)", then a new entry is inserted into `medication_logs` with `status = 'taken'` and current timestamp.
- **AC-REM-03**: Given a scheduled dose, when the patient clicks "ข้ามมื้อ (Skipped)", then a new entry is inserted into `medication_logs` with `status = 'skipped'`, reason string, and current timestamp.
- **AC-REM-04**: Given a patient with 8 taken doses and 2 skipped doses out of 10 total scheduled doses, then the Compliance Rate must calculate to exactly $80\%$ and display the appropriate tier badge.

### Category 6: Notification Center & Admin Analytics (R5)
- **AC-NOTIF-01**: Given an appointment booking or medication event, when triggered, then a notification record is generated and visible in the user's notification center in real time.
- **AC-DASH-01**: Given the Admin Dashboard, when loaded, then it aggregates and displays:
  1. Today's total queue count and breakdown.
  2. Department visit distribution across all 5 departments.
  3. Calculated clinic No-Show rate percentage.
  4. Medication inventory health breakdown (Sufficient / Low / Critical).

### Category 7: Quality, Performance & Reliability
- **AC-QUAL-01**: Every page and interactive component connects to live Supabase DB with zero hardcoded mock data for core flows.
- **AC-QUAL-02**: The application must execute with zero unhandled JavaScript runtime exceptions or React console errors.
- **AC-QUAL-03**: All interactive UI elements must render skeleton loaders during async loading states and handle network disconnection gracefully.

---

## 6. Database Schema & Relational Architecture Contract

To support R1 through R6, the Supabase PostgreSQL database requires the following relational schema:

```sql
-- 1. Profiles & Roles (R6)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'patient', 'staff', 'doctor', 'admin')),
    student_id TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Departments (R1)
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    description TEXT,
    default_slot_duration INT NOT NULL DEFAULT 15, -- in minutes: 15, 30, 45
    room_number TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Doctors (R1, R2)
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    specialty TEXT NOT NULL,
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Appointment Slots (R2)
CREATE TABLE appointment_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, slot_date, start_time)
);

-- 5. Appointments (R2)
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    slot_id INT NOT NULL REFERENCES appointment_slots(id) ON DELETE CASCADE,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    symptoms_description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Medicines & Inventory (R3)
CREATE TABLE medicines (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    category TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock INT NOT NULL DEFAULT 100 CHECK (min_stock >= 0),
    unit TEXT NOT NULL DEFAULT 'เม็ด',
    storage_location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Personal Medication Reminders (R4)
CREATE TABLE medication_reminders (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    dosage_instruction TEXT NOT NULL,
    frequency_per_day INT NOT NULL DEFAULT 1,
    scheduled_times JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["08:00", "12:00", "18:00"]
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Medication Adherence Logs (R4)
CREATE TABLE medication_logs (
    id SERIAL PRIMARY KEY,
    reminder_id INT NOT NULL REFERENCES medication_reminders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_time TIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('taken', 'skipped', 'missed')),
    reason TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Notifications (R5)
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL indicates global broadcast
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('appointment', 'medication', 'announcement', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Verification & Implementation Roadmap Recommendation

To achieve 100% compliance with course requirements and acceptance criteria, the implementation track should proceed through 5 structured milestones:

1. **Milestone 1: Database Foundation, Supabase Auth & RLS Policy Enforcement (R6, R1 schema)**
   - Deploy SQL migration scripts for all 9 tables, seed 5 departments with accurate slot durations, configure Supabase Auth hooks and strict RLS policies.
2. **Milestone 2: Realtime Doctor Schedules & Atomic Concurrency Booking Engine (R1, R2)**
   - Implement Doctor slot management, live schedule filters, atomic booking RPC / transaction logic, and appointment lifecycle state machine.
3. **Milestone 3: Medication Inventory Management & Debounced Stock Control (R3)**
   - Implement full inventory CRUD, automatic stock status calculator, near-expiry alerts, and debounced instant search.
4. **Milestone 4: Personal Medication Reminders & Compliance Adherence Engine (R4)**
   - Implement reminder scheduling, interactive "Taken/Skipped" check-ins, medication logs, and mathematical compliance rate analytics.
5. **Milestone 5: Realtime Notification Center & Executive Admin Analytics Dashboard (R5)**
   - Implement user notification inbox with Supabase Realtime, and Admin KPIs (Today's Queues, Department Stats, No-Show Rate, Inventory Health).

---
*End of Specification Analysis Document.*
