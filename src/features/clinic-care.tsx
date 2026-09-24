'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, FileHeart, RefreshCw, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatProfileName, type ProfileNameFields } from '@/lib/profileName';
import { useLocale } from '@/context/LocaleContext';

export const inputClass = 'min-h-11 w-full rounded-xl border border-brand-border-soft bg-white px-3 py-2 text-sm text-brand-ink outline-none focus:border-brand-strong focus:ring-4 focus:ring-brand-soft disabled:bg-brand-surface';
export const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-strong px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-40';
export const secondaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-border-soft bg-brand-surface px-4 py-2 text-sm font-medium text-brand-ink transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-40';

export const roleSchema = z.enum(['patient', 'medical', 'staff_admin']);
export type ClinicRole = z.infer<typeof roleSchema>;
export const appointmentStateSchema = z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected', 'no_show']);
export const prescriptionSchema = z.object({
  medication_id: z.string().uuid(), name: z.string().trim().min(1),
  dosage: z.string().trim().min(1).max(500), frequency: z.string().trim().min(1).max(500),
  duration_days: z.number().int().min(1).max(365), quantity: z.number().int().min(1).max(100000),
});
export const physicalExamSchema = z.object({
  height_cm: z.number().finite().min(30, 'ส่วนสูงต้องอยู่ระหว่าง 30–250 ซม.').max(250, 'ส่วนสูงต้องอยู่ระหว่าง 30–250 ซม.').nullable().default(null),
  weight_kg: z.number().finite().min(1, 'น้ำหนักต้องอยู่ระหว่าง 1–300 กก.').max(300, 'น้ำหนักต้องอยู่ระหว่าง 1–300 กก.').nullable().default(null),
  blood_pressure: z.string().trim().regex(/^\d{2,3}\/\d{2,3}$/, 'ความดันโลหิตต้องอยู่ในรูปแบบ systolic/diastolic เช่น 120/80').nullable().default(null),
  pulse_bpm: z.number().int().min(20, 'ชีพจรต้องอยู่ระหว่าง 20–250 ครั้ง/นาที').max(250, 'ชีพจรต้องอยู่ระหว่าง 20–250 ครั้ง/นาที').nullable().default(null),
});
const recordFieldsSchema = z.object({
  diagnosis: z.string().trim().min(1, 'กรุณากรอกผลวินิจฉัย').max(5000),
  advice: z.string().trim().max(5000), prescriptions: z.array(prescriptionSchema).max(50),
  ...physicalExamSchema.shape,
});
const uniquePrescriptions = <T extends { prescriptions: Array<{ medication_id: string }> }>(value: T) => new Set(value.prescriptions.map((prescription) => prescription.medication_id)).size === value.prescriptions.length;
export const recordInputSchema = recordFieldsSchema.extend({ appointmentId: z.string().uuid(), complete: z.boolean() }).refine(uniquePrescriptions, 'รายการยาซ้ำ');
export type RecordInput = z.infer<typeof recordInputSchema>;
export const recordUpdateInputSchema = recordFieldsSchema.extend({ recordId: z.string().uuid() }).refine(uniquePrescriptions, 'รายการยาซ้ำ');
export type RecordUpdateInput = z.infer<typeof recordUpdateInputSchema>;
export const snapshotSchema = z.object({
  actor: z.object({ id: z.string().uuid(), role: roleSchema }),
  departments: z.array(z.string()).optional(),
  services: z.array(z.object({ id: z.string().uuid(), code: z.string(), name: z.string() })).default([]),
  slots: z.array(z.object({
    id: z.string().uuid(), doctor_id: z.string().uuid(), doctor: z.string(), department: z.string(),
    service_id: z.string().uuid().optional(), service: z.string().optional(),
    slot_date: z.string(), start_time: z.string(), end_time: z.string(), max_capacity: z.number(),
    booked_count: z.number(), status: z.string(), bookable: z.boolean(),
  })),
  appointments: z.array(z.object({
    id: z.string().uuid(), user_id: z.string().uuid(), patient: z.string(), slot_id: z.string().uuid(),
    patient_phone: z.string().nullable().optional(),
    queue_number: z.number().nullable(), reason: z.string().nullable(), status: appointmentStateSchema,
    cancel_requested_at: z.string().nullable(), rejection_reason: z.string().nullable(), has_record: z.boolean(),
  })),
  records: z.array(z.object({
    id: z.string().uuid(), appointment_id: z.string().uuid(), patient_id: z.string().uuid(), doctor_id: z.string().uuid(),
    patient: z.string(), doctor: z.string(), diagnosis: z.string().nullable(), treatment_notes: z.string().nullable(),
    prescribed_medications: z.array(prescriptionSchema).nullable(), created_at: z.string(), completed: z.boolean(),
    ...physicalExamSchema.shape,
  })),
  medications: z.array(z.object({ id: z.string().uuid(), name: z.string(), type: z.string() })),
});
export type ClinicSnapshot = z.infer<typeof snapshotSchema>;
export type ClinicAppointment = ClinicSnapshot['appointments'][number];
export type ClinicAction = 'confirmed' | 'rejected' | 'in_progress' | 'completed' | 'cancelled' | 'request_cancel';
export interface ClinicRepository {
  load(): Promise<ClinicSnapshot>;
  book(slotId: string, reason: string): Promise<void>;
  transition(appointmentId: string, action: ClinicAction, reason?: string): Promise<void>;
  saveRecord(input: RecordInput): Promise<void>;
  updateRecord(input: RecordUpdateInput): Promise<void>;
}

export function allowedActions(
  role: ClinicRole,
  appointment: ClinicAppointment,
  slot?: { slot_date: string; start_time: string },
  currentDate?: string,
  currentTime?: string,
): ClinicAction[] {
  if (role === 'patient') return ['pending', 'confirmed'].includes(appointment.status) && !appointment.cancel_requested_at ? ['request_cancel'] : [];
  if (role === 'medical') {
    if (appointment.status === 'pending') return ['confirmed', 'rejected'];
    if (appointment.status === 'confirmed') {
      if (slot && !isSlotArrived(slot.slot_date, slot.start_time, currentDate, currentTime)) return [];
      return ['in_progress'];
    }
    return appointment.status === 'in_progress' && appointment.has_record ? ['completed'] : [];
  }
  if (appointment.status === 'pending') return ['confirmed', 'rejected', 'cancelled'];
  if (appointment.status === 'confirmed') {
    if (slot && !isSlotArrived(slot.slot_date, slot.start_time, currentDate, currentTime)) return ['cancelled'];
    return ['in_progress', 'cancelled'];
  }
  if (appointment.status === 'in_progress' && appointment.has_record) return ['completed'];
  return [];
}

export const actionLabels: Record<ClinicAction, string> = {
  confirmed: 'อนุมัตินัด', rejected: 'ปฏิเสธนัด', in_progress: 'เริ่มตรวจ', completed: 'จบตรวจ',
  cancelled: 'ยกเลิกนัด', request_cancel: 'ขอยกเลิกนัด',
};
export function bangkokDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function bangkokTime(now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
}
export function isSlotArrived(slotDate: string, startTime: string, currentDate?: string, currentTime?: string): boolean {
  const effectiveDate = currentDate ?? bangkokDate();
  if (slotDate < effectiveDate) return true;
  if (slotDate > effectiveDate) return false;
  const effectiveTime = currentTime ?? bangkokTime();
  return effectiveTime >= startTime.slice(0, 5);
}

/** Database adapter for the logged-in user's session. RPCs keep their existing database names for compatibility. */
export function createClinicDatabaseRepository(client: SupabaseClient, expectedRole: ClinicRole): ClinicRepository {
  async function actor(allowed: ClinicRole[]) {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error('กรุณาเข้าสู่ระบบใหม่');
    const profile = await client.from('profiles').select('role, is_active').eq('id', data.user.id).single();
    const role = roleSchema.safeParse(profile.data?.role);
    if (profile.error || !role.success || profile.data?.is_active !== true || role.data !== expectedRole || !allowed.includes(role.data)) {
      throw new Error('ไม่มีสิทธิ์ทำรายการนี้ กรุณาเข้าสู่ระบบด้วยบัญชีที่ถูกต้อง');
    }
    return { id: data.user.id, role: role.data };
  }
  async function rpc(name: string, args?: Record<string, unknown>) {
    const result = await client.rpc(name, args);
    if (result.error) {
      if (result.error.code === 'P0001') throw new Error(result.error.message);
      if (result.error.code === 'PGRST202' || result.error.code === '42883') throw new Error('ระบบยังไม่พร้อมบันทึกผลตรวจ กรุณาติดต่อผู้ดูแลระบบ');
      if (result.error.code === 'PGRST203') throw new Error('ระบบบันทึกผลตรวจมีปัญหา กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ');
      if (result.error.code === '42501') throw new Error('บัญชีนี้ไม่มีสิทธิ์บันทึกผลตรวจ หรือไม่ได้เป็นแพทย์เจ้าของนัด');
      if (result.error.code === '23505') throw new Error('นัดนี้มีผลตรวจบันทึกแล้ว ไม่สามารถบันทึกซ้ำได้');
      throw new Error('ทำรายการไม่สำเร็จ กรุณาลองใหม่');
    }
    return result.data;
  }
  return {
    async load() {
      const current = await actor(['patient', 'medical', 'staff_admin']);
      const parsed = snapshotSchema.safeParse(await rpc('pai_workspace'));
      if (!parsed.success || parsed.data.actor.id !== current.id || parsed.data.actor.role !== current.role) throw new Error('ข้อมูลไม่ตรงกับบัญชีปัจจุบัน กรุณาโหลดใหม่');
      const slotIds = parsed.data.slots.map((slot) => slot.id);
      const [services, slotServices] = await Promise.all([
        client.from('services').select('id, code, name').eq('is_active', true).order('name'),
        slotIds.length
          ? client.from('appointment_slots').select('id, offering:daily_service_offerings(service_id, service:services(id, name))').in('id', slotIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (services.error || slotServices.error) throw new Error('ไม่สามารถโหลดข้อมูลบริการของรอบตรวจได้ กรุณาโหลดใหม่อีกครั้ง');
      const serviceRows = z.array(z.object({ id: z.string().uuid(), code: z.string(), name: z.string() })).parse(services.data ?? []);
      const serviceById = new Map(serviceRows.map((service) => [service.id, service]));
      const slotServiceById = new Map<string, { id: string; name: string }>();
      for (const row of (slotServices.data ?? []) as Array<{ id: string; offering?: { service_id?: string; service?: { id?: string; name?: string } | null } | Array<{ service_id?: string; service?: { id?: string; name?: string } | null }> | null }>) {
        const offering = Array.isArray(row.offering) ? row.offering[0] : row.offering;
        const service = offering?.service;
        const serviceId = service?.id ?? offering?.service_id;
        if (serviceId && service?.name) slotServiceById.set(row.id, { id: serviceId, name: service.name });
      }
      parsed.data.services = serviceRows;
      parsed.data.slots = parsed.data.slots.map((slot) => {
        const service = slotServiceById.get(slot.id) ?? (slot.service_id ? serviceById.get(slot.service_id) : undefined);
        return { ...slot, service_id: service?.id ?? slot.service_id, service: service?.name ?? slot.service };
      });
      if (current.role !== 'patient' && parsed.data.appointments.length) {
        const patientIds = [...new Set(parsed.data.appointments.map((appointment) => appointment.user_id))];
        const profiles = await client.from('profiles').select('id, phone').in('id', patientIds);
        if (profiles.error) throw new Error('ไม่สามารถโหลดเบอร์โทรผู้ป่วยได้ กรุณาโหลดข้อมูลใหม่');
        const phones = z.array(z.object({ id: z.string().uuid(), phone: z.string().nullable() })).parse(profiles.data);
        const byId = new Map(phones.map((phone) => [phone.id, phone.phone]));
        parsed.data.appointments = parsed.data.appointments.map((appointment) => ({ ...appointment, patient_phone: byId.get(appointment.user_id) ?? null }));
      }
      return parsed.data;
    },
    async book(slotId, reason) {
      z.string().uuid().parse(slotId);
      const text = z.string().trim().min(1, 'กรุณากรอกอาการหรือเหตุผล').max(2000).parse(reason);
      await actor(['patient']);
      await rpc('pai_book_appointment', { p_slot_id: slotId, p_reason: text });
    },
    async transition(appointmentId: string, action: ClinicAction, reason?: string) {
      z.string().uuid().parse(appointmentId);
      z.enum(['confirmed', 'rejected', 'in_progress', 'completed', 'cancelled', 'request_cancel']).parse(action);
      const parsedReason = action === 'rejected' ? z.string().trim().min(1, 'กรุณาระบุเหตุผลการปฏิเสธ').max(2000).parse(reason) : null;
      const roles: ClinicRole[] = action === 'request_cancel' ? ['patient'] : ['confirmed', 'rejected', 'in_progress', 'completed'].includes(action) ? ['medical', 'staff_admin'] : ['staff_admin'];
      await actor(roles);
      await rpc('pai_transition_appointment', { p_appointment_id: appointmentId, p_action: action, p_reason: parsedReason });
    },
    async saveRecord(input: RecordInput) {
      const parsed = recordInputSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await actor(['medical']);
      await rpc('pai_save_record', {
        p_appointment_id: parsed.data.appointmentId,
        p_diagnosis: parsed.data.diagnosis,
        p_advice: parsed.data.advice,
        p_prescriptions: parsed.data.prescriptions,
        p_height_cm: parsed.data.height_cm,
        p_weight_kg: parsed.data.weight_kg,
        p_blood_pressure: parsed.data.blood_pressure,
        p_pulse_bpm: parsed.data.pulse_bpm,
        p_complete: parsed.data.complete,
      });
    },
    async updateRecord(input: RecordUpdateInput) {
      const parsed = recordUpdateInputSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      await actor(['medical']);
      await rpc('update_medical_record', {
        p_record_id: parsed.data.recordId,
        p_diagnosis: parsed.data.diagnosis,
        p_advice: parsed.data.advice,
        p_prescriptions: parsed.data.prescriptions,
        p_height_cm: parsed.data.height_cm,
        p_weight_kg: parsed.data.weight_kg,
        p_blood_pressure: parsed.data.blood_pressure,
        p_pulse_bpm: parsed.data.pulse_bpm,
      });
    },
  };
}

/** Browser adapter for the Route Handler boundary. The Supabase adapter above remains available for isolated tests. */
export function createClinicApiRepository(expectedRole: ClinicRole): ClinicRepository {
  type ApiSlot = {
    id: string; doctor_id: string; slot_date: string; start_time: string; end_time: string;
    service_id?: string; max_capacity: number; booked_count: number; status: string;
    offering?: { service_id?: string; service?: { id?: string; code?: string; name?: string } | null } | Array<{ service_id?: string; service?: { id?: string; code?: string; name?: string } | null }> | null;
    doctor?: { profile?: ProfileNameFields | null; department?: { name?: string | null } | null } | null;
  };
  type ApiAppointment = {
    id: string; patient_id: string; slot_id: string; queue_number: number | null; reason: string | null;
    status: ClinicSnapshot['appointments'][number]['status']; cancel_requested_at: string | null; rejection_reason: string | null;
    slot?: ApiSlot | null; patient?: (ProfileNameFields & { phone?: string | null }) | null;
  };
  type ApiRecord = {
    id: string; appointment_id: string; patient_id: string; doctor_id: string; diagnosis: string | null;
    treatment_notes: string | null; prescribed_medications: ClinicSnapshot['records'][number]['prescribed_medications'];
    created_at: string; height_cm?: number | null; weight_kg?: number | null; blood_pressure?: string | null; pulse_bpm?: number | null;
    appointment?: { status?: string | null } | null; patient?: ProfileNameFields | null; doctor?: { profile?: ProfileNameFields | null } | null;
  };

  const isFutureSlot = (slot: ApiSlot) => {
    const now = new Date();
    return new Date(`${slot.slot_date}T${slot.start_time}+07:00`) > now;
  };

  return {
    async load() {
      const [appointments, slots, services, records, medications] = await Promise.all([
        apiClient<ApiAppointment[]>('/api/appointments'),
        apiClient<ApiSlot[]>('/api/schedules/slots'),
        apiClient<Array<{ id: string; code: string; name: string }>>('/api/services'),
        expectedRole === 'staff_admin' ? Promise.resolve([] as ApiRecord[]) : apiClient<ApiRecord[]>('/api/medical-records'),
        expectedRole === 'medical' ? apiClient<Array<{ id: string; name: string; type: string }>>('/api/medications') : Promise.resolve([]),
      ]);
      const actor = await apiClient<{ profile: { id: string }; role: ClinicRole }>('/api/auth/me');
      const recordIds = new Set(records.map((record) => record.appointment_id));
      const slotRows = slots.map((slot) => ({
        ...(() => {
          const offering = Array.isArray(slot.offering) ? slot.offering[0] : slot.offering;
          const service = offering?.service;
          return { service_id: slot.service_id ?? service?.id ?? offering?.service_id, service: service?.name };
        })(),
        id: slot.id,
        doctor_id: slot.doctor_id,
        doctor: formatProfileName(slot.doctor?.profile) || 'ไม่ระบุแพทย์',
        department: slot.doctor?.department?.name ?? 'ไม่ระบุแผนก',
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        max_capacity: slot.max_capacity,
        booked_count: slot.booked_count,
        status: slot.status,
        bookable: slot.status === 'available' && isFutureSlot(slot),
      }));
      return snapshotSchema.parse({
        actor: { id: actor.profile.id, role: actor.role },
        services,
        slots: slotRows,
        appointments: appointments.map((appointment) => ({
          id: appointment.id,
          user_id: appointment.patient_id,
          patient: formatProfileName(appointment.patient) || 'ไม่ระบุชื่อ',
          slot_id: appointment.slot_id,
          patient_phone: appointment.patient?.phone ?? null,
          queue_number: appointment.queue_number,
          reason: appointment.reason,
          status: appointment.status,
          cancel_requested_at: appointment.cancel_requested_at,
          rejection_reason: appointment.rejection_reason,
          has_record: recordIds.has(appointment.id),
        })),
        records: records.map((record) => ({
          id: record.id,
          appointment_id: record.appointment_id,
          patient_id: record.patient_id,
          doctor_id: record.doctor_id,
          patient: formatProfileName(record.patient) || 'ไม่ระบุชื่อ',
          doctor: formatProfileName(record.doctor?.profile) || 'ไม่ระบุแพทย์',
          diagnosis: record.diagnosis,
          treatment_notes: record.treatment_notes,
          prescribed_medications: record.prescribed_medications,
          created_at: record.created_at,
          completed: record.appointment?.status === 'completed',
          height_cm: record.height_cm ?? null,
          weight_kg: record.weight_kg ?? null,
          blood_pressure: record.blood_pressure ?? null,
          pulse_bpm: record.pulse_bpm ?? null,
        })),
        medications,
      });
    },
    async book(slotId, reason) {
      await apiClient('/api/appointments', { method: 'POST', body: JSON.stringify({ slotId, reason }) });
    },
    async transition(appointmentId, action, reason) {
      await apiClient(`/api/appointments/${appointmentId}/status`, { method: 'PATCH', body: JSON.stringify({ action, reason }) });
    },
    async saveRecord(input) {
      await apiClient('/api/medical-records', { method: 'POST', body: JSON.stringify(input) });
    },
    async updateRecord(input) {
      await apiClient(`/api/medical-records/${input.recordId}`, { method: 'PATCH', body: JSON.stringify(input) });
    },
  };
}

export function useClinicWorkspace(role: ClinicRole, injected?: ClinicRepository) {
  const [data, setData] = useState<ClinicSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const repo = useRef<ClinicRepository | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  const repository = useCallback(() => {
    if (injected) return injected;
    if (!repo.current) repo.current = createClinicApiRepository(role);
    return repo.current;
  }, [role, injected]);
  const reload = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const next = await repository().load();
      if (next.actor.role !== role) throw new Error('บัญชีปัจจุบันไม่มีสิทธิ์เปิดหน้านี้');
      if (ticket === generation.current) setData(next);
    } catch (errorValue) {
      if (ticket === generation.current) setError(errorValue instanceof Error ? errorValue.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally { if (ticket === generation.current) setLoading(false); }
  }, [repository, role]);
  useEffect(() => {
    let active = true;
    const ticket = ++generation.current;
    async function initialize() {
      try {
        const next = await repository().load();
        if (next.actor.role !== role) throw new Error('บัญชีปัจจุบันไม่มีสิทธิ์เปิดหน้านี้');
        if (active && ticket === generation.current) setData(next);
      } catch (errorValue) {
        if (active && ticket === generation.current) setError(errorValue instanceof Error ? errorValue.message : 'โหลดข้อมูลไม่สำเร็จ');
      } finally { if (active && ticket === generation.current) setLoading(false); }
    }
    void initialize();
    return () => { active = false; };
  }, [repository, role]);
  async function run(command: (repository: ClinicRepository) => Promise<void>, success: string) {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await command(repository());
      setMessage(success);
      await reload();
      return true;
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : 'ทำรายการไม่สำเร็จ กรุณาลองใหม่');
      return false;
    } finally { lock.current = false; setBusy(false); }
  }
  return { data, loading, busy, error, message, reload, run };
}

export interface WorkspaceHeaderStat {
  label: string;
  value: number | string;
  tone: 'default' | 'success' | 'info' | 'warning' | 'danger';
}

export function ClinicWorkspaceShell({ role, section, error, message, busy, reload, children, wide = false }: {
  role: ClinicRole; section: 'appointments' | 'records'; error: string; message: string; busy: boolean;
  reload: () => Promise<void>; children: ReactNode; stats?: WorkspaceHeaderStat[]; wide?: boolean;
}) {
  const { text } = useLocale();
  const title = section === 'records'
    ? role === 'patient' ? text('ประวัติการรักษา', 'Medical records') : 'ผลตรวจและรายการยา'
    : role === 'patient' ? text('นัดหมายของฉัน', 'My appointments') : role === 'medical' ? 'นัดหมายและคิวตรวจ' : 'รายการนัดทั้งหมด';
  const description = section === 'records'
    ? role === 'patient'
      ? text('ดูนัดหมาย ผลตรวจ และรายการยาของคุณ', 'View your appointments, results, and medications.')
      : 'บันทึกผลตรวจ คำแนะนำ และรายการยาก่อนยืนยันผลตรวจ'
    : role === 'patient'
      ? text('ติดตามสถานะนัดหมายและรายละเอียดการเข้ารับบริการ', 'Track your appointment status and visit details.')
      : role === 'medical'
        ? 'ติดตามคิวตรวจและบันทึกข้อมูลการรักษาของผู้ป่วยที่รับผิดชอบ'
        : 'จัดการคำขอนัดและติดตามคิวของผู้รับบริการจากระบบปัจจุบัน';
  return <section className={`${wide ? 'relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8' : 'mx-auto w-full max-w-none lg:relative lg:left-1/2 lg:w-[calc(100vw-4rem)] lg:max-w-[1368px] lg:-translate-x-1/2'} space-y-5 text-brand-ink`}>
    <header className="border-b border-brand-border-soft pb-5 sm:pb-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 border-l-4 border-brand-strong pl-4 sm:pl-5">
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-brand-muted">{description}</p>
        </div>
        <button aria-label={text('โหลดข้อมูลใหม่', 'Reload data')} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-brand-strong px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} onClick={() => void reload()}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />{text('รีเฟรช', 'Refresh')}</button>
      </div>
    </header>
    <nav aria-label={text('นัดหมายและผลตรวจ', 'Appointments and results')} className="flex items-center gap-5 overflow-x-auto border-b border-brand-border-soft px-1">
      <Link href="/appointments" aria-current={section === 'appointments' ? 'page' : undefined} className={`relative flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition ${section === 'appointments' ? 'border-brand-strong text-brand-strong' : 'border-transparent text-brand-body hover:border-brand-border-strong hover:text-brand-ink'}`}><CalendarDays className="h-4 w-4" aria-hidden="true" />{text('นัดหมายและคิว', 'Appointments')}</Link>
      {role !== 'staff_admin' && <Link href="/records" aria-current={section === 'records' ? 'page' : undefined} className={`relative flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition ${section === 'records' ? 'border-brand-strong text-brand-strong' : 'border-transparent text-brand-body hover:border-brand-border-strong hover:text-brand-ink'}`}><FileHeart className="h-4 w-4" aria-hidden="true" />{text('ผลตรวจและรายการยา', 'Results and medications')}</Link>}
    </nav>
    {error && <p role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />{error}</p>}
    {message && <p role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />{message}</p>}
    {children}
  </section>;
}

const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const asDate = (value: string) => new Date(`${value}T12:00:00`);
const fullDate = (value: string, locale: 'en' | 'th' = 'th') => new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { dateStyle: 'long', timeZone: 'Asia/Bangkok' }).format(asDate(value));
const pickerButtonStyle = 'flex min-h-11 items-center justify-center rounded-xl transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-40';

export function ClinicDatePicker({ label, value, onChange, min, markedDates = [], disabled = false, className = '' }: {
  label: string; value: string; onChange: (value: string) => void; min?: string; markedDates?: string[]; disabled?: boolean; className?: string;
}) {
  const { locale, text } = useLocale();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const today = bangkokDate();
  const initial = value || (min && today < min ? min : today);
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [focused, setFocused] = useState(initial);
  const first = asDate(`${month}-01`);
  const marked = new Set(markedDates);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + index, 12);
    return { date, iso: dateValue(date) };
  });
  function close() { dialog.current?.close(); trigger.current?.focus(); }
  function choose(next: string) { onChange(next); close(); }
  function open() {
    setMonth(initial.slice(0, 7)); setFocused(initial);
    dialog.current?.showModal();
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLButtonElement>(`[data-date="${initial}"]`)?.focus());
  }
  function moveMonth(offset: number) {
    const next = dateValue(new Date(first.getFullYear(), first.getMonth() + offset, 1, 12));
    setMonth(next.slice(0, 7)); setFocused(min && next < min && min.startsWith(next.slice(0, 7)) ? min : next);
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, iso: string) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = asDate(iso); next.setDate(next.getDate() + offsets[event.key]);
    const nextValue = dateValue(next);
    if (min && nextValue < min) return;
    setMonth(nextValue.slice(0, 7)); setFocused(nextValue);
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLButtonElement>(`[data-date="${nextValue}"]`)?.focus());
  }
  return <>
    <button ref={trigger} type="button" disabled={disabled} aria-label={label} aria-haspopup="dialog" onClick={open}
    className={`flex min-h-11 w-full min-w-0 items-center gap-3 rounded-xl border border-brand-border-strong bg-white px-3 py-2.5 text-left text-sm text-brand-ink shadow-sm transition hover:border-brand-strong hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50 ${className}`}>
      <CalendarDays className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" /><span className="truncate">{value ? fullDate(value, locale) : text('เลือกวันที่', 'Choose a date')}</span>
    </button>
    <dialog ref={dialog} aria-labelledby={`${id}-title`} onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border border-brand-border bg-white p-0 text-brand-ink shadow-2xl backdrop:bg-brand-ink/30 backdrop:backdrop-blur-sm">
      <div className="p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3"><div><p className="mb-1 text-xs font-medium text-brand-body">{text('ปฏิทินนัดหมาย', 'Appointment calendar')}</p><h2 id={`${id}-title`} className="text-lg font-semibold">{label}</h2></div><button type="button" aria-label={text('ปิดปฏิทิน', 'Close calendar')} onClick={close} className={`${pickerButtonStyle} w-11`}><X className="h-5 w-5" /></button></div>
        <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl bg-brand-surface p-2">
          <button type="button" aria-label={text('เดือนก่อนหน้า', 'Previous month')} disabled={Boolean(min && month <= min.slice(0, 7))} onClick={() => moveMonth(-1)} className={`${pickerButtonStyle} w-11`}><ChevronLeft className="h-5 w-5" /></button>
          <p aria-live="polite" className="font-semibold">{new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(first)}</p>
          <button type="button" aria-label={text('เดือนถัดไป', 'Next month')} onClick={() => moveMonth(1)} className={`${pickerButtonStyle} w-11`}><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-brand-body" aria-hidden="true">{(locale === 'th' ? ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day) => <span key={day} className="py-2">{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1" role="group" aria-label={text('วันที่ในปฏิทิน', 'Calendar dates')}>{days.map(({ date, iso }) => {
          const selected = value === iso;
          return <button key={iso} type="button" data-date={iso} disabled={Boolean(min && iso < min)} tabIndex={focused === iso ? 0 : -1}
            aria-label={`${fullDate(iso, locale)}${marked.has(iso) ? text(' มีนัดหมาย', ' Appointment scheduled') : ''}`} aria-pressed={selected} aria-current={iso === today ? 'date' : undefined}
            onKeyDown={(event) => navigate(event, iso)} onFocus={() => setFocused(iso)} onClick={() => choose(iso)}
            className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center rounded-xl text-sm transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${selected ? 'bg-brand-strong font-semibold text-white shadow-md hover:bg-brand-hover' : `${iso.startsWith(month) ? 'text-brand-ink' : 'text-brand-body'} ${marked.has(iso) ? 'bg-brand-soft' : 'bg-white'} hover:bg-brand-soft ${iso === today ? 'ring-1 ring-inset ring-brand-strong' : ''}`}`}>
            {date.getDate()}{marked.has(iso) && <span aria-hidden="true" className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-brand-strong'}`} />}
          </button>;
        })}</div>
        <p className="mt-4 flex items-center gap-2 text-xs text-brand-body"><span className="h-1.5 w-1.5 rounded-full bg-brand-strong" aria-hidden="true" />{text('วันที่มีนัดหมาย', 'Dates with appointments')}</p>
        <div className="mt-4 flex items-center justify-between border-t border-brand-border-soft pt-3">
          <button type="button" className={`${pickerButtonStyle} px-3 text-sm text-brand-body`} onClick={() => choose('')}>{text('ล้างวันที่', 'Clear date')}</button>
          <button type="button" disabled={Boolean(min && today < min)} className={`${pickerButtonStyle} px-4 text-sm font-semibold text-brand-strong`} onClick={() => choose(today)}>{text('วันนี้', 'Today')}</button>
        </div>
      </div>
    </dialog>
  </>;
}

export type ClinicSelectOption = { value: string; label: string; disabled?: boolean };
export function ClinicSelect({ value, onChange, options, placeholder, ariaLabel, disabled = false, className = '', menuPlacement = 'bottom' }: {
  value: string; onChange: (value: string) => void; options: ClinicSelectOption[]; placeholder: string; ariaLabel: string; disabled?: boolean; className?: string; menuPlacement?: 'top' | 'bottom';
}) {
  const { text } = useLocale();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const selected = options.find((option) => option.value === value);
  const label = selected?.label ?? placeholder;
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOnOutsideClick); document.removeEventListener('keydown', closeOnEscape); };
  }, [open]);
  function choose(option: ClinicSelectOption) {
    if (option.disabled) return;
    onChange(option.value); setOpen(false); trigger.current?.focus();
  }
  function moveActive(direction: 1 | -1) {
    if (!options.length) return;
    let next = activeIndex;
    do { next = (next + direction + options.length) % options.length; } while (options[next]?.disabled && next !== activeIndex);
    setActiveIndex(next);
  }
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) setOpen(true); moveActive(event.key === 'ArrowDown' ? 1 : -1); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!open) setOpen(true); else if (options[activeIndex]) choose(options[activeIndex]); }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setActiveIndex(event.key === 'Home' ? 0 : Math.max(0, options.length - 1)); }
  }
  return <div className="relative min-w-0">
    <button ref={trigger} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
      onClick={() => { setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value))); setOpen((current) => !current); }}
      onKeyDown={handleKeyDown} className={`${inputClass} flex items-center justify-between gap-3 text-left transition hover:border-brand-strong focus-visible:ring-4 focus-visible:ring-brand-soft ${className}`}>
      <span className={`min-w-0 truncate ${selected ? 'text-brand-ink' : 'text-brand-muted'}`}>{label}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-brand-muted transition ${open ? 'rotate-180 text-brand-strong' : ''}`} aria-hidden="true" />
    </button>
    {open && <div ref={menu} id={id} role="listbox" aria-label={ariaLabel} className={`absolute left-0 z-30 max-h-64 w-full min-w-[14rem] overflow-y-auto rounded-2xl border border-brand-border bg-white p-1.5 shadow-xl ring-1 ring-slate-950/5 ${menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
      {options.length ? options.map((option, index) => <button key={option.value} type="button" role="option" aria-selected={value === option.value} disabled={option.disabled} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)}
        className={`flex min-h-10 w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${value === option.value ? 'bg-brand-soft font-semibold text-brand-strong' : index === activeIndex ? 'bg-brand-surface text-brand-ink' : 'text-brand-ink hover:bg-brand-surface'} disabled:cursor-not-allowed disabled:text-brand-muted/50`}>{option.label}</button>) : <p className="px-3 py-2 text-sm text-brand-muted">{text('ไม่มีตัวเลือก', 'No options available')}</p>}
    </div>}
  </div>;
}

export function ClinicPageLoading() {
  const { text } = useLocale();
  return <div role="status" aria-label={text('กำลังโหลดหน้าบริการ', 'Loading clinic page')} className="space-y-6">
    <p className="text-sm text-slate-500">{text('กำลังโหลดหน้าบริการ…', 'Loading clinic page…')}</p>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-12 rounded-xl bg-slate-100" />
      <div className="h-10 w-2/3 rounded-xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl bg-slate-100" />)}</div>
      <div className="h-80 rounded-2xl border border-slate-100 bg-white" />
    </div>
  </div>;
}
