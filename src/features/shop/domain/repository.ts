import type {
  DoctorAccountOption,
  DailyServiceOffering,
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleService,
  ScheduleSlot,
  DoctorWeeklySchedule,
  DoctorAvailabilityTemplate,
  DoctorLeave,
  DoctorLeaveInput,
} from '@/types/schedule';
import type { UserRole } from '@/types/database';
import type { ShopResult, SlotBatchInput, SlotInput } from './rules';

export interface ShopSnapshot {
  departments: ScheduleDepartment[];
  doctors: ScheduleDoctor[];
  services: ScheduleService[];
  dailyServiceOfferings: DailyServiceOffering[];
  slots: ScheduleSlot[];
  doctorAccounts: DoctorAccountOption[];
  weeklySchedules: DoctorWeeklySchedule[];
  doctorLeaves: DoctorLeave[];
  availabilityTemplates?: DoctorAvailabilityTemplate[];
}

/**
 * Boundary consumed by the UI. ShopProvider composes the database adapter for
 * configured runtime sessions and keeps this mock implementation for tests/offline demos.
 */
export interface ShopRepository {
  snapshot(): ShopSnapshot;
  saveDepartment(
    input: Omit<ScheduleDepartment, 'id' | 'isActive'>,
    id?: string,
  ): ShopResult<ScheduleDepartment>;
  toggleDepartment(id: string): ShopResult<'deleted' | 'disabled' | 'enabled'>;
  saveService(input: Omit<ScheduleService, 'id' | 'isActive'>, id?: string): ShopResult<ScheduleService>;
  toggleService(id: string): ShopResult<'deleted' | 'disabled' | 'enabled'>;
  saveDoctor(input: Omit<ScheduleDoctor, 'id'>, id?: string): ShopResult<ScheduleDoctor>;
  toggleDoctor(id: string): ShopResult<ScheduleDoctor | 'deleted'>;
  saveDoctorLeave(input: DoctorLeaveInput, id?: string, actorId?: string, role?: UserRole, todayDate?: string): ShopResult<DoctorLeave>;
  deleteDoctorLeave(id: string, actorId?: string, role?: UserRole): ShopResult<DoctorLeave>;
  saveSlot(input: SlotInput, id?: string, todayDate?: string): ShopResult<ScheduleSlot>;
  createSlotBatch(input: SlotBatchInput, todayDate?: string, actorId?: string, role?: UserRole): ShopResult<number>;
  toggleSlot(id: string, actorId?: string, role?: UserRole): ShopResult<ScheduleSlot>;
  saveWeeklySchedule(input: Omit<DoctorWeeklySchedule, 'id'>, id?: string): ShopResult<DoctorWeeklySchedule>;
  generateSlotsForRange(startDate: string, endDate: string, today: string, serviceId?: string): ShopResult<number>;
  getDoctorTemplates(doctorId: string): DoctorAvailabilityTemplate[];
  saveDoctorTemplate(input: Omit<DoctorAvailabilityTemplate, 'id' | 'usageCount' | 'lastUsedAt'>): ShopResult<DoctorAvailabilityTemplate>;
}
