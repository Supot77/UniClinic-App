export interface ScheduleItem {
  id: number | string;
  doctor: string;
  specialty: string;
  dept: string;
  days: string[];
  hours: string;
  room: string;
  status: string;
}


/**
 * View models consumed by Scheduling UI.
 *
 * Keep presentation-only fields (code, room, tone, initials) outside the shared
 * database interfaces. The API repository maps database rows into these shapes.
 */

export type DepartmentTone = 'sky' | 'teal' | 'amber' | 'violet';

export interface ScheduleDepartment {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  code?: string;
  room?: string;
  tone?: DepartmentTone;
  hasHistory?: boolean;
}

export interface ScheduleService {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  hasHistory?: boolean;
}

export interface DailyServiceOffering {
  id: string;
  serviceId: string;
  doctorId: string;
  offeringDate: string;
  isActive: boolean;
  createdBy?: string;
}

export interface DoctorLeaveInput {
  doctorId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface DoctorLeave extends DoctorLeaveInput {
  id: string;
  createdBy?: string;
  createdAt?: string;
}

export type DoctorAvailability = 'active' | 'on_leave' | 'inactive';

export interface ScheduleDoctor {
  id: string;
  profileId: string;
  fullName: string;
  initials: string;
  email: string;
  specialty: string;
  departmentId: string;
  availability: DoctorAvailability;
  hasHistory?: boolean;
}

export type ScheduleSlotStatus = 'available' | 'full' | 'closed';
export type ScheduleSlotClosedReason = 'manual' | 'doctor_leave';

export interface ScheduleSlot {
  id: string;
  doctorId: string;
  serviceOfferingId: string;
  serviceId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  bookedCount: number;
  status: ScheduleSlotStatus;
  closedReason?: ScheduleSlotClosedReason;
  hasHistory?: boolean;
}

export interface DoctorAccountOption {
  profileId: string;
  fullName: string;
  email: string;
  initials: string;
}
