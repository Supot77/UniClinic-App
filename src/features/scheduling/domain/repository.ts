import type {
  DoctorAccountOption,
  DailyServiceOffering,
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleService,
  ScheduleSlot,
  DoctorLeave,
  DoctorLeaveInput,
} from '@/types/schedule';
import type { UserRole } from '@/types/database';
import type { SchedulingResult, SlotBatchInput, SlotInput } from './rules';

export interface SchedulingSnapshot {
  departments: ScheduleDepartment[];
  doctors: ScheduleDoctor[];
  services: ScheduleService[];
  dailyServiceOfferings: DailyServiceOffering[];
  slots: ScheduleSlot[];
  doctorAccounts: DoctorAccountOption[];
  doctorLeaves: DoctorLeave[];
}

/**
 * Boundary consumed by the UI. Production scheduling data comes from the API repository;
 * tests may supply a mock implementation explicitly through their test setup.
 */
export interface SchedulingRepository {
  snapshot(): SchedulingSnapshot;
  saveDepartment(
    input: Omit<ScheduleDepartment, 'id' | 'isActive'>,
    id?: string,
  ): SchedulingResult<ScheduleDepartment>;
  toggleDepartment(id: string): SchedulingResult<'deleted' | 'disabled' | 'enabled'>;
  saveService(input: Omit<ScheduleService, 'id' | 'isActive'>, id?: string): SchedulingResult<ScheduleService>;
  toggleService(id: string): SchedulingResult<'deleted' | 'disabled' | 'enabled'>;
  saveDoctor(input: Omit<ScheduleDoctor, 'id'>, id?: string): SchedulingResult<ScheduleDoctor>;
  toggleDoctor(id: string): SchedulingResult<ScheduleDoctor | 'deleted'>;
  saveDoctorLeave(input: DoctorLeaveInput, id?: string, actorId?: string, role?: UserRole, todayDate?: string): SchedulingResult<DoctorLeave>;
  deleteDoctorLeave(id: string, actorId?: string, role?: UserRole): SchedulingResult<DoctorLeave>;
  saveSlot(input: SlotInput, id?: string, todayDate?: string): SchedulingResult<ScheduleSlot>;
  createSlotBatch(input: SlotBatchInput, todayDate?: string, actorId?: string, role?: UserRole): SchedulingResult<number>;
  toggleSlot(id: string, actorId?: string, role?: UserRole): SchedulingResult<ScheduleSlot>;
}
