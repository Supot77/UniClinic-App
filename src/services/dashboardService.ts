// 👤 รับผิดชอบโดย: เฮิร์บ
// ระบบศูนย์แจ้งเตือนและแดชบอร์ด

import { createClient } from '@/utils/supabase/client';
import type {
  Appointment,
  AppointmentSlot,
  AppointmentStatus,
  DailyServiceOffering,
  Department,
  Doctor,
  MedicalRecord,
  Medication,
  MedicationLog,
  MedicationReminder,
  Notification,
  NotificationType,
  Profile,
  Service,
  UnreadNotificationRecipient,
  UserRole,
} from '@/types/database';
import {
  dashboardRangeLabels,
  type BroadcastHistoryItem,
  type DashboardMetric,
  type DashboardRange,
  type DashboardView,
} from '@/features/dashboard/types';
import { CLINIC_TIME_BLOCKS } from '@/constants/dateTime';

const supabase = createClient();

interface SendBroadcastResult {
  recipientCount: number;
  created: boolean;
}

interface BroadcastRpcRow {
  recipient_count: number;
  created: boolean;
}

export interface NotificationDateRange {
  startAt: string;
  endAt: string;
}

interface BroadcastHistoryRpcRow {
  id: string;
  title: string;
  message: string;
  sent_at: string;
  recipient_count: number;
  read_count?: number;
  role_read_counts?: Partial<Record<'patient' | 'medical' | 'staff_admin', { read: number; total: number }>>;
}

type NotificationRow = Omit<Notification, 'is_read'>;

function toNotification(row: NotificationRow): Notification {
  return { ...row, is_read: Boolean(row.read_at) };
}

export interface MedicationAlertItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  expiryDate: string | null;
  isLowStock: boolean;
  isExpired: boolean;
}

export interface MedicationDashboardData {
  lowStockCount: number;
  expiredCount: number;
  alerts: MedicationAlertItem[];
}

export interface StaffProfileDirectoryItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

// --- Notifications ---
export async function getNotifications(userId: string, limit = 20, dateRange?: NotificationDateRange): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('id, user_id, type, title, message, event_key, broadcast_id, read_at, deleted_at, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (dateRange) query = query.gte('created_at', dateRange.startAt).lte('created_at', dateRange.endAt);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  const notifications = ((data ?? []) as NotificationRow[]).map(toNotification);
  const broadcastIds = notifications.map((item) => item.broadcast_id).filter((id): id is string => Boolean(id));
  if (broadcastIds.length === 0) return notifications;

  const { data: senders, error: senderError } = await supabase.rpc('get_notification_senders', {
    p_notification_ids: notifications.map((item) => item.id),
  });
  if (senderError) {
    // Keep the inbox usable until the sender lookup migration is applied.
    return notifications;
  }

  const senderByNotification = new Map(((senders ?? []) as Array<{
    notification_id: string;
    sender_name: string | null;
    sender_role: UserRole | null;
  }>).map((item) => [item.notification_id, item]));
  return notifications.map((item) => ({ ...item, ...senderByNotification.get(item.id) }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function requestPatientAppointmentCancellation(appointmentId: string): Promise<void> {
  const { error } = await supabase.rpc('pai_transition_appointment', {
    p_appointment_id: appointmentId,
    p_action: 'request_cancel',
    p_reason: null,
  });
  if (error) throw error;
}

export async function recordPatientMedicationTaken(reminderId: string, scheduledAt: string): Promise<void> {
  const { error } = await supabase
    .from('medication_logs')
    .upsert({
      reminder_id: reminderId,
      scheduled_datetime: scheduledAt,
      actual_datetime: new Date().toISOString(),
      status: 'taken',
    }, { onConflict: 'reminder_id,scheduled_datetime' })
    .select()
    .single();
  if (error) throw error;
}

export async function getUnreadNotificationRecipients(limit = 100, dateRange?: NotificationDateRange): Promise<UnreadNotificationRecipient[]> {
  const params: { p_limit: number; p_start_at?: string; p_end_at?: string } = { p_limit: limit };
  if (dateRange) {
    params.p_start_at = dateRange.startAt;
    params.p_end_at = dateRange.endAt;
  }
  const { data, error } = await supabase.rpc('get_unread_notification_recipients', params);
  if (error) throw error;
  return (data ?? []) as UnreadNotificationRecipient[];
}

export async function markAsRead(notificationId: string): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select('id, user_id, type, title, message, event_key, broadcast_id, read_at, deleted_at, created_at')
    .single();
  if (error) throw error;
  return toNotification(data as NotificationRow);
}

export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .is('read_at', null);
  if (error) throw error;
}

export async function deleteNotification(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function sendBroadcast(
  title: string,
  message: string,
  requestKey: string,
): Promise<SendBroadcastResult> {
  const { data, error } = await supabase.rpc('send_broadcast', {
    p_title: title,
    p_message: message,
    p_request_key: requestKey,
  });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as BroadcastRpcRow | null;
  if (!row) throw new Error('ส่งประกาศไม่สำเร็จ');

  return { recipientCount: row.recipient_count, created: row.created };
}

export async function getBroadcastHistory(limit = 20, dateRange?: NotificationDateRange): Promise<BroadcastHistoryItem[]> {
  const params: { p_limit: number; p_start_at?: string; p_end_at?: string } = { p_limit: limit };
  if (dateRange) {
    params.p_start_at = dateRange.startAt;
    params.p_end_at = dateRange.endAt;
  }
  const { data, error } = await supabase.rpc('get_broadcast_history', params);
  if (error) throw error;

  return ((data ?? []) as BroadcastHistoryRpcRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    sentAt: row.sent_at,
    recipientCount: row.recipient_count,
    readCount: row.read_count ?? 0,
    roleReadCounts: row.role_read_counts ?? {},
  }));
}

export async function getStaffProfileDirectory(): Promise<StaffProfileDirectoryItem[]> {
  const { data, error } = await supabase.rpc('get_staff_profile_directory');
  if (error) {
    if (error.code === 'PGRST202') {
      throw new Error('ยังไม่ได้ติดตั้ง RPC get_staff_profile_directory กรุณารัน supabase/migrations/12_staff_profile_directory.sql ใน Supabase SQL Editor');
    }
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    role: UserRole;
    is_active: boolean | null;
    created_at?: string | null;
  }>).map((profile) => ({
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    isActive: profile.is_active !== false,
    createdAt: profile.created_at ?? '',
  }));
}

type DashboardProfile = Pick<Profile, 'id' | 'full_name' | 'role' | 'is_active' | 'gender'>;
type DashboardPatientProfile = Pick<Profile, 'phone' | 'patient_type' | 'student_id' | 'employee_id' | 'allergy_status' | 'allergies' | 'chronic_disease_status' | 'chronic_diseases'>;
type DashboardDepartment = Pick<Department, 'id' | 'name' | 'is_active'>;
type DashboardDoctor = Pick<Doctor, 'id' | 'department_id'>;
type DashboardSlot = Pick<AppointmentSlot, 'id' | 'doctor_id' | 'daily_service_offering_id' | 'slot_date' | 'start_time' | 'max_capacity' | 'status'>;
type DashboardServiceOffering = Pick<DailyServiceOffering, 'id' | 'service_id'>;
type DashboardService = Pick<Service, 'id' | 'name'>;
type DashboardAppointment = Pick<Appointment, 'id' | 'slot_id' | 'queue_number' | 'status' | 'cancel_requested_at'> & {
  patient_id?: string;
  user_id?: string;
};
type DashboardMedication = Pick<Medication, 'id' | 'name' | 'dosage' | 'type' | 'description' | 'stock' | 'min_stock' | 'expiry_date' | 'is_active'>;
type DashboardReminder = Pick<MedicationReminder, 'id' | 'user_id' | 'medication_id' | 'reminder_times' | 'start_date' | 'end_date' | 'status'>;
type DashboardMedicationLog = Pick<MedicationLog, 'id' | 'reminder_id' | 'scheduled_datetime' | 'actual_datetime' | 'status'>;
type DashboardMedicalRecord = Pick<MedicalRecord, 'id' | 'appointment_id' | 'patient_id' | 'doctor_id' | 'diagnosis' | 'treatment_notes' | 'prescribed_medications' | 'created_at'> & {
  appointment?: { status?: AppointmentStatus | null } | null;
};
type DashboardDoctorStatus = NonNullable<DashboardView['doctorStatuses']>[number];
type DashboardDoctorLeave = { doctor_id: string; start_date: string; end_date: string };

const activeAppointmentStatuses: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'no_show'];
const patientAppointmentStatuses: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
const clinicAppointmentStatuses: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed'];

function subtractDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function toBangkokDate(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function toBangkokMinute(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
}

function bangkokTime(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
}

function isClinicOpenAt(date: string, time: string): boolean {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return CLINIC_TIME_BLOCKS.some((block) => time >= block.startTime && time < block.endTime);
}

function isUpcomingToday(slotDate: string | undefined, startTime: string | undefined, today: string, currentTime: string): boolean {
  if (slotDate !== today || !startTime) return false;
  return currentTime < startTime.slice(0, 5);
}

function isUpcomingAppointment(slotDate: string | undefined, startTime: string | undefined, today: string, currentTime: string): boolean {
  if (!slotDate || !startTime) return false;
  if (slotDate > today) return true;
  if (slotDate < today) return false;
  return currentTime < startTime.slice(0, 5);
}

function nextReminderTime(reminderTimes: string[], currentTime: string): string | null {
  const times = reminderTimes.map((time) => time.slice(0, 5)).filter(Boolean).sort();
  return times.find((time) => time > currentTime) ?? times[0] ?? null;
}

function throwQueryError(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string
) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, message })
    .select()
    .single();
  if (error) throw error;
  return data;
}

function getBangkokDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export async function getMedicationDashboardData(): Promise<MedicationDashboardData> {
  const { data, error } = await supabase
    .from('medications')
    .select('id, name, stock, min_stock, expiry_date')
    .eq('is_active', true)
    .order('stock', { ascending: true });

  if (error) throw new Error(error.message);

  const today = getBangkokDate();
  const alerts = (data ?? [])
    .map((medication): MedicationAlertItem => ({
      id: medication.id,
      name: medication.name,
      stock: medication.stock,
      minStock: medication.min_stock,
      expiryDate: medication.expiry_date,
      isLowStock: medication.stock <= medication.min_stock,
      isExpired: Boolean(medication.expiry_date && medication.expiry_date < today),
    }))
    .filter(({ isLowStock, isExpired }) => isLowStock || isExpired)
    .sort((a, b) => Number(b.isExpired) - Number(a.isExpired) || a.stock - b.stock);

  return {
    lowStockCount: alerts.filter(({ isLowStock }) => isLowStock).length,
    expiredCount: alerts.filter(({ isExpired }) => isExpired).length,
    alerts,
  };
}

// --- Dashboard Stats ---
export async function getDashboardView(
  role: UserRole,
  actorId: string,
  today: string,
  range: DashboardRange,
): Promise<DashboardView> {
  const rangeDays: Record<DashboardRange, number> = { today: 1, '7d': 7, '30d': 30 };
  const startDate = subtractDays(today, rangeDays[range] - 1);
  const futureAppointmentEndDate = addDays(today, 365);

  const futureSlotsPromise = role === 'patient'
    ? supabase
      .from('appointment_slots')
      .select('id, doctor_id, daily_service_offering_id, slot_date, start_time, max_capacity, status')
      .gte('slot_date', today)
      .lte('slot_date', futureAppointmentEndDate)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(365)
    : Promise.resolve({ data: [] as DashboardSlot[], error: null });
  const patientProfilePromise = role === 'patient'
    ? supabase
      .from('profiles')
      .select('phone, patient_type, student_id, employee_id, allergy_status, allergies, chronic_disease_status, chronic_diseases')
      .eq('id', actorId)
    : Promise.resolve({ data: [] as DashboardPatientProfile[], error: null });
  const patientServiceOfferingsPromise = role === 'patient'
    ? supabase.from('daily_service_offerings').select('id, service_id')
    : Promise.resolve({ data: [] as DashboardServiceOffering[], error: null });
  const patientServicesPromise = role === 'patient'
    ? supabase.from('services').select('id, name')
    : Promise.resolve({ data: [] as DashboardService[], error: null });
  const doctorLeavesPromise = role === 'staff_admin'
    ? supabase
      .from('doctor_leaves')
      .select('doctor_id, start_date, end_date')
      .lte('start_date', today)
      .gte('end_date', today)
    : Promise.resolve({ data: [] as DashboardDoctorLeave[], error: null });

  const [profilesResult, departmentsResult, doctorsResult, slotsResult, futureSlotsResult, notifications, patientProfileResult, patientServiceOfferingsResult, patientServicesResult, doctorLeavesResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, is_active, gender'),
    supabase.from('departments').select('id, name, is_active'),
    supabase.from('doctors').select('id, department_id'),
    supabase
      .from('appointment_slots')
      .select('id, doctor_id, daily_service_offering_id, slot_date, start_time, max_capacity, status')
      .gte('slot_date', startDate)
      .lte('slot_date', today),
    futureSlotsPromise,
    getNotifications(actorId, 100),
    patientProfilePromise,
    patientServiceOfferingsPromise,
    patientServicesPromise,
    doctorLeavesPromise,
  ]);

  throwQueryError('โหลดบัญชีไม่สำเร็จ', profilesResult.error);
  throwQueryError('โหลดแผนกไม่สำเร็จ', departmentsResult.error);
  throwQueryError('โหลดข้อมูลแพทย์ไม่สำเร็จ', doctorsResult.error);
  throwQueryError('โหลดรอบตรวจไม่สำเร็จ', slotsResult.error);
  throwQueryError('โหลดนัดหมายถัดไปไม่สำเร็จ', futureSlotsResult.error);
  throwQueryError('โหลดโปรไฟล์สุขภาพไม่สำเร็จ', patientProfileResult.error);
  throwQueryError('โหลดบริการไม่สำเร็จ', patientServiceOfferingsResult.error);
  throwQueryError('โหลดรายการบริการไม่สำเร็จ', patientServicesResult.error);
  throwQueryError('โหลดวันลาแพทย์ไม่สำเร็จ', doctorLeavesResult.error);

  const profiles = (profilesResult.data ?? []) as DashboardProfile[];
  const departments = (departmentsResult.data ?? []) as DashboardDepartment[];
  const doctors = (doctorsResult.data ?? []) as DashboardDoctor[];
  const allRangeSlots = (slotsResult.data ?? []) as DashboardSlot[];
  const futureSlots = (futureSlotsResult.data ?? []) as DashboardSlot[];
  const patientServiceOfferings = (patientServiceOfferingsResult.data ?? []) as DashboardServiceOffering[];
  const patientServices = (patientServicesResult.data ?? []) as DashboardService[];
  const doctorLeaves = (doctorLeavesResult.data ?? []) as DashboardDoctorLeave[];
  const patientProfile = role === 'patient'
    ? ((patientProfileResult.data ?? [])[0] as DashboardPatientProfile | undefined) ?? null
    : null;
  const actor = profiles.find((profile) => profile.id === actorId);

  if (!actor || actor.role !== role || actor.is_active === false) {
    throw new Error('บัญชีที่เข้าสู่ระบบไม่มีสิทธิ์เปิด Dashboard ของบทบาทนี้');
  }

  const isDoctorActor = role === 'medical' && doctors.some((doctor) => doctor.id === actorId);
  const scopedSlots = isDoctorActor
    ? allRangeSlots.filter((slot) => slot.doctor_id === actorId)
    : allRangeSlots;
  const scopedSlotIds = scopedSlots.map((slot) => slot.id);

  let appointments: DashboardAppointment[] = [];
  const futureAppointments: DashboardAppointment[] = [];
  let patientAppointmentSlots: DashboardSlot[] = [];
  if (role === 'patient') {
    const appointmentResult = await supabase
      .from('appointments')
      .select('id, patient_id, slot_id, queue_number, status, cancel_requested_at')
      .eq('patient_id', actorId);
    throwQueryError('โหลดนัดหมายไม่สำเร็จ', appointmentResult.error);
    appointments = (appointmentResult.data ?? []) as DashboardAppointment[];

    const knownSlotIds = new Set([...allRangeSlots, ...futureSlots].map((slot) => slot.id));
    const missingSlotIds = appointments.map((appointment) => appointment.slot_id).filter((slotId) => !knownSlotIds.has(slotId));
    if (missingSlotIds.length > 0) {
      const appointmentSlotsResult = await supabase
        .from('appointment_slots')
        .select('id, doctor_id, daily_service_offering_id, slot_date, start_time, max_capacity, status')
        .in('id', missingSlotIds);
      throwQueryError('โหลดรอบตรวจของนัดหมายไม่สำเร็จ', appointmentSlotsResult.error);
      patientAppointmentSlots = (appointmentSlotsResult.data ?? []) as DashboardSlot[];
    }
  } else if (scopedSlotIds.length > 0) {
    const appointmentQuery = supabase
      .from('appointments')
      .select('id, patient_id, slot_id, queue_number, status, cancel_requested_at')
      .in('slot_id', scopedSlotIds);
    const appointmentResult = await appointmentQuery;
    throwQueryError('โหลดนัดหมายไม่สำเร็จ', appointmentResult.error);
    appointments = (appointmentResult.data ?? []) as DashboardAppointment[];
  }

  const medicationPromise = supabase
    .from('medications')
    .select('id, name, type, description, stock, min_stock, expiry_date, is_active');
  const reminderPromise = role === 'patient'
    ? supabase.from('medication_reminders').select('id, user_id, medication_id, reminder_times, start_date, end_date, status').eq('user_id', actorId)
    : Promise.resolve({ data: [] as DashboardReminder[], error: null });
  const medicalRecordPromise = role === 'medical' && !isDoctorActor
    ? supabase.from('medical_records').select('id, appointment_id, patient_id, doctor_id, diagnosis, treatment_notes, prescribed_medications, created_at')
    : role === 'patient'
      ? supabase.from('medical_records').select('id, appointment_id, patient_id, doctor_id, diagnosis, treatment_notes, prescribed_medications, created_at, appointment:appointments!inner(status)').eq('patient_id', actorId)
    : Promise.resolve({ data: [] as DashboardMedicalRecord[], error: null });

  const [medicationsResult, remindersResult, medicalRecordsResult] = await Promise.all([
    medicationPromise,
    reminderPromise,
    medicalRecordPromise,
  ]);
  throwQueryError('โหลดยาไม่สำเร็จ', medicationsResult.error);
  throwQueryError('โหลดรายการเตือนไม่สำเร็จ', remindersResult.error);
  throwQueryError('โหลดรายการจ่ายยาไม่สำเร็จ', medicalRecordsResult.error);

  const medications = (medicationsResult.data ?? []) as DashboardMedication[];
  const reminders = (remindersResult.data ?? []) as DashboardReminder[];
  const medicalRecords = (medicalRecordsResult.data ?? []) as DashboardMedicalRecord[];
  let medicationLogs: DashboardMedicationLog[] = [];
  const activeReminderIds = reminders.filter((reminder) => reminder.status === 'active').map((reminder) => reminder.id);
  if (role === 'patient' && activeReminderIds.length > 0) {
    const medicationLogsResult = await supabase
      .from('medication_logs')
      .select('id, reminder_id, scheduled_datetime, actual_datetime, status')
      .in('reminder_id', activeReminderIds)
      .order('scheduled_datetime', { ascending: true });
    throwQueryError('โหลดประวัติการทานยาไม่สำเร็จ', medicationLogsResult.error);
    medicationLogs = (medicationLogsResult.data ?? []) as DashboardMedicationLog[];
  }
  const activeAppointments = appointments.filter((appointment) => activeAppointmentStatuses.includes(appointment.status));
  const clinicAppointments = appointments.filter((appointment) => clinicAppointmentStatuses.includes(appointment.status));
  const servedAppointmentCount = clinicAppointments.filter((appointment) => appointment.status === 'in_progress' || appointment.status === 'completed').length;
  const queueRemaining = activeAppointments.filter((appointment) => appointment.status === 'confirmed' || appointment.status === 'in_progress').length;
  const inProgressInRange = activeAppointments.filter((appointment) => appointment.status === 'in_progress').length;
  const completedInRange = activeAppointments.filter((appointment) => appointment.status === 'completed').length;
  const currentBangkokTime = bangkokTime();
  const statusAppointments = role === 'staff_admin'
    ? appointments
    : role === 'patient'
      ? appointments.filter((appointment) => {
          if (!patientAppointmentStatuses.includes(appointment.status)) return false;
          if (range !== 'today') return true;
          const slot = scopedSlots.find((candidate) => candidate.id === appointment.slot_id);
          return isUpcomingToday(slot?.slot_date, slot?.start_time, today, currentBangkokTime);
        })
    : range === 'today'
      ? activeAppointments.filter((appointment) => {
          const slot = scopedSlots.find((candidate) => candidate.id === appointment.slot_id);
          return isUpcomingToday(slot?.slot_date, slot?.start_time, today, currentBangkokTime);
        })
      : activeAppointments;
  const rangeNotifications = notifications.filter((notification) => {
    const notificationDate = toBangkokDate(notification.created_at);
    return notificationDate >= startDate && notificationDate <= today;
  });
  const unreadNotifications = rangeNotifications.filter((notification) => !notification.is_read).length;
  const activeMedications = medications.filter((medication) => medication.is_active !== false);
  const lowStock = activeMedications.filter((medication) => medication.stock <= medication.min_stock && (!medication.expiry_date || medication.expiry_date >= today));
  const expired = activeMedications.filter((medication) => Boolean(medication.expiry_date && medication.expiry_date < today));
  const activeReminders = reminders.filter((reminder) => reminder.status === 'active');
  const patientMedicationIds = new Set(activeReminders.map((reminder) => reminder.medication_id));
  const slotsForUpcoming = [...scopedSlots, ...futureSlots, ...patientAppointmentSlots];
  const upcomingPatientAppointmentCount = role === 'patient'
    ? [...activeAppointments, ...futureAppointments].filter((appointment) => {
        const slot = slotsForUpcoming.find((candidate) => candidate.id === appointment.slot_id);
        return (appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'in_progress')
          && isUpcomingAppointment(slot?.slot_date, slot?.start_time, today, currentBangkokTime);
      }).length
    : 0;
  const pendingDispensing = medicalRecords.filter((record) => {
    const medications = record.prescribed_medications ?? [];
    return medications.length > 0 && medications.some((medication) => !medication.dispensed);
  }).length;
  const activeProfiles = profiles.filter((profile) => profile.is_active !== false);
  const activePatientProfiles = activeProfiles.filter((profile) => profile.role === 'patient');
  const activeDoctorProfileIds = new Set(doctors.map((doctor) => doctor.id));
  const activeDoctorProfiles = activeProfiles.filter((profile) => activeDoctorProfileIds.has(profile.id));
  const genderLabels = {
    male: 'ผู้ชาย',
    female: 'ผู้หญิง',
    unspecified: 'ไม่ระบุเพศ',
  } as const;
  const buildGenderCounts = (genderProfiles: DashboardProfile[]) => {
    const total = genderProfiles.length;
    return (['male', 'female', 'unspecified'] as const).map((gender) => {
      const count = genderProfiles.filter((profile) => (profile.gender ?? 'unspecified') === gender).length;
      return {
        gender,
        label: genderLabels[gender],
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      };
    });
  };
  const patientGenderCounts = buildGenderCounts(activePatientProfiles);
  const doctorGenderCounts = buildGenderCounts(activeDoctorProfiles);
  const rangeSuffix = range === 'today' ? dashboardRangeLabels[range] : ` ${dashboardRangeLabels[range]}`;
  const metric = (value: number | string, id: string, label: string, description: string, href: string, tone: DashboardMetric['tone']): DashboardMetric => ({
    id, value, label, description, href, tone,
  });

  const metricsByRole: Record<UserRole, DashboardMetric[]> = {
    staff_admin: [
      metric(activeAppointments.length, 'appointments-in-range', `นัดหมาย${rangeSuffix}`, 'ไม่รวมรายการยกเลิกและปฏิเสธ', '/appointments', 'blue'),
      metric(queueRemaining, 'remaining-queue', range === 'today' ? 'คิวที่เหลือ' : 'คิวในช่วงที่เลือก', 'ยืนยันแล้วและกำลังตรวจ', '/appointments', 'amber'),
    ],
    medical: isDoctorActor
      ? [
          metric(activeAppointments.length, 'own-appointments', `นัดของฉัน${rangeSuffix}`, 'เฉพาะตารางแพทย์ที่เข้าสู่ระบบ', '/appointments', 'blue'),
          metric(queueRemaining, 'own-queue', range === 'today' ? 'คิวของฉันที่เหลือ' : 'คิวของฉันในช่วงที่เลือก', 'ยืนยันแล้วและกำลังตรวจ', '/appointments', 'amber'),
          metric(inProgressInRange, 'in-progress-in-range', `กำลังตรวจ${rangeSuffix}`, 'นัดหมายที่กำลังตรวจ', '/appointments', 'violet'),
          metric(completedInRange, 'completed-in-range', `ตรวจเสร็จ${rangeSuffix}`, 'นับสถานะเสร็จสิ้น', '/appointments', 'emerald'),
        ]
      : [
          metric(activeAppointments.length, 'appointments-in-range', `นัดหมาย${rangeSuffix}`, 'ข้อมูลนัดที่บันทึกแล้ว', '/appointments', 'blue'),
          metric(pendingDispensing, 'pending-dispensing', 'รอจ่ายยา', 'ใบสั่งยาที่มีรายการยา', '/pharmacy', 'amber'),
          metric(lowStock.length, 'low-stock', 'ยาใกล้หมด', 'สต๊อกต่ำกว่าหรือเท่าจุดสั่งซื้อ', '/pharmacy', 'rose'),
          metric(expired.length, 'expired', 'ยาหมดอายุ', 'แยกออกจากรายการยาใกล้หมด', '/pharmacy', 'violet'),
    ],
    patient: [
      metric(patientMedicationIds.size, 'my-medications', 'ยาที่กำลังใช้', 'นับจากรายการเตือนยาที่ใช้งาน', '/reminders', 'violet'),
      metric(upcomingPatientAppointmentCount, 'next-appointment', 'นัดหมายถัดไป', 'นัดหมายที่กำลังจะถึง', '/appointments', 'blue'),
      metric(unreadNotifications, 'unread-notifications', 'การแจ้งเตือน', 'ข้อความของบัญชีนี้ที่ยังไม่ได้อ่าน', '/notifications', 'emerald'),
    ],
  };

  const slotsById = new Map([...scopedSlots, ...futureSlots, ...patientAppointmentSlots].map((slot) => [slot.id, slot]));
  const doctorsById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const departmentsById = new Map(departments.map((department) => [department.id, department]));
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const serviceOfferingsById = new Map(patientServiceOfferings.map((offering) => [offering.id, offering]));
  const servicesById = new Map(patientServices.map((service) => [service.id, service]));
  const mapAppointment = (appointment: DashboardAppointment) => {
      const slot = slotsById.get(appointment.slot_id);
      const doctor = slot ? doctorsById.get(slot.doctor_id) : undefined;
      return {
        id: appointment.id,
        queueNumber: appointment.queue_number,
        date: slot?.slot_date ?? '',
        startTime: slot?.start_time?.slice(0, 5) ?? '',
        status: appointment.status,
        cancelRequestedAt: appointment.cancel_requested_at ?? null,
        patientName: profilesById.get(appointment.patient_id ?? appointment.user_id ?? '')?.full_name ?? 'ไม่พบบัญชีผู้ป่วย',
        doctorName: slot ? profilesById.get(slot.doctor_id)?.full_name ?? 'ไม่พบแพทย์' : 'ไม่พบแพทย์',
        departmentName: doctor?.department_id
          ? departmentsById.get(doctor.department_id)?.name ?? 'ไม่ระบุแผนก'
          : 'ไม่ระบุแผนก',
        serviceName: slot?.daily_service_offering_id
          ? servicesById.get(serviceOfferingsById.get(slot.daily_service_offering_id)?.service_id ?? '')?.name
          : undefined,
      };
    };
  const queueAppointments = role === 'staff_admin'
    ? appointments.filter((appointment) => appointment.status !== 'rejected')
    : role === 'patient'
      ? appointments.filter((appointment) => patientAppointmentStatuses.includes(appointment.status))
      : activeAppointments;
  const mappedAppointmentQueue = queueAppointments.map(mapAppointment);
  const mappedFutureAppointments = futureAppointments
    .filter((appointment) => role === 'patient'
      ? patientAppointmentStatuses.includes(appointment.status)
      : activeAppointmentStatuses.includes(appointment.status))
    .map(mapAppointment);
  const nextAppointment = [...mappedAppointmentQueue, ...mappedFutureAppointments]
    .filter((appointment) => (appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'in_progress')
      && isUpcomingAppointment(appointment.date, appointment.startTime, today, currentBangkokTime))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0] ?? null;
  const patientAppointmentQueue = [...mappedAppointmentQueue, ...mappedFutureAppointments]
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const appointmentQueue = role === 'patient'
    ? patientAppointmentQueue
    : mappedAppointmentQueue.sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)).slice(0, 8);

  const medicationById = new Map(medications.map((medication) => [medication.id, medication]));
  const patientMedications = role === 'patient'
    ? activeReminders
      .filter((reminder) => reminder.start_date <= today && (!reminder.end_date || reminder.end_date >= today))
      .map((reminder) => {
        const medication = medicationById.get(reminder.medication_id);
        const reminderTimes = (reminder.reminder_times ?? []).map((time) => time.slice(0, 5)).filter(Boolean).sort();
        const reminderLogs = medicationLogs.filter((log) => log.reminder_id === reminder.id);
        const todayDoses = reminderTimes.map((time) => {
          const scheduledAt = `${today}T${time}:00+07:00`;
          const log = reminderLogs.find((candidate) => `${toBangkokDate(candidate.scheduled_datetime)}T${toBangkokMinute(candidate.scheduled_datetime)}` === `${today}T${time}`);
          return {
            scheduledAt,
            time,
            status: log?.status === 'taken' ? 'taken' as const : 'pending' as const,
          };
        });
        return {
          id: reminder.id,
          name: medication?.name ?? 'ไม่พบชื่อยา',
          dosage: medication?.dosage || `1 ${medication?.type ?? 'ครั้ง'}`,
          instruction: medication?.description || `รับประทานตามเวลา ${reminderTimes.join(' · ') || 'ที่กำหนด'}`,
          reminderTimes,
          nextDoseTime: reminderTimes.length > 0 ? nextReminderTime(reminderTimes, currentBangkokTime) : null,
          endDate: reminder.end_date,
          takenDoses: reminderLogs.filter((log) => log.status === 'taken').length,
          totalDoses: reminderLogs.length,
          todayDoses,
        };
      })
    : [];
  const patientTreatmentHistory = role === 'patient'
    ? medicalRecords
      .filter((record) => record.patient_id === actorId && (!record.appointment?.status || record.appointment.status === 'completed'))
      .map((record) => {
        const doctor = doctorsById.get(record.doctor_id);
        return {
          id: record.id,
          date: record.created_at,
          doctorName: profilesById.get(record.doctor_id)?.full_name ?? 'ไม่พบแพทย์',
          departmentName: doctor?.department_id ? departmentsById.get(doctor.department_id)?.name ?? 'ไม่ระบุแผนก' : 'ไม่ระบุแผนก',
          summary: record.diagnosis || record.treatment_notes || 'ไม่มีสรุปการรักษา',
          advice: record.treatment_notes || '',
          medicationNames: (record.prescribed_medications ?? []).map((medication) => medication.name).filter(Boolean),
          medicationCount: record.prescribed_medications?.length ?? 0,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const pendingPrescriptions = role === 'medical' && !isDoctorActor
    ? medicalRecords
      .map((record) => {
        const medications = record.prescribed_medications ?? [];
        const dispensedCount = medications.filter((medication) => Boolean(medication.dispensed)).length;
        const doctor = doctorsById.get(record.doctor_id);
        return {
          id: record.id,
          patientName: profilesById.get(record.patient_id)?.full_name ?? 'ไม่พบชื่อผู้ป่วย',
          doctorName: profilesById.get(record.doctor_id)?.full_name ?? 'ไม่พบชื่อแพทย์',
          departmentName: doctor?.department_id
            ? departmentsById.get(doctor.department_id)?.name ?? 'ไม่ระบุแผนก'
            : 'ไม่ระบุแผนก',
          date: record.created_at,
          diagnosis: record.diagnosis || record.treatment_notes || 'ไม่ได้ระบุอาการ',
          medicationCount: medications.length,
          dispensedCount,
        };
      })
      .filter((record) => record.medicationCount > 0 && record.dispensedCount < record.medicationCount)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)
    : [];

  const departmentLoads = role === 'staff_admin'
    ? departments
        .filter((department) => department.is_active !== false)
        .map((department) => {
          const departmentDoctors = doctors.filter((doctor) => doctor.department_id === department.id);
          const doctorIds = new Set(departmentDoctors.map((doctor) => doctor.id));
          const departmentSlots = allRangeSlots.filter((slot) => doctorIds.has(slot.doctor_id));
          const departmentSlotIds = new Set(departmentSlots.map((slot) => slot.id));
          const patientCount = clinicAppointments.filter((appointment) => departmentSlotIds.has(appointment.slot_id)).length;
          const capacity = departmentSlots.reduce((sum, slot) => sum + slot.max_capacity, 0);
          const densityPercent = capacity > 0 ? Math.round((patientCount / capacity) * 100) : 0;
          const activeDoctorCount = new Set(
            departmentSlots
              .filter((slot) => slot.status !== 'closed')
              .map((slot) => slot.doctor_id),
          ).size;
          return {
            departmentId: department.id,
            departmentName: department.name,
            appointmentCount: patientCount,
            patientCount,
            capacity,
            doctorCount: departmentDoctors.length,
            activeDoctorCount,
            densityPercent,
            densityStatus: densityPercent >= 100 ? 'full' as const : densityPercent >= 70 ? 'near_full' as const : 'normal' as const,
          };
        })
    : [];

  const doctorStatuses: DashboardDoctorStatus[] = role === 'staff_admin'
    ? doctors.map((doctor) => {
        const profile = profilesById.get(doctor.id);
        const department = doctor.department_id ? departmentsById.get(doctor.department_id) : undefined;
        const todaySlots = allRangeSlots.filter((slot) => slot.doctor_id === doctor.id && slot.slot_date === today);
        const todaySlotIds = new Set(todaySlots.map((slot) => slot.id));
        const doctorAppointments = appointments.filter((appointment) => todaySlotIds.has(appointment.slot_id));
        const inProgressAppointment = doctorAppointments.find((appointment) => appointment.status === 'in_progress');
        const upcomingAppointments = doctorAppointments
          .filter((appointment) => appointment.status === 'pending' || appointment.status === 'confirmed')
          .filter((appointment) => {
            const slot = slotsById.get(appointment.slot_id);
            return isUpcomingToday(slot?.slot_date, slot?.start_time, today, currentBangkokTime);
          })
          .sort((a, b) => (slotsById.get(a.slot_id)?.start_time ?? '').localeCompare(slotsById.get(b.slot_id)?.start_time ?? ''));
        const hasWorkingSlot = todaySlots.some((slot) => slot.status !== 'closed');
        const isOnLeave = doctorLeaves.some((leave) => leave.doctor_id === doctor.id && leave.start_date <= today && leave.end_date >= today);
        let status: DashboardDoctorStatus['status'] = 'away';
        if (profile?.is_active !== false && !isOnLeave && isClinicOpenAt(today, currentBangkokTime) && hasWorkingSlot) {
          status = inProgressAppointment ? 'in_progress' : 'available';
        }
        const currentPatient = inProgressAppointment
          ? profilesById.get(inProgressAppointment.patient_id ?? inProgressAppointment.user_id ?? '')
          : undefined;
        const nextSlot = upcomingAppointments[0] ? slotsById.get(upcomingAppointments[0].slot_id) : undefined;
        return {
          doctorId: doctor.id,
          doctorName: profile?.full_name ?? 'ไม่พบชื่อแพทย์',
          departmentId: doctor.department_id ?? 'unassigned',
          departmentName: department?.name ?? 'ไม่ระบุแผนก',
          status,
          currentPatientName: currentPatient?.full_name ?? null,
          currentQueueNumber: inProgressAppointment?.queue_number ?? null,
          nextAppointmentTime: nextSlot?.start_time?.slice(0, 5) ?? null,
        };
      })
    : [];

  const appointmentStatusList: AppointmentStatus[] = role === 'staff_admin'
    ? ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
    : role === 'patient'
      ? ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
      : ['pending', 'confirmed', 'in_progress', 'completed'];

  const copyByRole: Record<UserRole, { title: string; description: string }> = {
    staff_admin: { title: 'ภาพรวมงานคลินิกของผู้ดูแลระบบ', description: 'ติดตามนัดหมาย คิว แผนก และบัญชีของคลินิก' },
    medical: {
      title: 'ภาพรวมงานแพทย์',
      description: isDoctorActor ? 'แสดงเฉพาะตารางและคิวของแพทย์ที่เข้าสู่ระบบ พร้อมข้อมูลยาที่หควรตรวจสอบ' : 'ติดตามงานจ่ายยาและสถานะคลังยา',
    },
    patient: { title: 'ภาพรวมสุขภาพของฉัน', description: 'นัดหมาย ยา การเตือน และข้อความของบัญชีนี้เท่านั้น' },
  };

  return {
    role,
    actor: { id: actor.id, fullName: actor.full_name },
    date: today,
    startDate,
    range,
    ...copyByRole[role],
    metrics: metricsByRole[role],
    patientProfile: role === 'patient' && patientProfile
      ? {
          phone: patientProfile.phone,
          patientType: patientProfile.patient_type ?? null,
          patientId: patientProfile.patient_type === 'employee' ? patientProfile.employee_id ?? null : patientProfile.student_id ?? null,
          allergyStatus: patientProfile.allergy_status ?? null,
          allergyDetail: patientProfile.allergies ?? null,
          chronicDiseaseStatus: patientProfile.chronic_disease_status ?? null,
          chronicDiseaseDetail: patientProfile.chronic_diseases ?? null,
        }
      : role === 'patient' ? null : undefined,
    patientGenderCounts: role === 'staff_admin' ? patientGenderCounts : undefined,
    doctorGenderCounts: role === 'staff_admin' ? doctorGenderCounts : undefined,
    appointmentStatuses: appointmentStatusList.map((status) => ({
      status,
      label: status === 'pending' ? 'รอยืนยัน' : status === 'confirmed' ? 'ยืนยันแล้ว' : status === 'in_progress' ? 'กำลังตรวจ' : status === 'completed' ? 'เสร็จสิ้น' : status === 'cancelled' ? 'ยกเลิก' : 'ไม่มาตามนัด',
      count: statusAppointments.filter((appointment) => appointment.status === status).length,
    })),
    appointmentQueue,
    servedAppointmentCount: role === 'staff_admin' ? servedAppointmentCount : undefined,
    doctorStatuses,
    nextAppointment,
    patientMedications,
    patientTreatmentHistory,
    departmentLoads,
    pendingPrescriptions,
    medicationAlerts: activeMedications
      .filter((medication) => medication.stock <= medication.min_stock || Boolean(medication.expiry_date && medication.expiry_date < today))
      .map((medication) => ({
        id: medication.id,
        name: medication.name,
        stock: medication.stock,
        minimumStock: medication.min_stock,
        expiryDate: medication.expiry_date,
        lowStock: medication.stock <= medication.min_stock && (!medication.expiry_date || medication.expiry_date >= today),
        expired: Boolean(medication.expiry_date && medication.expiry_date < today),
      })),
    recentNotifications: rangeNotifications.slice(0, 5),
    unreadNotificationCount: unreadNotifications,
    roleCounts: role === 'staff_admin'
      ? (['patient', 'medical', 'staff_admin'] as UserRole[]).map((profileRole) => ({
          role: profileRole,
          count: activeProfiles.filter((profile) => profile.role === profileRole).length,
        }))
      : [],
  };
}

export async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0];

  // Today's appointments count
  const { count: todayAppointments } = await supabase
    .from('appointments')
    .select('*, slot:appointment_slots!inner(*)', { count: 'exact', head: true })
    .eq('slot.slot_date', today);

  // Total patients count
  const { count: totalPatients } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'patient');

  // Low stock medications count
  const { data: lowStockMeds } = await supabase
    .from('medications')
    .select('id')
    .eq('is_active', true);
  // Note: comparing stock <= min_stock needs RPC or client-side filter

  return {
    todayAppointments: todayAppointments ?? 0,
    totalPatients: totalPatients ?? 0,
    lowStockMedications: lowStockMeds?.length ?? 0,
  };
}
export interface StaffProfileUpdate {
  fullName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
}

export async function updateStaffProfile(
  profileId: string,
  update: StaffProfileUpdate,
): Promise<void> {
  const { error } = await supabase.rpc('staff_admin_update_profile', {
    p_profile_id: profileId,
    p_full_name: update.fullName,
    p_phone: update.phone,
    p_role: update.role,
    p_is_active: update.isActive,
  });

  if (error) throw new Error(error.message);
}

export async function deleteStaffProfile(profileId: string): Promise<void> {
  const { error } = await supabase.rpc("staff_admin_delete_profile", {
    p_profile_id: profileId,
  });

  if (error) throw new Error(error.message);
}
