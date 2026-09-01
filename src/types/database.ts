// Types generated from Supabase SQL schema
// ตรงกับ SQL.md — 11 ตาราง

export type UserRole = 'patient' | 'staff' | 'doctor' | 'pharmacist' | 'admin';

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rejected';

export type SlotStatus = 'available' | 'full' | 'closed';

export type MedicationReminderStatus = 'active' | 'completed' | 'paused';

export type MedicationLogStatus = 'pending' | 'taken' | 'missed';

export type NotificationType = 'reminder' | 'appointment' | 'broadcast' | 'system';

export type InventoryAction = 'add' | 'dispense' | 'adjust' | 'damage';

// ----- Table Interfaces -----

export interface Profile {
  id: string;
  student_id: string | null;
  full_name: string;
  phone: string | null;
  emergency_phone: string | null;
  address: string | null;
  allergies: string | null;
  chronic_diseases: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string; // FK → profiles.id
  specialty: string | null;
  department_id: string | null; // FK → departments.id
  created_at: string;
  updated_at: string;
}

export interface AppointmentSlot {
  id: string;
  doctor_id: string; // FK → doctors.id
  slot_date: string; // DATE
  start_time: string; // TIME
  end_time: string; // TIME
  max_capacity: number;
  booked_count: number;
  status: SlotStatus;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  user_id: string; // FK → profiles.id (patient)
  slot_id: string; // FK → appointment_slots.id
  queue_number: number | null;
  reason: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface PrescribedMedication {
  medication_id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  quantity: number;
}

export interface MedicalRecord {
  id: string;
  appointment_id: string; // FK → appointments.id
  patient_id: string; // FK → profiles.id
  doctor_id: string; // FK → doctors.id
  diagnosis: string | null;
  treatment_notes: string | null;
  prescribed_medications: PrescribedMedication[] | null; // JSONB
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  name: string;
  type: string; // เม็ด, แคปซูล, น้ำ
  category: string;
  stock: number;
  min_stock: number;
  expiry_date: string | null; // DATE
  description: string | null;
  ingredients: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryLog {
  id: string;
  medication_id: string; // FK → medications.id
  pharmacist_id: string; // FK → profiles.id
  action: InventoryAction;
  quantity: number;
  reason: string | null;
  created_at: string;
}

export interface MedicationReminder {
  id: string;
  user_id: string; // FK → profiles.id
  medication_id: string; // FK → medications.id
  reminder_times: string[]; // text[] e.g. ['08:00', '12:00', '18:00']
  start_date: string; // DATE
  end_date: string | null; // DATE
  status: MedicationReminderStatus;
  created_at: string;
  updated_at: string;
}

export interface MedicationLog {
  id: string;
  reminder_id: string; // FK → medication_reminders.id
  scheduled_datetime: string; // TIMESTAMPTZ
  actual_datetime: string | null; // TIMESTAMPTZ
  status: MedicationLogStatus;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string; // FK → profiles.id
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ----- Joined / Extended Types -----

export interface DoctorWithProfile extends Doctor {
  profile?: Profile;
  department?: Department;
}

export interface AppointmentSlotWithDoctor extends AppointmentSlot {
  doctor?: DoctorWithProfile;
}

export interface AppointmentWithDetails extends Appointment {
  slot?: AppointmentSlotWithDoctor;
  patient?: Profile;
}

export interface MedicalRecordWithDetails extends MedicalRecord {
  appointment?: Appointment;
  patient?: Profile;
  doctor?: DoctorWithProfile;
}

export interface MedicationReminderWithMedication extends MedicationReminder {
  medication?: Medication;
}
