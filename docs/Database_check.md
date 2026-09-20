all table?
## Table `medications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `type` | `text` |  |
| `category` | `text` |  |
| `stock` | `int4` |  |
| `min_stock` | `int4` |  |
| `expiry_date` | `date` |  Nullable |
| `description` | `text` |  Nullable |
| `ingredients` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `is_active` | `bool` |  Nullable |
| `dosage` | `text` |  Nullable |
| `brand_name` | `text` |  Nullable |
| `manufacturer` | `text` |  Nullable |
| `mfg_date` | `date` |  Nullable |
| `coverage_type` | `text` |  Nullable |
| `unit` | `text` |  Nullable |
| `pack_unit` | `text` |  Nullable |
| `pack_size` | `numeric` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `text` |  Nullable Unique |
| `full_name` | `text` |  |
| `phone` | `text` |  Nullable |
| `emergency_phone` | `text` |  Nullable |
| `address` | `text` |  Nullable |
| `allergies` | `text` |  Nullable |
| `chronic_diseases` | `text` |  Nullable |
| `role` | `text` |  |
| `avatar_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `patient_type` | `text` |  Nullable |
| `employee_id` | `text` |  Nullable |
| `organization` | `text` |  Nullable |
| `allergy_status` | `text` |  Nullable |
| `chronic_disease_status` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `permission_version` | `int4` |  |
| `title` | `text` |  Nullable |
| `first_name` | `text` |  Nullable |
| `last_name` | `text` |  Nullable |
| `date_of_birth` | `date` |  Nullable |
| `gender` | `text` |  Nullable |
| `emergency_contact_title` | `text` |  Nullable |
| `emergency_contact_first_name` | `text` |  Nullable |
| `emergency_contact_last_name` | `text` |  Nullable |
| `emergency_contact_relationship` | `text` |  Nullable |

## Table `departments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `is_active` | `bool` |  |

## Table `doctors`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `specialty` | `text` |  Nullable |
| `department_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `appointment_slots`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `doctor_id` | `uuid` |  |
| `slot_date` | `date` |  |
| `start_time` | `time` |  |
| `end_time` | `time` |  |
| `max_capacity` | `int4` |  |
| `booked_count` | `int4` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `daily_service_offering_id` | `uuid` |  |

## Table `inventory_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `medication_id` | `uuid` |  |
| `pharmacist_id` | `uuid` |  |
| `action` | `text` |  |
| `quantity` | `int4` |  |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `dispensing_item_id` | `uuid` |  Nullable |
| `performed_by` | `uuid` |  Nullable |
| `idempotency_key` | `text` |  Nullable |

## Table `medication_reminders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `medication_id` | `uuid` |  |
| `reminder_times` | `_text` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `dispensing_item_id` | `uuid` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `confirmed_by` | `uuid` |  Nullable |
| `confirmed_at` | `timestamptz` |  Nullable |
| `locked_at` | `timestamptz` |  Nullable |
| `email_pause_until` | `timestamptz` |  Nullable |

## Table `medication_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `reminder_id` | `uuid` |  |
| `scheduled_datetime` | `timestamptz` |  |
| `actual_datetime` | `timestamptz` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `record_deadline` | `timestamptz` |  Nullable |
| `revision` | `int4` |  |

## Table `notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `type` | `text` |  |
| `title` | `text` |  |
| `message` | `text` |  |
| `is_read` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `event_key` | `text` |  Nullable |
| `read_at` | `timestamptz` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `broadcast_id` | `uuid` |  Nullable |

## Table `broadcasts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `sent_by` | `uuid` |  |
| `title` | `text` |  |
| `message` | `text` |  |
| `notification_type` | `text` |  |
| `audience` | `jsonb` |  |
| `request_key` | `text` |  |
| `sent_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `appointments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `patient_id` | `uuid` |  |
| `slot_id` | `uuid` |  |
| `queue_number` | `int4` |  |
| `reason` | `text` |  |
| `status` | `text` |  |
| `cancel_requested_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `rejection_reason` | `text` |  Nullable |

## Table `medical_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `appointment_id` | `uuid` |  Unique |
| `patient_id` | `uuid` |  |
| `doctor_id` | `uuid` |  |
| `diagnosis` | `text` |  |
| `treatment_notes` | `text` |  |
| `prescribed_medications` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `height_cm` | `numeric` |  Nullable |
| `weight_kg` | `numeric` |  Nullable |
| `blood_pressure` | `text` |  Nullable |
| `pulse_bpm` | `int4` |  Nullable |

## Table `services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `code` | `text` |  Unique |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `daily_service_offerings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `service_id` | `uuid` |  |
| `doctor_id` | `uuid` |  |
| `offering_date` | `date` |  |
| `is_active` | `bool` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `doctor_leaves`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `doctor_id` | `uuid` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  |
| `reason` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## RLS Policies

### `medical_records`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Patients can view own medical records` | SELECT | public | PERMISSIVE | `(patient_id = auth.uid())` | — |
| `Medical and staff admin can manage medical records` | ALL | authenticated | PERMISSIVE | `(get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))` | `(get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))` |

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can view own profile` | SELECT | public | PERMISSIVE | `(auth.uid() = id)` | — |
| `New users can insert own profile` | INSERT | public | PERMISSIVE | — | `(auth.uid() = id)` |
| `Staff admin and medical can view profiles` | SELECT | public | PERMISSIVE | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))` | — |
| `Staff/Admin can update profiles active status` | UPDATE | authenticated | PERMISSIVE | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'admin'::text, 'staff'::text]))` | — |
| `Anyone can view medical profiles` | SELECT | public | PERMISSIVE | `((role = 'medical'::text) OR (EXISTS ( SELECT 1    FROM doctors   WHERE (doctors.id = profiles.id))))` | — |
| `Users and staff admin update profiles` | UPDATE | public | PERMISSIVE | `((auth.uid() = id) OR is_active_staff_admin())` | `((auth.uid() = id) OR is_active_staff_admin())` |

### `appointments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Patients can view own appointments` | SELECT | authenticated | PERMISSIVE | `(patient_id = auth.uid())` | — |
| `Staff admin and medical can view appointments` | SELECT | authenticated | PERMISSIVE | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))` | — |
| `Patients can create appointments` | INSERT | authenticated | PERMISSIVE | — | `(patient_id = auth.uid())` |
| `Staff admin and medical can create appointments` | INSERT | authenticated | PERMISSIVE | — | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))` |
| `Patients can update own appointments` | UPDATE | authenticated | PERMISSIVE | `(patient_id = auth.uid())` | `(patient_id = auth.uid())` |
| `Staff admin and medical can update appointments` | UPDATE | authenticated | PERMISSIVE | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))` | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))` |

### `medications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Medical and Staff admin can manage medications` | ALL | authenticated | PERMISSIVE | `(get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text, 'doctor'::text, 'pharmacist'::text, 'staff'::text, 'admin'::text]))` | `(get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text, 'doctor'::text, 'pharmacist'::text, 'staff'::text, 'admin'::text]))` |
| `Anyone can view medications` | SELECT | public | PERMISSIVE | `true` | — |
| `Medical/Admin can manage medications` | ALL | public | PERMISSIVE | `(get_user_role() = ANY (ARRAY['admin'::text, 'medical'::text]))` | — |

### `inventory_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Medical and Staff admin can create inventory logs` | INSERT | authenticated | PERMISSIVE | — | `(get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text, 'doctor'::text, 'pharmacist'::text, 'staff'::text, 'admin'::text]))` |
| `Medical and Staff admin can view inventory logs` | SELECT | authenticated | PERMISSIVE | `(get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text, 'doctor'::text, 'pharmacist'::text, 'staff'::text, 'admin'::text]))` | — |

### `notifications`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Users can view own notifications` | SELECT | public | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Users can update own notifications` | UPDATE | public | PERMISSIVE | `(user_id = auth.uid())` | — |
| `Staff admin can create notifications` | INSERT | public | PERMISSIVE | — | `(get_user_role() = 'staff_admin'::text)` |

### `doctor_leaves`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Staff admin can manage all doctor leaves` | ALL | authenticated | PERMISSIVE | `(get_user_role() = 'staff_admin'::text)` | `(get_user_role() = 'staff_admin'::text)` |
| `Medical can manage own doctor leave` | ALL | authenticated | PERMISSIVE | `((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid()))` | `((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid()))` |

### `doctors`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Staff/Admin can manage doctors` | ALL | authenticated | PERMISSIVE | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'admin'::text, 'staff'::text]))` | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'admin'::text, 'staff'::text]))` |
| `Anyone can view doctors` | SELECT | public | PERMISSIVE | `true` | — |

### `departments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Staff/Admin can manage departments` | ALL | authenticated | PERMISSIVE | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'staff'::text, 'admin'::text]))` | `(get_user_role() = ANY (ARRAY['staff_admin'::text, 'staff'::text, 'admin'::text]))` |
| `Anyone can view departments` | SELECT | public | PERMISSIVE | `true` | — |

### `appointment_slots`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Doctors can manage own slots` | ALL | authenticated | PERMISSIVE | `((get_user_role() = ANY (ARRAY['medical'::text, 'doctor'::text])) AND (doctor_id = auth.uid()))` | `((get_user_role() = ANY (ARRAY['medical'::text, 'doctor'::text])) AND (doctor_id = auth.uid()))` |
| `Anyone can view slots` | SELECT | public | PERMISSIVE | `true` | — |
| `Staff admin and medical can manage slots` | ALL | authenticated | PERMISSIVE | `((get_user_role() = 'staff_admin'::text) OR ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid())))` | `((get_user_role() = 'staff_admin'::text) OR ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid())))` |
| `Anyone can view active service slots` | SELECT | public | PERMISSIVE | `(((auth.uid() IS NOT NULL) AND (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))) OR (EXISTS ( SELECT 1    FROM (daily_service_offerings offering      JOIN services service ON ((service.id = offering.service_id)))   WHERE ((offering.id = appointment_slots.daily_service_offering_id) AND (offering.doctor_id = appointment_slots.doctor_id) AND (offering.offering_date = appointment_slots.slot_date) AND offering.is_active AND service.is_active))))` | — |

### `medication_reminders`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Staff and medical can manage medication reminders` | ALL | authenticated | PERMISSIVE | `((get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text])) OR (user_id = auth.uid()))` | `((get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text])) OR (user_id = auth.uid()))` |

### `medication_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Staff and medical can manage medication logs` | ALL | authenticated | PERMISSIVE | `((get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text])) OR (EXISTS ( SELECT 1    FROM medication_reminders   WHERE ((medication_reminders.id = medication_logs.reminder_id) AND (medication_reminders.user_id = auth.uid())))))` | `((get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text])) OR (EXISTS ( SELECT 1    FROM medication_reminders   WHERE ((medication_reminders.id = medication_logs.reminder_id) AND (medication_reminders.user_id = auth.uid())))))` |

### `services`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Medical and staff admin can manage services` | ALL | authenticated | PERMISSIVE | `(get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))` | `(get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))` |
| `Anyone can view active services` | SELECT | public | PERMISSIVE | `(is_active OR ((auth.uid() IS NOT NULL) AND (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))))` | — |

### `daily_service_offerings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Medical and staff admin can manage daily service offerings` | ALL | authenticated | PERMISSIVE | `((get_user_role() = 'staff_admin'::text) OR ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid())))` | `((get_user_role() = 'staff_admin'::text) OR ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid())))` |
| `Anyone can view active daily service offerings` | SELECT | public | PERMISSIVE | `(is_active OR ((auth.uid() IS NOT NULL) AND (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))))` | — |




part 1
| table_name              | exists |
| ----------------------- | ------ |
| appointment_slots       | true   |
| broadcast_recipients    | false  |
| broadcasts              | true   |
| daily_service_offerings | true   |
| departments             | true   |
| doctor_leaves           | true   |
| doctors                 | true   |
| inventory_logs          | true   |
| medication_logs         | true   |
| medication_reminders    | true   |
| medications             | true   |
| notifications           | true   |
| pai_appointments        | false  |
| pai_medical_records     | false  |
| profiles                | true   |
| services                | true   |

part 2
| version        | name                            |
| -------------- | ------------------------------- |
| 20260908170000 | pai_manual_appointments_records |
| 20260908171000 | pai_restrict_new_objects        |
| 20260908171500 | pai_rejection_reason            |
| 20260908171600 | pai_workspace_rejection_reason  |
| 20260913112808 | notification_sender_lookup      |
| 20260913112951 | unread_notification_recipients  |
| 20260913135407 | notification_time_filters       |

part3
| table_name           | column_name                    | data_type                | udt_name    | is_nullable |
| -------------------- | ------------------------------ | ------------------------ | ----------- | ----------- |
| appointment_slots    | id                             | uuid                     | uuid        | NO          |
| appointment_slots    | doctor_id                      | uuid                     | uuid        | NO          |
| appointment_slots    | slot_date                      | date                     | date        | NO          |
| appointment_slots    | start_time                     | time without time zone   | time        | NO          |
| appointment_slots    | end_time                       | time without time zone   | time        | NO          |
| appointment_slots    | max_capacity                   | integer                  | int4        | NO          |
| appointment_slots    | booked_count                   | integer                  | int4        | NO          |
| appointment_slots    | status                         | text                     | text        | NO          |
| appointment_slots    | created_at                     | timestamp with time zone | timestamptz | NO          |
| appointment_slots    | updated_at                     | timestamp with time zone | timestamptz | NO          |
| appointment_slots    | daily_service_offering_id      | uuid                     | uuid        | NO          |
| broadcasts           | id                             | uuid                     | uuid        | NO          |
| broadcasts           | sent_by                        | uuid                     | uuid        | NO          |
| broadcasts           | title                          | text                     | text        | NO          |
| broadcasts           | message                        | text                     | text        | NO          |
| broadcasts           | notification_type              | text                     | text        | NO          |
| broadcasts           | audience                       | jsonb                    | jsonb       | NO          |
| broadcasts           | request_key                    | text                     | text        | NO          |
| broadcasts           | sent_at                        | timestamp with time zone | timestamptz | NO          |
| broadcasts           | created_at                     | timestamp with time zone | timestamptz | NO          |
| doctor_leaves        | id                             | uuid                     | uuid        | NO          |
| doctor_leaves        | doctor_id                      | uuid                     | uuid        | NO          |
| doctor_leaves        | start_date                     | date                     | date        | NO          |
| doctor_leaves        | end_date                       | date                     | date        | NO          |
| doctor_leaves        | reason                         | text                     | text        | YES         |
| doctor_leaves        | created_by                     | uuid                     | uuid        | YES         |
| doctor_leaves        | created_at                     | timestamp with time zone | timestamptz | NO          |
| medication_logs      | id                             | uuid                     | uuid        | NO          |
| medication_logs      | reminder_id                    | uuid                     | uuid        | NO          |
| medication_logs      | scheduled_datetime             | timestamp with time zone | timestamptz | NO          |
| medication_logs      | actual_datetime                | timestamp with time zone | timestamptz | YES         |
| medication_logs      | status                         | text                     | text        | NO          |
| medication_logs      | created_at                     | timestamp with time zone | timestamptz | NO          |
| medication_logs      | updated_at                     | timestamp with time zone | timestamptz | NO          |
| medication_logs      | record_deadline                | timestamp with time zone | timestamptz | YES         |
| medication_logs      | revision                       | integer                  | int4        | NO          |
| medication_reminders | id                             | uuid                     | uuid        | NO          |
| medication_reminders | user_id                        | uuid                     | uuid        | NO          |
| medication_reminders | medication_id                  | uuid                     | uuid        | NO          |
| medication_reminders | reminder_times                 | ARRAY                    | _text       | NO          |
| medication_reminders | start_date                     | date                     | date        | NO          |
| medication_reminders | end_date                       | date                     | date        | YES         |
| medication_reminders | status                         | text                     | text        | NO          |
| medication_reminders | created_at                     | timestamp with time zone | timestamptz | NO          |
| medication_reminders | updated_at                     | timestamp with time zone | timestamptz | NO          |
| medication_reminders | dispensing_item_id             | uuid                     | uuid        | YES         |
| medication_reminders | created_by                     | uuid                     | uuid        | YES         |
| medication_reminders | confirmed_by                   | uuid                     | uuid        | YES         |
| medication_reminders | confirmed_at                   | timestamp with time zone | timestamptz | YES         |
| medication_reminders | locked_at                      | timestamp with time zone | timestamptz | YES         |
| medication_reminders | email_pause_until              | timestamp with time zone | timestamptz | YES         |
| medications          | id                             | uuid                     | uuid        | NO          |
| medications          | name                           | text                     | text        | NO          |
| medications          | type                           | text                     | text        | NO          |
| medications          | category                       | text                     | text        | NO          |
| medications          | stock                          | integer                  | int4        | NO          |
| medications          | min_stock                      | integer                  | int4        | NO          |
| medications          | expiry_date                    | date                     | date        | YES         |
| medications          | description                    | text                     | text        | YES         |
| medications          | ingredients                    | text                     | text        | YES         |
| medications          | created_at                     | timestamp with time zone | timestamptz | NO          |
| medications          | updated_at                     | timestamp with time zone | timestamptz | NO          |
| medications          | is_active                      | boolean                  | bool        | YES         |
| medications          | dosage                         | text                     | text        | YES         |
| medications          | brand_name                     | text                     | text        | YES         |
| medications          | manufacturer                   | text                     | text        | YES         |
| medications          | mfg_date                       | date                     | date        | YES         |
| medications          | coverage_type                  | text                     | text        | YES         |
| medications          | unit                           | text                     | text        | YES         |
| medications          | pack_unit                      | text                     | text        | YES         |
| medications          | pack_size                      | numeric                  | numeric     | YES         |
| notifications        | id                             | uuid                     | uuid        | NO          |
| notifications        | user_id                        | uuid                     | uuid        | NO          |
| notifications        | type                           | text                     | text        | NO          |
| notifications        | title                          | text                     | text        | NO          |
| notifications        | message                        | text                     | text        | NO          |
| notifications        | is_read                        | boolean                  | bool        | NO          |
| notifications        | created_at                     | timestamp with time zone | timestamptz | NO          |
| notifications        | event_key                      | text                     | text        | YES         |
| notifications        | read_at                        | timestamp with time zone | timestamptz | YES         |
| notifications        | deleted_at                     | timestamp with time zone | timestamptz | YES         |
| notifications        | broadcast_id                   | uuid                     | uuid        | YES         |
| profiles             | id                             | uuid                     | uuid        | NO          |
| profiles             | student_id                     | text                     | text        | YES         |
| profiles             | full_name                      | text                     | text        | NO          |
| profiles             | phone                          | text                     | text        | YES         |
| profiles             | emergency_phone                | text                     | text        | YES         |
| profiles             | address                        | text                     | text        | YES         |
| profiles             | allergies                      | text                     | text        | YES         |
| profiles             | chronic_diseases               | text                     | text        | YES         |
| profiles             | role                           | text                     | text        | NO          |
| profiles             | avatar_url                     | text                     | text        | YES         |
| profiles             | created_at                     | timestamp with time zone | timestamptz | NO          |
| profiles             | updated_at                     | timestamp with time zone | timestamptz | NO          |
| profiles             | patient_type                   | text                     | text        | YES         |
| profiles             | employee_id                    | text                     | text        | YES         |
| profiles             | organization                   | text                     | text        | YES         |
| profiles             | allergy_status                 | text                     | text        | YES         |
| profiles             | chronic_disease_status         | text                     | text        | YES         |
| profiles             | is_active                      | boolean                  | bool        | NO          |
| profiles             | permission_version             | integer                  | int4        | NO          |
| profiles             | title                          | text                     | text        | YES         |
| profiles             | first_name                     | text                     | text        | YES         |
| profiles             | last_name                      | text                     | text        | YES         |
| profiles             | date_of_birth                  | date                     | date        | YES         |
| profiles             | gender                         | text                     | text        | YES         |
| profiles             | emergency_contact_title        | text                     | text        | YES         |
| profiles             | emergency_contact_first_name   | text                     | text        | YES         |
| profiles             | emergency_contact_last_name    | text                     | text        | YES         |
| profiles             | emergency_contact_relationship | text                     | text        | YES         |

part 4
| allergy_status | chronic_disease_status | total |
| -------------- | ---------------------- | ----- |
| no             | no                     | 1     |
| unknown        | unknown                | 1     |
| yes            | no                     | 1     |
| yes            | yes                    | 1     |
| null           | null                   | 13    |

part 5
| schema_name | table_name              | rls_enabled | force_rls |
| ----------- | ----------------------- | ----------- | --------- |
| public      | appointment_slots       | true        | false     |
| public      | broadcasts              | true        | false     |
| public      | daily_service_offerings | true        | false     |
| public      | departments             | true        | false     |
| public      | doctor_leaves           | true        | false     |
| public      | doctors                 | true        | false     |
| public      | inventory_logs          | true        | false     |
| public      | medication_logs         | true        | false     |
| public      | medication_reminders    | true        | false     |
| public      | medications             | true        | false     |
| public      | notifications           | true        | false     |
| public      | profiles                | true        | false     |
| public      | services                | true        | false     |

part 6
| schemaname | tablename               | policyname                                                 | permissive | roles           | cmd    | qual                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | with_check                                                                                                                                                                                                                                           |
| ---------- | ----------------------- | ---------------------------------------------------------- | ---------- | --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public     | appointment_slots       | Anyone can view active service slots                       | PERMISSIVE | {public}        | SELECT | (((auth.uid() IS NOT NULL) AND (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))) OR (EXISTS ( SELECT 1<br>   FROM (daily_service_offerings offering<br>     JOIN services service ON ((service.id = offering.service_id)))<br>  WHERE ((offering.id = appointment_slots.daily_service_offering_id) AND (offering.doctor_id = appointment_slots.doctor_id) AND (offering.offering_date = appointment_slots.slot_date) AND offering.is_active AND service.is_active)))) | null                                                                                                                                                                                                                                                 |
| public     | appointment_slots       | Anyone can view slots                                      | PERMISSIVE | {public}        | SELECT | true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | null                                                                                                                                                                                                                                                 |
| public     | appointment_slots       | Doctors can manage own slots                               | PERMISSIVE | {authenticated} | ALL    | ((get_user_role() = ANY (ARRAY['medical'::text, 'doctor'::text])) AND (doctor_id = auth.uid()))                                                                                                                                                                                                                                                                                                                                                                                            | ((get_user_role() = ANY (ARRAY['medical'::text, 'doctor'::text])) AND (doctor_id = auth.uid()))                                                                                                                                                      |
| public     | appointment_slots       | Staff admin and medical can manage slots                   | PERMISSIVE | {authenticated} | ALL    | ((get_user_role() = 'staff_admin'::text) OR ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid())))                                                                                                                                                                                                                                                                                                                                                                            | ((get_user_role() = 'staff_admin'::text) OR ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid())))                                                                                                                                      |
| public     | appointments            | Patients can create appointments                           | PERMISSIVE | {authenticated} | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | (patient_id = auth.uid())                                                                                                                                                                                                                            |
| public     | appointments            | Patients can update own appointments                       | PERMISSIVE | {authenticated} | UPDATE | (patient_id = auth.uid())                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | (patient_id = auth.uid())                                                                                                                                                                                                                            |
| public     | appointments            | Patients can view own appointments                         | PERMISSIVE | {authenticated} | SELECT | (patient_id = auth.uid())                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | null                                                                                                                                                                                                                                                 |
| public     | appointments            | Staff admin and medical can create appointments            | PERMISSIVE | {authenticated} | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))                                                                                                                                                                                |
| public     | appointments            | Staff admin and medical can update appointments            | PERMISSIVE | {authenticated} | UPDATE | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))                                                                                                                                                                                                                                                                                                                                                                                                                      | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))                                                                                                                                                                                |
| public     | appointments            | Staff admin and medical can view appointments              | PERMISSIVE | {authenticated} | SELECT | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))                                                                                                                                                                                                                                                                                                                                                                                                                      | null                                                                                                                                                                                                                                                 |
| public     | daily_service_offerings | Anyone can view active daily service offerings             | PERMISSIVE | {public}        | SELECT | (is_active OR ((auth.uid() IS NOT NULL) AND (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))))                                                                                                                                                                                                                                                                                                                                                                        | null                                                                                                                                                                                                                                                 |
| public     | daily_service_offerings | Medical and staff admin can manage daily service offerings | PERMISSIVE | {authenticated} | ALL    | ((get_user_role() = 'staff_admin'::text) OR ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid())))                                                                                                                                                                                                                                                                                                                                                                            | ((get_user_role() = 'staff_admin'::text) OR ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid())))                                                                                                                                      |
| public     | departments             | Anyone can view departments                                | PERMISSIVE | {public}        | SELECT | true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | null                                                                                                                                                                                                                                                 |
| public     | departments             | Staff/Admin can manage departments                         | PERMISSIVE | {authenticated} | ALL    | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'staff'::text, 'admin'::text]))                                                                                                                                                                                                                                                                                                                                                                                                         | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'staff'::text, 'admin'::text]))                                                                                                                                                                   |
| public     | doctor_leaves           | Medical can manage own doctor leave                        | PERMISSIVE | {authenticated} | ALL    | ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid()))                                                                                                                                                                                                                                                                                                                                                                                                                         | ((get_user_role() = 'medical'::text) AND (doctor_id = auth.uid()))                                                                                                                                                                                   |
| public     | doctor_leaves           | Staff admin can manage all doctor leaves                   | PERMISSIVE | {authenticated} | ALL    | (get_user_role() = 'staff_admin'::text)                                                                                                                                                                                                                                                                                                                                                                                                                                                    | (get_user_role() = 'staff_admin'::text)                                                                                                                                                                                                              |
| public     | doctors                 | Anyone can view doctors                                    | PERMISSIVE | {public}        | SELECT | true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | null                                                                                                                                                                                                                                                 |
| public     | doctors                 | Staff/Admin can manage doctors                             | PERMISSIVE | {authenticated} | ALL    | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'admin'::text, 'staff'::text]))                                                                                                                                                                                                                                                                                                                                                                                                         | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'admin'::text, 'staff'::text]))                                                                                                                                                                   |
| public     | inventory_logs          | Medical and Staff admin can create inventory logs          | PERMISSIVE | {authenticated} | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text, 'doctor'::text, 'pharmacist'::text, 'staff'::text, 'admin'::text]))                                                                                                              |
| public     | inventory_logs          | Medical and Staff admin can view inventory logs            | PERMISSIVE | {authenticated} | SELECT | (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text, 'doctor'::text, 'pharmacist'::text, 'staff'::text, 'admin'::text]))                                                                                                                                                                                                                                                                                                                                                    | null                                                                                                                                                                                                                                                 |
| public     | medical_records         | Medical and staff admin can manage medical records         | PERMISSIVE | {authenticated} | ALL    | (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))                                                                                                                                                                                                                                                                                                                                                                                                                      | (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))                                                                                                                                                                                |
| public     | medical_records         | Patients can view own medical records                      | PERMISSIVE | {public}        | SELECT | (patient_id = auth.uid())                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | null                                                                                                                                                                                                                                                 |
| public     | medication_logs         | Staff and medical can manage medication logs               | PERMISSIVE | {authenticated} | ALL    | ((get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text])) OR (EXISTS ( SELECT 1<br>   FROM medication_reminders<br>  WHERE ((medication_reminders.id = medication_logs.reminder_id) AND (medication_reminders.user_id = auth.uid())))))                                                                                                                                                                                                                                       | ((get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text])) OR (EXISTS ( SELECT 1<br>   FROM medication_reminders<br>  WHERE ((medication_reminders.id = medication_logs.reminder_id) AND (medication_reminders.user_id = auth.uid()))))) |
| public     | medication_reminders    | Staff and medical can manage medication reminders          | PERMISSIVE | {authenticated} | ALL    | ((get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text])) OR (user_id = auth.uid()))                                                                                                                                                                                                                                                                                                                                                                                          | ((get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text])) OR (user_id = auth.uid()))                                                                                                                                                    |
| public     | medications             | Anyone can view medications                                | PERMISSIVE | {public}        | SELECT | true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | null                                                                                                                                                                                                                                                 |
| public     | medications             | Medical and Staff admin can manage medications             | PERMISSIVE | {authenticated} | ALL    | (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text, 'doctor'::text, 'pharmacist'::text, 'staff'::text, 'admin'::text]))                                                                                                                                                                                                                                                                                                                                                    | (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text, 'doctor'::text, 'pharmacist'::text, 'staff'::text, 'admin'::text]))                                                                                                              |
| public     | medications             | Medical/Admin can manage medications                       | PERMISSIVE | {public}        | ALL    | (get_user_role() = ANY (ARRAY['admin'::text, 'medical'::text]))                                                                                                                                                                                                                                                                                                                                                                                                                            | null                                                                                                                                                                                                                                                 |
| public     | notifications           | Staff admin can create notifications                       | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | (get_user_role() = 'staff_admin'::text)                                                                                                                                                                                                              |
| public     | notifications           | Users can update own notifications                         | PERMISSIVE | {public}        | UPDATE | (user_id = auth.uid())                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | null                                                                                                                                                                                                                                                 |
| public     | notifications           | Users can view own notifications                           | PERMISSIVE | {public}        | SELECT | (user_id = auth.uid())                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | null                                                                                                                                                                                                                                                 |
| public     | profiles                | Anyone can view medical profiles                           | PERMISSIVE | {public}        | SELECT | ((role = 'medical'::text) OR (EXISTS ( SELECT 1<br>   FROM doctors<br>  WHERE (doctors.id = profiles.id))))                                                                                                                                                                                                                                                                                                                                                                                | null                                                                                                                                                                                                                                                 |
| public     | profiles                | New users can insert own profile                           | PERMISSIVE | {public}        | INSERT | null                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | (auth.uid() = id)                                                                                                                                                                                                                                    |
| public     | profiles                | Staff admin and medical can view profiles                  | PERMISSIVE | {public}        | SELECT | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'medical'::text]))                                                                                                                                                                                                                                                                                                                                                                                                                      | null                                                                                                                                                                                                                                                 |
| public     | profiles                | Staff/Admin can update profiles active status              | PERMISSIVE | {authenticated} | UPDATE | (get_user_role() = ANY (ARRAY['staff_admin'::text, 'admin'::text, 'staff'::text]))                                                                                                                                                                                                                                                                                                                                                                                                         | null                                                                                                                                                                                                                                                 |
| public     | profiles                | Users and staff admin update profiles                      | PERMISSIVE | {public}        | UPDATE | ((auth.uid() = id) OR is_active_staff_admin())                                                                                                                                                                                                                                                                                                                                                                                                                                             | ((auth.uid() = id) OR is_active_staff_admin())                                                                                                                                                                                                       |
| public     | profiles                | Users can view own profile                                 | PERMISSIVE | {public}        | SELECT | (auth.uid() = id)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | null                                                                                                                                                                                                                                                 |
| public     | services                | Anyone can view active services                            | PERMISSIVE | {public}        | SELECT | (is_active OR ((auth.uid() IS NOT NULL) AND (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))))                                                                                                                                                                                                                                                                                                                                                                        | null                                                                                                                                                                                                                                                 |
| public     | services                | Medical and staff admin can manage services                | PERMISSIVE | {authenticated} | ALL    | (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))                                                                                                                                                                                                                                                                                                                                                                                                                      | (get_user_role() = ANY (ARRAY['medical'::text, 'staff_admin'::text]))                                                                                                                                                                                |

part 7 
| schema_name | function_name              | arguments                                                                                                                                                                               | return_type                                                                                                                                                                                                                                                                                            |
| ----------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| public      | get_broadcast_history      | p_limit integer                                                                                                                                                                         | TABLE(id uuid, title text, message text, sent_at timestamp with time zone, recipient_count bigint)                                                                                                                                                                                                     |
| public      | get_broadcast_history      | p_limit integer, p_start_at timestamp with time zone, p_end_at timestamp with time zone                                                                                                 | TABLE(id uuid, title text, message text, sent_at timestamp with time zone, recipient_count bigint, read_count bigint, role_read_counts jsonb)                                                                                                                                                          |
| public      | get_schedule_slots         |                                                                                                                                                                                         | TABLE(id uuid, doctor_id uuid, daily_service_offering_id uuid, service_id uuid, slot_date date, start_time time without time zone, end_time time without time zone, max_capacity integer, booked_count integer, status text, created_at timestamp with time zone, updated_at timestamp with time zone) |
| public      | pai_book_appointment       | p_slot_id uuid, p_reason text                                                                                                                                                           | uuid                                                                                                                                                                                                                                                                                                   |
| public      | pai_save_record            | p_appointment_id uuid, p_diagnosis text, p_advice text, p_prescriptions jsonb, p_complete boolean                                                                                       | uuid                                                                                                                                                                                                                                                                                                   |
| public      | pai_save_record            | p_appointment_id uuid, p_diagnosis text, p_advice text, p_prescriptions jsonb, p_height_cm numeric, p_weight_kg numeric, p_blood_pressure text, p_pulse_bpm integer, p_complete boolean | uuid                                                                                                                                                                                                                                                                                                   |
| public      | pai_transition_appointment | p_appointment_id uuid, p_action text                                                                                                                                                    | void                                                                                                                                                                                                                                                                                                   |
| public      | pai_transition_appointment | p_appointment_id uuid, p_action text, p_reason text                                                                                                                                     | void                                                                                                                                                                                                                                                                                                   |
| public      | pai_workspace              |                                                                                                                                                                                         | jsonb                                                                                                                                                                                                                                                                                                  |
| public      | send_broadcast             | p_title text, p_message text, p_request_key text                                                                                                                                        | TABLE(recipient_count integer, created boolean)                                                                                                                                                                                                                                                        |

part 8
Failed to run sql query: ERROR:  42P01: relation "public.pai_appointments" does not exist
LINE 3: FROM public.pai_appointments a
             ^

part 9
Failed to run sql query: ERROR:  42P01: relation "public.pai_appointments" does not exist
LINE 3: FROM public.pai_appointments
             ^