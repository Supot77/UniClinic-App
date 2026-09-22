import { apiClient, ApiError } from '@/lib/api-client';
import type {
  DailyServiceOffering, DoctorAccountOption, ScheduleDepartment, ScheduleDoctor, ScheduleService, ScheduleSlot, DoctorLeave, DoctorLeaveInput,
} from '@/types/schedule';
import type { SchedulingResult, SlotBatchInput, SlotInput } from '../domain/rules';

type ApiDepartment = { id: string; name: string; description: string | null; is_active: boolean };
type ApiService = { id: string; code: string; name: string; description: string | null; is_active: boolean };
type ApiDoctor = { id: string; specialty: string | null; department_id: string | null; profile?: { id: string; full_name: string; role: string; is_active: boolean } | Array<{ id: string; full_name: string; role: string; is_active: boolean }> | null; department?: { id: string; name: string } | null };
type ApiSlot = { id: string; doctor_id: string; daily_service_offering_id?: string; service_id?: string; slot_date: string; start_time: string; end_time: string; max_capacity: number; booked_count: number; status: string; offering?: { service_id: string } | Array<{ service_id: string }> | null };
type ApiLeave = { id: string; doctor_id: string; start_date: string; end_date: string; reason: string | null; created_by: string | null; created_at: string | null };

const failure = <T>(error: unknown, fallback: string): SchedulingResult<T> => ({ ok: false, error: error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback });
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const initials = (name: string, fallback = 'DR') => name.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || fallback;
const single = <T,>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;

export interface ApiSchedulingSnapshot {
  departments: ScheduleDepartment[];
  doctors: ScheduleDoctor[];
  services: ScheduleService[];
  dailyServiceOfferings: DailyServiceOffering[];
  slots: ScheduleSlot[];
  doctorAccounts: DoctorAccountOption[];
  doctorLeaves: DoctorLeave[];
}

export class ApiSchedulingRepository {
  async fetchDepartments(): Promise<ScheduleDepartment[]> {
    const rows = await apiClient<ApiDepartment[]>('/api/departments');
    return rows.map((row) => ({ id: row.id, name: row.name, description: row.description ?? '', isActive: row.is_active, hasHistory: true }));
  }

  async fetchServices(): Promise<ScheduleService[]> {
    const rows = await apiClient<ApiService[]>('/api/services');
    return rows.map((row) => ({ id: row.id, code: row.code, name: row.name, description: row.description ?? '', isActive: row.is_active, hasHistory: true }));
  }

  async fetchDailyServiceOfferings(): Promise<DailyServiceOffering[]> {
    const rows = await apiClient<Array<{ id: string; service_id: string; doctor_id: string; offering_date: string; is_active: boolean; created_by: string | null }>>('/api/schedules/offerings');
    return rows.map((row) => ({ id: row.id, serviceId: row.service_id, doctorId: row.doctor_id, offeringDate: row.offering_date, isActive: row.is_active, createdBy: row.created_by ?? undefined }));
  }

  async fetchDoctors(): Promise<ScheduleDoctor[]> {
    const rows = await apiClient<ApiDoctor[]>('/api/doctors');
    return rows.map((row) => {
      const profile = single(row.profile);
      const fullName = profile?.full_name?.trim() || 'ไม่ระบุชื่อ';
      return { id: row.id, profileId: row.id, fullName, email: '', initials: initials(fullName), specialty: row.specialty ?? '', departmentId: row.department_id ?? '', availability: profile?.is_active === false ? 'inactive' : 'active', hasHistory: true };
    });
  }

  async fetchDoctorAccounts(): Promise<DoctorAccountOption[]> {
    const rows = await apiClient<Array<{ profileId: string; fullName: string; email: string }>>('/api/doctors/accounts');
    return rows.map((row) => {
      const fullName = row.fullName?.trim() || 'ไม่ระบุชื่อ';
      return { profileId: row.profileId, fullName, email: row.email ?? '', initials: initials(fullName, 'MD') };
    });
  }

  async fetchDoctorLeaves(): Promise<DoctorLeave[]> {
    let rows: ApiLeave[];
    try {
      rows = await apiClient<ApiLeave[]>('/api/doctors/leaves');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) return [];
      throw error;
    }
    return rows.map((row) => ({ id: row.id, doctorId: row.doctor_id, startDate: row.start_date, endDate: row.end_date, reason: row.reason ?? undefined, createdBy: row.created_by ?? undefined, createdAt: row.created_at ?? undefined }));
  }

  async fetchSlots(): Promise<ScheduleSlot[]> {
    const rows = await apiClient<ApiSlot[]>('/api/schedules/slots');
    return rows.map((row) => {
      const offering = single(row.offering);
      return { id: row.id, doctorId: row.doctor_id, serviceOfferingId: row.daily_service_offering_id ?? '', serviceId: row.service_id ?? offering?.service_id ?? '', slotDate: row.slot_date, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), maxCapacity: row.max_capacity, bookedCount: row.booked_count ?? 0, status: row.status as ScheduleSlot['status'], hasHistory: (row.booked_count ?? 0) > 0, closedReason: row.status === 'closed' ? 'manual' : undefined };
    });
  }

  async saveDepartment(input: Omit<ScheduleDepartment, 'id' | 'isActive'>, _existing?: ScheduleDepartment[], id?: string): Promise<SchedulingResult<ScheduleDepartment>> {
    try {
      const payload = { name: input.name.trim(), description: input.description.trim() || null };
      if (!payload.name) return { ok: false, error: 'กรุณาระบุชื่อแผนก' };
      const row = await apiClient<ApiDepartment>(id ? `/api/departments/${id}` : '/api/departments', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      return { ok: true, value: { id: row.id, name: row.name, description: row.description ?? '', isActive: row.is_active } };
    } catch (error) { return failure(error, 'บันทึกแผนกไม่สำเร็จ'); }
  }

  async toggleDepartment(id: string, active: boolean): Promise<SchedulingResult<'deleted' | 'disabled' | 'enabled'>> {
    try { await apiClient(`/api/departments/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !active }) }); return { ok: true, value: active ? 'disabled' : 'enabled' }; }
    catch (error) { return failure(error, 'เปลี่ยนสถานะแผนกไม่สำเร็จ'); }
  }

  async saveService(input: Omit<ScheduleService, 'id' | 'isActive'>, _existing?: ScheduleService[], id?: string): Promise<SchedulingResult<ScheduleService>> {
    try {
      const row = await apiClient<ApiService>(id ? `/api/services/${id}` : '/api/services', { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ code: input.code.trim().toUpperCase(), name: input.name.trim(), description: input.description.trim() || null }) });
      return { ok: true, value: { id: row.id, code: row.code, name: row.name, description: row.description ?? '', isActive: row.is_active, hasHistory: Boolean(id) } };
    } catch (error) { return failure(error, 'บันทึกบริการไม่สำเร็จ'); }
  }

  async toggleService(id: string, active: boolean): Promise<SchedulingResult<'deleted' | 'disabled' | 'enabled'>> {
    try { await apiClient(`/api/services/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !active }) }); return { ok: true, value: active ? 'disabled' : 'enabled' }; }
    catch (error) { return failure(error, 'เปลี่ยนสถานะบริการไม่สำเร็จ'); }
  }

  async saveDoctor(input: Omit<ScheduleDoctor, 'id'>, _existing?: ScheduleDoctor[], id?: string): Promise<SchedulingResult<ScheduleDoctor>> {
    try {
      if (!id && !idPattern.test(input.profileId)) return { ok: false, error: 'รหัสบัญชีแพทย์ไม่ถูกต้อง' };
      const row = await apiClient<ApiDoctor>(id ? `/api/doctors/${id}` : '/api/doctors', { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ profileId: input.profileId, specialty: input.specialty, departmentId: input.departmentId }) });
      return { ok: true, value: { ...input, id: row.id, availability: input.availability ?? 'active' } };
    } catch (error) { return failure(error, 'บันทึกข้อมูลแพทย์ไม่สำเร็จ'); }
  }

  async toggleDoctor(id: string, availability: string): Promise<SchedulingResult<ScheduleDoctor | 'deleted'>> {
    try { await apiClient(`/api/doctors/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: availability === 'inactive' }) }); return { ok: true, value: { id, profileId: id, fullName: '', initials: '', email: '', specialty: '', departmentId: '', availability: availability === 'inactive' ? 'active' : 'inactive' } }; }
    catch (error) { return failure(error, 'เปลี่ยนสถานะแพทย์ไม่สำเร็จ'); }
  }

  async saveSlot(input: SlotInput, _existing?: ScheduleSlot[], _doctors?: ScheduleDoctor[], _services?: ScheduleService[], id?: string, ..._ignored: unknown[]): Promise<SchedulingResult<ScheduleSlot>> {
    void _ignored;
    try {
      const row = await apiClient<ApiSlot>(id ? `/api/schedules/slots/${id}` : '/api/schedules/slots', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) });
      const offering = single(row.offering);
      return { ok: true, value: { id: row.id, doctorId: row.doctor_id, serviceOfferingId: row.daily_service_offering_id ?? '', serviceId: row.service_id ?? offering?.service_id ?? input.serviceId, slotDate: row.slot_date, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), maxCapacity: row.max_capacity, bookedCount: row.booked_count ?? 0, status: row.status as ScheduleSlot['status'] } };
    } catch (error) { return failure(error, 'บันทึกรอบตรวจไม่สำเร็จ'); }
  }

  async createSlotBatch(input: SlotBatchInput, ..._ignored: unknown[]): Promise<SchedulingResult<number>> {
    void _ignored;
    try { const row = await apiClient<{ count: number }>('/api/schedules/slots', { method: 'POST', body: JSON.stringify(input) }); return { ok: true, value: row.count }; }
    catch (error) { return failure(error, 'สร้างรอบตรวจแบบชุดไม่สำเร็จ'); }
  }

  async saveDoctorLeave(input: DoctorLeaveInput, _existing?: DoctorLeave[], _doctors?: ScheduleDoctor[], id?: string, ..._ignored: unknown[]): Promise<SchedulingResult<DoctorLeave>> {
    void _ignored;
    try {
      const row = await apiClient<ApiLeave>(id ? `/api/doctors/leaves/${id}` : '/api/doctors/leaves', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(input) });
      return { ok: true, value: { id: row.id, doctorId: row.doctor_id, startDate: row.start_date, endDate: row.end_date, reason: row.reason ?? undefined, createdBy: row.created_by ?? undefined, createdAt: row.created_at ?? undefined } };
    } catch (error) { return failure(error, 'บันทึกวันลาไม่สำเร็จ'); }
  }

  async deleteDoctorLeave(id: string, existing: DoctorLeave[], ..._ignored: unknown[]): Promise<SchedulingResult<DoctorLeave>> {
    void _ignored;
    try { await apiClient(`/api/doctors/leaves/${id}`, { method: 'DELETE' }); return { ok: true, value: existing.find((leave) => leave.id === id) ?? { id, doctorId: '', startDate: '', endDate: '' } }; }
    catch (error) { return failure(error, 'ยกเลิกวันลาไม่สำเร็จ'); }
  }

  async toggleSlot(id: string, target: ScheduleSlot, ..._ignored: unknown[]): Promise<SchedulingResult<ScheduleSlot>> {
    void _ignored;
    try {
      const status = target.status === 'closed' ? 'available' : 'closed';
      const row = await apiClient<ApiSlot>(`/api/schedules/slots/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      return { ok: true, value: { ...target, status: row.status as ScheduleSlot['status'], closedReason: row.status === 'closed' ? 'manual' : undefined } };
    } catch (error) { return failure(error, 'เปลี่ยนสถานะรอบตรวจไม่สำเร็จ'); }
  }

  async generateSlotsForRange(..._ignored: unknown[]): Promise<SchedulingResult<number>> {
    void _ignored;
    return { ok: false, error: 'การสร้างรอบจากตารางประจำสัปดาห์ยังไม่มี Route Handler รองรับ' };
  }
}
