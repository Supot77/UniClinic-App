import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DailyServiceOffering,
  DoctorAccountOption,
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleService,
  ScheduleSlot,
  ScheduleSlotStatus,
  DoctorLeave,
  DoctorLeaveInput,
} from '@/types/schedule';
import type { UserRole } from '@/types/database';
import { formatProfileName, getProfileInitial } from '@/lib/profileName';
import type { SchedulingResult, SlotBatchInput, SlotInput } from '../domain/rules';
import {
  buildSlotBatchPlan,
  deriveSlotStatus,
  getBangkokCurrentTime,
  getBangkokToday,
  isSlotExpired,
  validateDepartmentName,
  validateDoctorLeave,
  validateDoctorLeavePermission,
  validateSlotEditWindow,
  validateSlotPermission,
  validateSlot,
} from '../domain/rules';

export interface DatabaseSchedulingSnapshot {
  departments: ScheduleDepartment[];
  doctors: ScheduleDoctor[];
  services: ScheduleService[];
  dailyServiceOfferings: DailyServiceOffering[];
  slots: ScheduleSlot[];
  doctorAccounts: DoctorAccountOption[];
  doctorLeaves: DoctorLeave[];
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export class DatabaseSchedulingRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async fetchDepartments(): Promise<ScheduleDepartment[]> {
    const { data, error } = await this.client
      .from('departments')
      .select('id, name, description, is_active, created_at, updated_at')
      .order('name', { ascending: true });

    if (error || !data) {
      console.error('Error fetching departments:', error);
      return [];
    }

    return data.map((row: { id: string; name: string; description: string | null; is_active: boolean }) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      isActive: row.is_active ?? true,
      hasHistory: true,
    }));
  }

  async fetchServices(throwOnError = false): Promise<ScheduleService[]> {
    const { data, error } = await this.client
      .from('services')
      .select('id, code, name, description, is_active, created_at, updated_at')
      .order('name', { ascending: true });

    if (error || !data) {
      if (throwOnError) throw error ?? new Error('ไม่พบรายการบริการ');
      console.error('Error fetching services:', error);
      return [];
    }

    return data.map((row: { id: string; code: string; name: string; description: string | null; is_active: boolean }) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      isActive: row.is_active ?? true,
      hasHistory: true,
    }));
  }

  async fetchDailyServiceOfferings(): Promise<DailyServiceOffering[]> {
    const { data, error } = await this.client
      .from('daily_service_offerings')
      .select('id, service_id, doctor_id, offering_date, is_active, created_by')
      .order('offering_date', { ascending: true });

    if (error || !data) {
      console.error('Error fetching daily service offerings:', error);
      return [];
    }

    return data.map((row: { id: string; service_id: string; doctor_id: string; offering_date: string; is_active: boolean; created_by: string | null }) => ({
      id: row.id,
      serviceId: row.service_id,
      doctorId: row.doctor_id,
      offeringDate: row.offering_date,
      isActive: row.is_active ?? true,
      createdBy: row.created_by ?? undefined,
    }));
  }

  async fetchDoctors(): Promise<ScheduleDoctor[]> {
    const { data, error } = await this.client
      .from('doctors')
      .select(`
        id,
        specialty,
        department_id,
        profile:profiles!doctors_id_fkey (
          id,
          title,
          first_name,
          last_name,
          role,
          is_active
        )
      `)
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.error('Error fetching doctors:', error);
      return [];
    }

    interface DoctorRow {
      id: string;
      specialty: string | null;
      department_id: string | null;
      profile:
        | {
            id: string;
            title: string | null;
            first_name: string;
            last_name: string;
            role: string;
            is_active: boolean;
          }
        | Array<{
            id: string;
            title: string | null;
            first_name: string;
            last_name: string;
            role: string;
            is_active: boolean;
          }>
        | null;
    }

    return (data as unknown as DoctorRow[]).map((row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      const rawFullName = formatProfileName(profile);
      const fullName = rawFullName || 'ไม่ระบุชื่อ';
      const initials = rawFullName ? getProfileInitial(profile).toUpperCase() : 'DR';

      return {
        id: row.id,
        profileId: row.id,
        fullName,
        email: '',
        initials,
        specialty: row.specialty ?? '',
        departmentId: row.department_id ?? '',
        availability: profile?.is_active === false ? ('inactive' as const) : ('active' as const),
        hasHistory: true,
      };
    });
  }

  async fetchDoctorAccounts(): Promise<DoctorAccountOption[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, title, first_name, last_name, role, is_active')
      .eq('role', 'medical')
      .eq('is_active', true)
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true });

    if (error || !data) {
      console.error('Error fetching doctor accounts:', error);
      return [];
    }

    return data.map((row: { id: string; title: string | null; first_name: string; last_name: string }) => {
      const fullName = formatProfileName(row) || 'ไม่ระบุชื่อ';
      const initials = getProfileInitial(row).toUpperCase() || 'MD';

      return {
        profileId: row.id,
        fullName,
        email: '',
        initials,
      };
    });
  }

  async fetchDoctorLeaves(): Promise<DoctorLeave[]> {
    const { data, error } = await this.client
      .from('doctor_leaves')
      .select('id, doctor_id, start_date, end_date, reason, created_by, created_at')
      .order('start_date', { ascending: true });

    if (error || !data) {
      console.error('Error fetching doctor leaves:', error);
      return [];
    }

    return data.map((row: {
      id: string;
      doctor_id: string;
      start_date: string;
      end_date: string;
      reason: string | null;
      created_by: string | null;
      created_at: string | null;
    }) => ({
      id: row.id,
      doctorId: row.doctor_id,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason ?? undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at ?? undefined,
    }));
  }

  async saveDoctorLeave(
    input: DoctorLeaveInput,
    existingLeaves: DoctorLeave[],
    doctors: ScheduleDoctor[],
    id?: string,
    actorId?: string,
    role?: UserRole,
    todayDate?: string,
  ): Promise<SchedulingResult<DoctorLeave>> {
    if (id && !isValidUUID(id)) return { ok: false, error: 'รหัสวันลาไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
    const validation = validateDoctorLeave(input, existingLeaves, doctors, id, actorId, role, todayDate);
    if (!validation.ok) return validation;

    const payload = {
      doctor_id: validation.value.doctorId,
      start_date: validation.value.startDate,
      end_date: validation.value.endDate,
      reason: validation.value.reason ?? null,
      ...(actorId && isValidUUID(actorId) ? { created_by: actorId } : {}),
    };
    const query = id
      ? this.client.from('doctor_leaves').update(payload).eq('id', id)
      : this.client.from('doctor_leaves').insert(payload);
    const { data, error } = await query
      .select('id, doctor_id, start_date, end_date, reason, created_by, created_at')
      .single();

    if (error || !data) {
      const message = error?.code === '23P01'
        ? 'ช่วงวันลาซ้ำซ้อนกับวันลาเดิมของแพทย์'
        : error?.message || 'ไม่สามารถบันทึกวันลาแพทย์ได้';
      return { ok: false, error: message };
    }
    return {
      ok: true,
      value: {
        id: data.id,
        doctorId: data.doctor_id,
        startDate: data.start_date,
        endDate: data.end_date,
        reason: data.reason ?? undefined,
        createdBy: data.created_by ?? undefined,
        createdAt: data.created_at ?? undefined,
      },
    };
  }

  async deleteDoctorLeave(
    id: string,
    existingLeaves: DoctorLeave[],
    doctors: ScheduleDoctor[],
    actorId?: string,
    role?: UserRole,
  ): Promise<SchedulingResult<DoctorLeave>> {
    if (!isValidUUID(id)) return { ok: false, error: 'รหัสวันลาไม่ถูกต้องตามระบบฐานข้อมูล (ต้องเป็น UUID)' };
    const target = existingLeaves.find((leave) => leave.id === id);
    if (!target) return { ok: false, error: 'ไม่พบวันลาที่ต้องการยกเลิก' };
    const permission = validateDoctorLeavePermission(target.doctorId, doctors, actorId, role);
    if (!permission.ok) return permission;

    const { data, error } = await this.client
      .from('doctor_leaves')
      .delete()
      .eq('id', id)
      .select('id, doctor_id, start_date, end_date, reason, created_by, created_at')
      .single();
    if (error || !data) return { ok: false, error: error?.message || 'ไม่สามารถยกเลิกวันลาแพทย์ได้' };
    return {
      ok: true,
      value: {
        id: data.id,
        doctorId: data.doctor_id,
        startDate: data.start_date,
        endDate: data.end_date,
        reason: data.reason ?? undefined,
        createdBy: data.created_by ?? undefined,
        createdAt: data.created_at ?? undefined,
      },
    };
  }

  async saveDepartment(
    input: Omit<ScheduleDepartment, 'id' | 'isActive'>,
    existingDepartments: ScheduleDepartment[],
    id?: string,
  ): Promise<SchedulingResult<ScheduleDepartment>> {
    const validation = validateDepartmentName(input.name, input.code, existingDepartments, id);
    if (!validation.ok) return validation;

    if (id) {
      const { data, error } = await this.client
        .from('departments')
        .update({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, name, description, is_active')
        .single();

      if (error) return { ok: false, error: error.message || 'ไม่สามารถแก้ไขแผนกได้' };
      return {
        ok: true,
        value: {
          id: data.id,
          name: data.name,
          description: data.description ?? '',
          isActive: data.is_active ?? true,
        },
      };
    }

    const { data, error } = await this.client
      .from('departments')
      .insert({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        is_active: true,
      })
      .select('id, name, description, is_active')
      .single();

    if (error) return { ok: false, error: error.message || 'ไม่สามารถเพิ่มแผนกได้' };
    return {
      ok: true,
      value: {
        id: data.id,
        name: data.name,
        description: data.description ?? '',
        isActive: data.is_active ?? true,
      },
    };
  }

  async toggleDepartment(
    id: string,
    currentActive: boolean,
  ): Promise<SchedulingResult<'deleted' | 'disabled' | 'enabled'>> {
    const nextState = !currentActive;
    const { data, error } = await this.client
      .from('departments')
      .update({
        is_active: nextState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, is_active');

    if (error) return { ok: false, error: error.message || 'ไม่สามารถเปลี่ยนสถานะแผนกได้' };
    if (!data || data.length === 0) {
      return { ok: false, error: 'ไม่พบข้อมูลแผนก หรือไม่มีสิทธิ์แก้ไขสถานะ (ต้องเป็น staff_admin)' };
    }
    return { ok: true, value: nextState ? 'enabled' : 'disabled' };
  }

  async saveService(
    input: Omit<ScheduleService, 'id' | 'isActive'>,
    existingServices: ScheduleService[],
    id?: string,
  ): Promise<SchedulingResult<ScheduleService>> {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    if (!code || !name) return { ok: false, error: 'กรอกรหัสและชื่อบริการก่อนบันทึก' };
    if (existingServices.some((service) => service.id !== id && (service.code.toLowerCase() === code.toLowerCase() || service.name.trim().toLowerCase() === name.toLowerCase()))) {
      return { ok: false, error: 'รหัสหรือชื่อบริการนี้มีอยู่แล้ว' };
    }

    const payload = {
      code,
      name,
      description: input.description.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const query = id
      ? this.client.from('services').update(payload).eq('id', id)
      : this.client.from('services').insert({ ...payload, is_active: true });
    const { data, error } = await query.select('id, code, name, description, is_active').single();
    if (error || !data) return { ok: false, error: error?.message || 'ไม่สามารถบันทึกบริการได้' };
    return {
      ok: true,
      value: {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description ?? '',
        isActive: data.is_active ?? true,
        hasHistory: Boolean(id),
      },
    };
  }

  async toggleService(
    id: string,
    currentActive: boolean,
  ): Promise<SchedulingResult<'deleted' | 'disabled' | 'enabled'>> {
    const { data, error } = await this.client
      .from('services')
      .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, is_active');
    if (error) return { ok: false, error: error.message || 'ไม่สามารถเปลี่ยนสถานะบริการได้' };
    if (!data || data.length === 0) return { ok: false, error: 'ไม่พบบริการ หรือไม่มีสิทธิ์แก้ไขบริการนี้' };
    return { ok: true, value: currentActive ? 'disabled' : 'enabled' };
  }

  async saveDoctor(
    input: Omit<ScheduleDoctor, 'id'>,
    existingDoctors: ScheduleDoctor[],
    id?: string,
  ): Promise<SchedulingResult<ScheduleDoctor>> {
    if (!input.profileId || !input.departmentId || !input.specialty?.trim()) {
      return { ok: false, error: 'เลือกบัญชีแพทย์ แผนก และกรอกความเชี่ยวชาญก่อนบันทึก' };
    }

    if (id) {
      const { error } = await this.client
        .from('doctors')
        .update({
          specialty: input.specialty.trim(),
          department_id: input.departmentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) return { ok: false, error: error.message || 'ไม่สามารถแก้ไขแพทย์ได้' };
      const current = existingDoctors.find((d) => d.id === id);
      return {
        ok: true,
        value: {
          ...input,
          id,
          fullName: current?.fullName ?? input.fullName,
          initials: current?.initials ?? input.initials,
          availability: current?.availability ?? input.availability,
        },
      };
    }

    // Insert new doctor mapping
    const { error } = await this.client
      .from('doctors')
      .insert({
        id: input.profileId,
        specialty: input.specialty.trim(),
        department_id: input.departmentId,
      });

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'บัญชีแพทย์นี้ถูกผูกกับทะเบียนแล้ว', field: 'profileId' };
      }
      return { ok: false, error: error.message || 'ไม่สามารถเพิ่มแพทย์ได้' };
    }

    return {
      ok: true,
      value: {
        ...input,
        id: input.profileId,
        availability: 'active',
      },
    };
  }

  async toggleDoctor(
    id: string,
    currentAvailability: string,
  ): Promise<SchedulingResult<ScheduleDoctor | 'deleted'>> {
    const nextIsActive = currentAvailability === 'inactive';
    const { data, error } = await this.client
      .from('profiles')
      .update({
        is_active: nextIsActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, is_active');

    if (error) return { ok: false, error: error.message || 'ไม่สามารถเปลี่ยนสถานะแพทย์ได้' };
    if (!data || data.length === 0) {
      return { ok: false, error: 'ไม่พบบัญชีแพทย์ หรือไม่มีสิทธิ์แก้ไขสถานะแพทย์นี้' };
    }

    return {
      ok: true,
      value: {
        id,
        profileId: id,
        fullName: '',
        email: '',
        initials: '',
        specialty: '',
        departmentId: '',
        availability: nextIsActive ? 'active' : 'inactive',
      },
    };
  }

  async fetchSlots(): Promise<ScheduleSlot[]> {
    const { data, error } = await this.client.rpc('get_schedule_slots');

    if (error || !data) {
      console.error('Error fetching schedule slots:', error);
      return [];
    }

    return data.map((row: {
      id: string;
      doctor_id: string;
      daily_service_offering_id: string;
      service_id: string;
      slot_date: string;
      start_time: string;
      end_time: string;
      max_capacity: number;
      booked_count: number;
      status: string;
    }) => ({
      id: row.id,
      doctorId: row.doctor_id,
      serviceOfferingId: row.daily_service_offering_id,
      serviceId: row.service_id,
      slotDate: row.slot_date,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      maxCapacity: row.max_capacity,
      bookedCount: row.booked_count ?? 0,
      status: row.status as ScheduleSlotStatus,
      hasHistory: (row.booked_count ?? 0) > 0,
      closedReason: row.status === 'closed' ? ('manual' as const) : undefined,
    }));
  }

  async saveSlot(
    input: SlotInput,
    existingSlots: ScheduleSlot[],
    doctors: ScheduleDoctor[],
    services: ScheduleService[],
    id?: string,
    todayDate?: string,
    doctorLeaves: DoctorLeave[] = [],
  ): Promise<SchedulingResult<ScheduleSlot>> {
    if (!isValidUUID(input.doctorId)) {
      return {
        ok: false,
        error: 'ไอดีแพทย์ไม่ถูกต้อง (เป็นข้อมูลจำลอง Mock ไม่สามารถบันทึกลงฐานข้อมูลจริงได้ กรุณาเลือกแพทย์จริงในระบบ)',
        field: 'doctorId',
      };
    }

    const existing = id ? existingSlots.find((item) => item.id === id) : undefined;
    if (id && !existing) return { ok: false, error: 'ไม่พบรอบตรวจที่ต้องการแก้ไข' };
    const editWindow = validateSlotEditWindow(existing, input, todayDate);
    if (!editWindow.ok) return editWindow;
    const bookedCount = existing?.bookedCount ?? 0;
    const valid = validateSlot(input, existingSlots, doctors, services, id, bookedCount, todayDate, doctorLeaves, getBangkokCurrentTime());
    if (!valid.ok) return valid;

    const nextStatus = deriveSlotStatus(bookedCount, input.maxCapacity, existing?.status, {
      slotDate: input.slotDate,
      startTime: input.startTime,
      currentDate: todayDate,
    });

    const { data: offering, error: offeringError } = await this.client
      .from('daily_service_offerings')
      .upsert(
        {
          service_id: input.serviceId,
          doctor_id: input.doctorId,
          offering_date: input.slotDate,
          is_active: true,
        },
        { onConflict: 'service_id,doctor_id,offering_date' },
      )
      .select('id, service_id, doctor_id, offering_date, is_active, created_by')
      .single();
    if (offeringError || !offering) {
      return { ok: false, error: offeringError?.message || 'ไม่สามารถเตรียมบริการสำหรับวันที่เลือกได้' };
    }

    const offeringId = offering.id as string;

    if (id) {
      const { data, error } = await this.client
        .from('appointment_slots')
        .update({
          doctor_id: input.doctorId,
          daily_service_offering_id: offeringId,
          slot_date: input.slotDate,
          start_time: input.startTime,
          end_time: input.endTime,
          max_capacity: input.maxCapacity,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, doctor_id, daily_service_offering_id, slot_date, start_time, end_time, max_capacity, booked_count, status')
        .single();

      if (error) return { ok: false, error: error.message || 'ไม่สามารถแก้ไขรอบตรวจได้' };
      return {
        ok: true,
        value: {
          id: data.id,
          doctorId: data.doctor_id,
          serviceOfferingId: data.daily_service_offering_id,
          serviceId: input.serviceId,
          slotDate: data.slot_date,
          startTime: data.start_time.slice(0, 5),
          endTime: data.end_time.slice(0, 5),
          maxCapacity: data.max_capacity,
          bookedCount: data.booked_count ?? 0,
          status: data.status as ScheduleSlotStatus,
          hasHistory: (data.booked_count ?? 0) > 0,
        },
      };
    }

    const { data, error } = await this.client
      .from('appointment_slots')
      .insert({
        doctor_id: input.doctorId,
        daily_service_offering_id: offeringId,
        slot_date: input.slotDate,
        start_time: input.startTime,
        end_time: input.endTime,
        max_capacity: input.maxCapacity,
        booked_count: 0,
        status: 'available',
      })
      .select('id, doctor_id, daily_service_offering_id, slot_date, start_time, end_time, max_capacity, booked_count, status')
      .single();

    if (error) return { ok: false, error: error.message || 'ไม่สามารถสร้างรอบตรวจได้' };
    return {
      ok: true,
      value: {
        id: data.id,
        doctorId: data.doctor_id,
        serviceOfferingId: data.daily_service_offering_id,
        serviceId: input.serviceId,
        slotDate: data.slot_date,
        startTime: data.start_time.slice(0, 5),
        endTime: data.end_time.slice(0, 5),
        maxCapacity: data.max_capacity,
        bookedCount: data.booked_count ?? 0,
        status: data.status as ScheduleSlotStatus,
        hasHistory: false,
      },
    };
  }

  async createSlotBatch(
    input: SlotBatchInput,
    existingSlots: ScheduleSlot[],
    doctors: ScheduleDoctor[],
    services: ScheduleService[],
    doctorLeaves: DoctorLeave[] = [],
    todayDate?: string,
    actorId?: string,
    role?: UserRole,
  ): Promise<SchedulingResult<number>> {
    if (!isValidUUID(input.doctorId)) {
      return { ok: false, error: 'ไอดีแพทย์ไม่ถูกต้อง (ต้องเลือกแพทย์จริงในระบบ)', field: 'doctorId' };
    }

    const permission = validateSlotPermission(input.doctorId, doctors, actorId, role);
    if (!permission.ok) return permission;

    const plan = buildSlotBatchPlan(input, existingSlots, doctors, services, todayDate, doctorLeaves, getBangkokCurrentTime());
    if (!plan.ok) return plan;
    if (plan.value.slots.length === 0) return { ok: true, value: 0 };

    const effectiveToday = todayDate ?? getBangkokToday();
    const currentTime = getBangkokCurrentTime();
    const dates = [...new Set(input.dates)].sort();
    const todayDates = dates.filter((date) => date === effectiveToday);
    const futureDates = dates.filter((date) => date > effectiveToday);
    const todayBlocks = input.timeBlocks.filter((block) => block.startTime >= currentTime);
    const requests = [
      ...(todayDates.length && todayBlocks.length ? [{ dates: todayDates, timeBlocks: todayBlocks }] : []),
      ...(futureDates.length ? [{ dates: futureDates, timeBlocks: input.timeBlocks }] : []),
    ];
    let createdCount = 0;

    for (const request of requests) {
      const { data, error } = await this.client.rpc('create_appointment_slot_batch', {
        p_doctor_id: input.doctorId,
        p_service_id: input.serviceId,
        p_dates: request.dates,
        p_time_blocks: request.timeBlocks.map((block) => ({
          start_time: block.startTime,
          end_time: block.endTime,
          max_capacity: block.maxCapacity,
        })),
      });

      if (error) {
        if (error.code === 'PGRST202' || error.code === '42883') {
          return { ok: false, error: 'ยังไม่พร้อมใช้งาน กรุณาติดตั้ง migration 24_batch_create_slots.sql ใน Supabase ก่อน' };
        }
        return { ok: false, error: error.message || 'ไม่สามารถสร้างรอบตรวจหลายวันได้' };
      }

      const requestCount = typeof data === 'number' ? data : Number(data);
      if (!Number.isFinite(requestCount)) return { ok: false, error: 'ผลลัพธ์การสร้างรอบตรวจไม่ถูกต้อง' };
      createdCount += requestCount;
    }

    return { ok: true, value: createdCount };
  }

  async toggleSlot(
    id: string,
    currentSlot: ScheduleSlot,
    actorId?: string,
    role?: UserRole,
  ): Promise<SchedulingResult<ScheduleSlot>> {
    if (role === 'medical' && actorId && currentSlot.doctorId !== actorId) {
      return { ok: false, error: 'ไม่มีสิทธิ์จัดการรอบตรวจของแพทย์ท่านอื่น' };
    }

    if (currentSlot.status === 'closed' && currentSlot.closedReason === 'doctor_leave') {
      return { ok: false, error: 'รอบนี้ปิดอัตโนมัติจากวันลา ต้องจัดการที่คำขอวันลา' };
    }

    if (currentSlot.status === 'closed') {
      if (isSlotExpired(currentSlot.slotDate, currentSlot.startTime)) {
        return { ok: false, error: 'ไม่สามารถเปิดรอบตรวจที่เลยเวลาเริ่มแล้ว' };
      }
      if (currentSlot.bookedCount >= currentSlot.maxCapacity) {
        return { ok: false, error: 'ไม่สามารถเปิดรอบตรวจที่คนเต็มแล้ว' };
      }
    }

    const nextStatus: ScheduleSlotStatus =
      currentSlot.status === 'closed'
        ? deriveSlotStatus(currentSlot.bookedCount, currentSlot.maxCapacity, undefined, {
            slotDate: currentSlot.slotDate,
            startTime: currentSlot.startTime,
          })
        : 'closed';

    const { data, error } = await this.client
      .from('appointment_slots')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, doctor_id, slot_date, start_time, end_time, max_capacity, booked_count, status')
      .single();

    if (error) return { ok: false, error: error.message || 'ไม่สามารถเปลี่ยนสถานะรอบตรวจได้' };
    return {
      ok: true,
      value: {
        ...currentSlot,
        status: data.status as ScheduleSlotStatus,
        closedReason: data.status === 'closed' ? ('manual' as const) : undefined,
      },
    };
  }

}
