import {
  MOCK_DEPARTMENTS,
  MOCK_DOCTOR_ACCOUNT_OPTIONS,
  MOCK_DOCTORS,
  MOCK_DAILY_SERVICE_OFFERINGS,
  MOCK_SERVICES,
  MOCK_SLOTS,
} from '@/mocks/scheduleData';
import type {
  DailyServiceOffering,
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleService,
  ScheduleSlot,
  DoctorLeave,
  DoctorLeaveInput,
} from '@/types/schedule';
import type { UserRole } from '@/types/database';
import {
  deriveSlotStatus,
  isSlotExpired,
  validateDepartmentName,
  buildSlotBatchPlan,
  validateDoctorLeave,
  validateDoctorLeavePermission,
  validateSlotEditWindow,
  validateSlotPermission,
  validateSlot,
  type SchedulingResult,
  type SlotBatchInput,
  type SlotInput,
} from '../domain/rules';
import type { SchedulingRepository, SchedulingSnapshot } from '../domain/repository';

export class MockSchedulingRepository implements SchedulingRepository {
  private state: SchedulingSnapshot = {
    departments: structuredClone(MOCK_DEPARTMENTS),
    doctors: structuredClone(MOCK_DOCTORS),
    services: structuredClone(MOCK_SERVICES),
    dailyServiceOfferings: structuredClone(MOCK_DAILY_SERVICE_OFFERINGS),
    slots: structuredClone(MOCK_SLOTS),
    doctorAccounts: structuredClone(MOCK_DOCTOR_ACCOUNT_OPTIONS),
    doctorLeaves: [],
  };

  snapshot(): SchedulingSnapshot {
    return structuredClone(this.state);
  }

  saveDepartment(input: Omit<ScheduleDepartment, 'id' | 'isActive'>, id?: string): SchedulingResult<ScheduleDepartment> {
    const valid = validateDepartmentName(input.name, input.code, this.state.departments, id);
    if (!valid.ok) return valid;
    const existing = id ? this.state.departments.find((item) => item.id === id) : undefined;
    if (id && !existing) return { ok: false, error: 'ไม่พบแผนกที่ต้องการแก้ไข' };
    const code = input.code?.trim() ? input.code.trim().toUpperCase() : existing?.code ?? 'DEPT';
    const department: ScheduleDepartment = existing
      ? { ...existing, ...input, code }
      : { ...input, id: crypto.randomUUID(), code, isActive: true, hasHistory: false };
    this.state.departments = existing
      ? this.state.departments.map((item) => (item.id === id ? department : item))
      : [...this.state.departments, department];
    return { ok: true, value: department };
  }

  toggleDepartment(id: string): SchedulingResult<'deleted' | 'disabled' | 'enabled'> {
    const department = this.state.departments.find((item) => item.id === id);
    if (!department) return { ok: false, error: 'ไม่พบแผนก' };
    const referenced = department.hasHistory || this.state.doctors.some((item) => item.departmentId === id);
    if (department.isActive && !referenced) {
      this.state.departments = this.state.departments.filter((item) => item.id !== id);
      return { ok: true, value: 'deleted' };
    }
    this.state.departments = this.state.departments.map((item) => item.id === id ? { ...item, isActive: !item.isActive } : item);
    return { ok: true, value: department.isActive ? 'disabled' : 'enabled' };
  }

  saveService(input: Omit<ScheduleService, 'id' | 'isActive'>, id?: string): SchedulingResult<ScheduleService> {
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();
    if (!name || !code) return { ok: false, error: 'กรอกรหัสและชื่อบริการก่อนบันทึก' };
    const duplicate = this.state.services.some(
      (service) => service.id !== id && (service.code.toLowerCase() === code.toLowerCase() || service.name.trim().toLowerCase() === name.toLowerCase()),
    );
    if (duplicate) return { ok: false, error: 'รหัสหรือชื่อบริการนี้มีอยู่แล้ว' };
    const existing = id ? this.state.services.find((service) => service.id === id) : undefined;
    if (id && !existing) return { ok: false, error: 'ไม่พบบริการที่ต้องการแก้ไข' };
    const service: ScheduleService = existing
      ? { ...existing, ...input, code, name, description: input.description.trim() }
      : { ...input, id: crypto.randomUUID(), code, name, description: input.description.trim(), isActive: true, hasHistory: false };
    this.state.services = existing
      ? this.state.services.map((item) => (item.id === id ? service : item))
      : [...this.state.services, service];
    return { ok: true, value: service };
  }

  toggleService(id: string): SchedulingResult<'deleted' | 'disabled' | 'enabled'> {
    const service = this.state.services.find((item) => item.id === id);
    if (!service) return { ok: false, error: 'ไม่พบบริการ' };
    const referenced = service.hasHistory || this.state.dailyServiceOfferings.some((offering) => offering.serviceId === id);
    if (service.isActive && !referenced) {
      this.state.services = this.state.services.filter((item) => item.id !== id);
      return { ok: true, value: 'deleted' };
    }
    this.state.services = this.state.services.map((item) => item.id === id ? { ...item, isActive: !item.isActive } : item);
    return { ok: true, value: service.isActive ? 'disabled' : 'enabled' };
  }

  saveDoctor(input: Omit<ScheduleDoctor, 'id'>, id?: string): SchedulingResult<ScheduleDoctor> {
    if (!input.profileId || !input.departmentId || !input.specialty.trim()) {
      return { ok: false, error: 'เลือกบัญชีแพทย์ แผนก และกรอกความเชี่ยวชาญก่อนบันทึก' };
    }
    if (!this.state.departments.some((item) => item.id === input.departmentId && item.isActive)) {
      return { ok: false, error: 'เลือกแผนกที่เปิดใช้งาน' };
    }
    const existing = id ? this.state.doctors.find((item) => item.id === id) : undefined;
    if (id && !existing) return { ok: false, error: 'ไม่พบแพทย์ที่ต้องการแก้ไข' };
    if (this.state.doctors.some((item) => item.id !== id && item.profileId === input.profileId)) {
      return { ok: false, error: 'บัญชีแพทย์นี้ถูกผูกกับทะเบียนแล้ว', field: 'profileId' };
    }
    const doctor: ScheduleDoctor = existing
      ? { ...existing, ...input }
      : { ...input, id: crypto.randomUUID(), hasHistory: false };
    this.state.doctors = existing
      ? this.state.doctors.map((item) => (item.id === id ? doctor : item))
      : [...this.state.doctors, doctor];
    return { ok: true, value: doctor };
  }

  toggleDoctor(id: string): SchedulingResult<ScheduleDoctor | 'deleted'> {
    const doctor = this.state.doctors.find((item) => item.id === id);
    if (!doctor) return { ok: false, error: 'ไม่พบแพทย์' };
    const referenced = doctor.hasHistory || this.state.slots.some((slot) => slot.doctorId === id);
    if (doctor.availability !== 'inactive' && !referenced) {
      this.state.doctors = this.state.doctors.filter((item) => item.id !== id);
      return { ok: true, value: 'deleted' };
    }
    const next = { ...doctor, availability: doctor.availability === 'inactive' ? 'active' as const : 'inactive' as const };
    this.state.doctors = this.state.doctors.map((item) => item.id === id ? next : item);
    return { ok: true, value: next };
  }

  saveDoctorLeave(input: DoctorLeaveInput, id?: string, actorId?: string, role?: UserRole, todayDate?: string): SchedulingResult<DoctorLeave> {
    const existing = id ? this.state.doctorLeaves.find((leave) => leave.id === id) : undefined;
    if (id && !existing) return { ok: false, error: 'ไม่พบวันลาที่ต้องการแก้ไข' };
    const validation = validateDoctorLeave(input, this.state.doctorLeaves, this.state.doctors, id, actorId, role, todayDate);
    if (!validation.ok) return validation;

    const leave: DoctorLeave = existing
      ? { ...existing, ...validation.value }
      : {
          ...validation.value,
          id: crypto.randomUUID(),
          createdBy: actorId,
          createdAt: new Date().toISOString(),
        };
    this.state.doctorLeaves = existing
      ? this.state.doctorLeaves.map((item) => (item.id === id ? leave : item))
      : [...this.state.doctorLeaves, leave];
    return { ok: true, value: structuredClone(leave) };
  }

  deleteDoctorLeave(id: string, actorId?: string, role?: UserRole): SchedulingResult<DoctorLeave> {
    const leave = this.state.doctorLeaves.find((item) => item.id === id);
    if (!leave) return { ok: false, error: 'ไม่พบวันลาที่ต้องการยกเลิก' };
    const permission = validateDoctorLeavePermission(leave.doctorId, this.state.doctors, actorId, role);
    if (!permission.ok) return permission;
    this.state.doctorLeaves = this.state.doctorLeaves.filter((item) => item.id !== id);
    return { ok: true, value: structuredClone(leave) };
  }

  saveSlot(input: SlotInput, id?: string, todayDate?: string): SchedulingResult<ScheduleSlot> {
    const existing = id ? this.state.slots.find((item) => item.id === id) : undefined;
    if (id && !existing) return { ok: false, error: 'ไม่พบรอบตรวจที่ต้องการแก้ไข' };
    const editWindow = validateSlotEditWindow(existing, input, todayDate);
    if (!editWindow.ok) return editWindow;
    const bookedCount = existing?.bookedCount ?? 0;
    const valid = validateSlot(input, this.state.slots, this.state.doctors, this.state.services, id, bookedCount, todayDate, this.state.doctorLeaves);
    if (!valid.ok) return valid;
    const existingOffering = this.state.dailyServiceOfferings.find(
      (offering) => offering.serviceId === input.serviceId && offering.doctorId === input.doctorId && offering.offeringDate === input.slotDate,
    );
    const offering = existingOffering ?? {
      id: crypto.randomUUID(),
      serviceId: input.serviceId,
      doctorId: input.doctorId,
      offeringDate: input.slotDate,
      isActive: true,
      createdBy: 'mock',
    };
    if (!existingOffering) this.state.dailyServiceOfferings = [...this.state.dailyServiceOfferings, offering];
    const slot: ScheduleSlot = existing
      ? {
          ...existing,
          ...input,
          serviceOfferingId: offering.id,
          status: deriveSlotStatus(bookedCount, input.maxCapacity, existing.status, {
            slotDate: input.slotDate,
            startTime: input.startTime,
          }),
        }
      : {
          ...input,
          id: crypto.randomUUID(),
          serviceOfferingId: offering.id,
          bookedCount: 0,
          status: deriveSlotStatus(0, input.maxCapacity, undefined, {
            slotDate: input.slotDate,
            startTime: input.startTime,
          }),
          hasHistory: false,
        };
    this.state.slots = existing
      ? this.state.slots.map((item) => item.id === id ? slot : item)
      : [...this.state.slots, slot];
    return { ok: true, value: slot };
  }

  createSlotBatch(input: SlotBatchInput, todayDate?: string, actorId?: string, role?: UserRole): SchedulingResult<number> {
    const permission = validateSlotPermission(input.doctorId, this.state.doctors, actorId, role);
    if (!permission.ok) return permission;

    const plan = buildSlotBatchPlan(
      input,
      this.state.slots,
      this.state.doctors,
      this.state.services,
      todayDate,
      this.state.doctorLeaves,
    );
    if (!plan.ok) return plan;
    if (plan.value.slots.length === 0) return { ok: true, value: 0 };

    const offerings = new Map<string, DailyServiceOffering>();
    for (const slot of plan.value.slots) {
      const key = `${slot.serviceId}:${slot.doctorId}:${slot.slotDate}`;
      if (!offerings.has(key)) {
        offerings.set(key, this.state.dailyServiceOfferings.find(
          (item) => item.serviceId === slot.serviceId && item.doctorId === slot.doctorId && item.offeringDate === slot.slotDate,
        ) ?? {
          id: crypto.randomUUID(),
          serviceId: slot.serviceId,
          doctorId: slot.doctorId,
          offeringDate: slot.slotDate,
          isActive: true,
          createdBy: 'mock',
        });
      }
    }
    const newOfferings = [...offerings.values()].filter(
      (offering) => !this.state.dailyServiceOfferings.some((item) => item.id === offering.id),
    );
    const reopenedOfferingIds = new Set(
      [...offerings.values()]
        .filter((offering) => !offering.isActive)
        .map((offering) => offering.id),
    );
    const newSlots = plan.value.slots.map((slot) => {
      const offering = offerings.get(`${slot.serviceId}:${slot.doctorId}:${slot.slotDate}`);
      return {
        ...slot,
        id: crypto.randomUUID(),
        serviceOfferingId: offering?.id ?? '',
        bookedCount: 0,
        status: 'available' as const,
        hasHistory: false,
      };
    });
    this.state.dailyServiceOfferings = [
      ...this.state.dailyServiceOfferings.map((offering) =>
        reopenedOfferingIds.has(offering.id) ? { ...offering, isActive: true } : offering,
      ),
      ...newOfferings,
    ];
    this.state.slots = [...this.state.slots, ...newSlots];
    return { ok: true, value: newSlots.length };
  }

  toggleSlot(id: string, actorId?: string, role?: UserRole): SchedulingResult<ScheduleSlot> {
    const slot = this.state.slots.find((item) => item.id === id);
    if (!slot) return { ok: false, error: 'ไม่พบรอบตรวจ' };

    if (role === 'medical' && actorId) {
      const doctor = this.state.doctors.find((d) => d.profileId === actorId || d.id === actorId);
      if (!doctor || slot.doctorId !== doctor.id) {
        return { ok: false, error: 'ไม่มีสิทธิ์จัดการรอบตรวจของแพทย์ท่านอื่น' };
      }
    }

    if (slot.status === 'closed' && slot.closedReason === 'doctor_leave') return { ok: false, error: 'รอบนี้ปิดอัตโนมัติจากวันลา ต้องจัดการที่คำขอวันลา' };
    if (slot.status === 'closed') {
      if (isSlotExpired(slot.slotDate, slot.startTime)) {
        return { ok: false, error: 'ไม่สามารถเปิดรอบตรวจที่เลยเวลาเริ่มแล้ว' };
      }
      if (slot.bookedCount >= slot.maxCapacity) {
        return { ok: false, error: 'ไม่สามารถเปิดรอบตรวจที่คนเต็มแล้ว' };
      }
    }
    const next = slot.status === 'closed'
      ? {
          ...slot,
          status: deriveSlotStatus(slot.bookedCount, slot.maxCapacity, undefined, {
            slotDate: slot.slotDate,
            startTime: slot.startTime,
          }),
          closedReason: undefined,
        }
      : { ...slot, status: 'closed' as const, closedReason: 'manual' as const };
    this.state.slots = this.state.slots.map((item) => item.id === id ? next : item);
    return { ok: true, value: next };
  }

}
