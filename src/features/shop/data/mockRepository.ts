import { MOCK_DEPARTMENTS, MOCK_DOCTORS, MOCK_SLOTS } from '@/mocks/scheduleData';
import type { ScheduleDepartment, ScheduleDoctor, ScheduleSlot } from '@/types/schedule';
import {
  deriveSlotStatus,
  validateDepartmentName,
  validateSlot,
  type ShopResult,
  type SlotInput,
} from '../domain/rules';

export interface ShopSnapshot {
  departments: ScheduleDepartment[];
  doctors: ScheduleDoctor[];
  slots: ScheduleSlot[];
}

export class MockShopRepository {
  private state: ShopSnapshot = {
    departments: structuredClone(MOCK_DEPARTMENTS),
    doctors: structuredClone(MOCK_DOCTORS),
    slots: structuredClone(MOCK_SLOTS),
  };

  snapshot(): ShopSnapshot {
    return structuredClone(this.state);
  }

  saveDepartment(input: Omit<ScheduleDepartment, 'id' | 'isActive'>, id?: string): ShopResult<ScheduleDepartment> {
    const valid = validateDepartmentName(input.name, input.code, this.state.departments, id);
    if (!valid.ok) return valid;
    const existing = id ? this.state.departments.find((item) => item.id === id) : undefined;
    const department: ScheduleDepartment = existing
      ? { ...existing, ...input, code: input.code.toUpperCase() }
      : { ...input, id: crypto.randomUUID(), code: input.code.toUpperCase(), isActive: true, hasHistory: false };
    this.state.departments = existing
      ? this.state.departments.map((item) => (item.id === id ? department : item))
      : [...this.state.departments, department];
    return { ok: true, value: department };
  }

  toggleDepartment(id: string): ShopResult<'deleted' | 'disabled' | 'enabled'> {
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

  saveDoctor(input: Omit<ScheduleDoctor, 'id'>, id?: string): ShopResult<ScheduleDoctor> {
    if (!input.profileId || !input.departmentId || !input.specialty.trim()) {
      return { ok: false, error: 'เลือกบัญชีแพทย์ แผนก และกรอกความเชี่ยวชาญก่อนบันทึก' };
    }
    if (!this.state.departments.some((item) => item.id === input.departmentId && item.isActive)) {
      return { ok: false, error: 'เลือกแผนกที่เปิดใช้งาน' };
    }
    const existing = id ? this.state.doctors.find((item) => item.id === id) : undefined;
    const doctor: ScheduleDoctor = existing
      ? { ...existing, ...input }
      : { ...input, id: crypto.randomUUID(), hasHistory: false };
    this.state.doctors = existing
      ? this.state.doctors.map((item) => (item.id === id ? doctor : item))
      : [...this.state.doctors, doctor];
    return { ok: true, value: doctor };
  }

  toggleDoctor(id: string): ShopResult<ScheduleDoctor> {
    const doctor = this.state.doctors.find((item) => item.id === id);
    if (!doctor) return { ok: false, error: 'ไม่พบแพทย์' };
    const next = { ...doctor, availability: doctor.availability === 'inactive' ? 'active' as const : 'inactive' as const };
    this.state.doctors = this.state.doctors.map((item) => item.id === id ? next : item);
    return { ok: true, value: next };
  }

  saveSlot(input: SlotInput, id?: string): ShopResult<ScheduleSlot> {
    const existing = id ? this.state.slots.find((item) => item.id === id) : undefined;
    const bookedCount = existing?.bookedCount ?? 0;
    const valid = validateSlot(input, this.state.slots, this.state.doctors, this.state.departments, id, bookedCount);
    if (!valid.ok) return valid;
    const slot: ScheduleSlot = existing
      ? { ...existing, ...input, status: deriveSlotStatus(bookedCount, input.maxCapacity, existing.status) }
      : { ...input, id: crypto.randomUUID(), bookedCount: 0, status: 'available', hasHistory: false };
    this.state.slots = existing
      ? this.state.slots.map((item) => item.id === id ? slot : item)
      : [...this.state.slots, slot];
    return { ok: true, value: slot };
  }

  toggleSlot(id: string): ShopResult<ScheduleSlot> {
    const slot = this.state.slots.find((item) => item.id === id);
    if (!slot) return { ok: false, error: 'ไม่พบรอบตรวจ' };
    const next = { ...slot, status: slot.status === 'closed' ? deriveSlotStatus(slot.bookedCount, slot.maxCapacity) : 'closed' as const };
    this.state.slots = this.state.slots.map((item) => item.id === id ? next : item);
    return { ok: true, value: next };
  }
}
