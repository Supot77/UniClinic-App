import type {
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleService,
  ScheduleSlot,
  ScheduleSlotStatus,
  DoctorLeave,
  DoctorLeaveInput,
} from '@/types/schedule';
import type { UserRole } from '@/types/database';

export type ShopResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: string };

export interface SlotInput {
  doctorId: string;
  serviceId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
}

export interface SlotBatchTimeBlock {
  startTime: string;
  endTime: string;
  maxCapacity: number;
}

export interface SlotBatchInput {
  doctorId: string;
  serviceId: string;
  dates: string[];
  timeBlocks: SlotBatchTimeBlock[];
}

export interface SlotBatchPlan {
  slots: SlotInput[];
  skippedLeaveDates: string[];
  skippedConflictCount: number;
}

const success = <T>(value: T): ShopResult<T> => ({ ok: true, value });
const failure = <T>(error: string, field?: string): ShopResult<T> => ({ ok: false, error, field });

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export function isValidClinicDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidClinicTime(value: string) {
  const match = TIME_PATTERN.exec(value);
  if (!match) return false;
  const [, hour, minute] = match.map(Number);
  return hour <= 23 && minute <= 59;
}

export function getBangkokCurrentTime(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function isSlotExpired(
  slotDate: string,
  startTime: string,
  currentDate?: string,
  currentTime?: string,
): boolean {
  const effectiveDate = currentDate ?? getBangkokToday();
  if (slotDate < effectiveDate) return true;
  if (slotDate > effectiveDate) return false;
  const effectiveTime = currentTime ?? getBangkokCurrentTime();
  return effectiveTime >= startTime;
}

export interface SlotTimingContext {
  slotDate: string;
  startTime: string;
  currentDate?: string;
  currentTime?: string;
}

export function deriveSlotStatus(
  bookedCount: number,
  maxCapacity: number,
  currentStatus?: ScheduleSlotStatus,
  timing?: SlotTimingContext,
): ScheduleSlotStatus {
  if (currentStatus === 'closed') return 'closed';
  if (timing && isSlotExpired(timing.slotDate, timing.startTime, timing.currentDate, timing.currentTime)) {
    return 'closed';
  }
  if (bookedCount >= maxCapacity) return 'full';
  return 'available';
}

export function getBangkokToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

export function validateSlot(
  input: SlotInput,
  slots: ScheduleSlot[],
  doctors: ScheduleDoctor[],
  services: ScheduleService[],
  editingId?: string,
  bookedCount = 0,
  todayDate?: string,
  doctorLeaves: DoctorLeave[] = [],
): ShopResult<SlotInput> {
  if (!input.doctorId || !input.serviceId || !input.slotDate || !input.startTime || !input.endTime) {
    return failure('กรอกแพทย์ บริการ วันที่ และเวลาให้ครบ');
  }
  if (!isValidClinicDate(input.slotDate)) return failure('วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD', 'slotDate');
  if (!isValidClinicTime(input.startTime) || !isValidClinicTime(input.endTime)) {
    return failure('เวลาต้องอยู่ในรูปแบบ HH:mm', 'startTime');
  }
  const doctor = doctors.find((item) => item.id === input.doctorId);
  const service = services.find((item) => item.id === input.serviceId);
  if (!doctor || doctor.availability !== 'active') {
    return failure('แพทย์ต้องเปิดใช้งานก่อนสร้างรอบ', 'doctorId');
  }
  if (!service || !service.isActive) {
    return failure('เลือกบริการที่เปิดใช้งาน', 'serviceId');
  }
  if (input.startTime >= input.endTime) {
    return failure('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด', 'startTime');
  }
  // Date-only values are interpreted in Asia/Bangkok. Bangkok has no DST,
  // so UTC calendar arithmetic keeps validation deterministic in every runtime.
  const [year, month, day] = input.slotDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return failure('คลินิกเปิดรอบตรวจเฉพาะวันจันทร์ถึงศุกร์', 'slotDate');
  }

  const effectiveToday = todayDate ?? getBangkokToday();
  const existing = editingId ? slots.find((slot) => slot.id === editingId) : undefined;
  if (input.slotDate < effectiveToday) {
    if (!editingId || !existing || existing.slotDate !== input.slotDate) {
      return failure('ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้', 'slotDate');
    }
  }
  if (!editingId && isDoctorOnLeave(doctorLeaves, input.doctorId, input.slotDate)) {
    return failure('แพทย์มีวันลาในวันที่เลือก ไม่สามารถสร้างรอบตรวจใหม่ได้', 'slotDate');
  }
  if (input.startTime < '08:30' || input.endTime > '16:30') {
    return failure('รอบตรวจต้องอยู่ระหว่าง 08:30–16:30 น.', 'startTime');
  }
  if (input.startTime < '13:00' && input.endTime > '12:00') {
    return failure('ไม่สามารถสร้างรอบทับช่วงพัก 12:00–13:00 น.', 'startTime');
  }
  if (!Number.isInteger(input.maxCapacity) || input.maxCapacity < 1) {
    return failure('ความจุต้องเป็นจำนวนเต็มมากกว่า 0', 'maxCapacity');
  }
  if (!Number.isInteger(bookedCount) || bookedCount < 0) {
    return failure('จำนวนจองต้องเป็นจำนวนเต็มไม่ติดลบ', 'maxCapacity');
  }
  if (bookedCount > input.maxCapacity) {
    return failure(`ลดความจุต่ำกว่าจำนวนจองปัจจุบัน ${bookedCount} คนไม่ได้`, 'maxCapacity');
  }
  const overlaps = slots.some(
    (slot) =>
      slot.id !== editingId &&
      slot.doctorId === input.doctorId &&
      slot.slotDate === input.slotDate &&
      input.startTime < slot.endTime &&
      input.endTime > slot.startTime,
  );
  if (overlaps) return failure('แพทย์มีรอบเวลาทับซ้อนกับรายการเดิม');
  return success(input);
}

export function isDoctorOnLeave(leaves: DoctorLeave[], doctorId: string, date: string): boolean {
  return leaves.some((leave) => leave.doctorId === doctorId && leave.startDate <= date && leave.endDate >= date);
}

export function validateDoctorLeave(
  input: DoctorLeaveInput,
  leaves: DoctorLeave[],
  doctors: ScheduleDoctor[],
  editingId?: string,
  actorId?: string,
  role?: UserRole,
  todayDate?: string,
): ShopResult<DoctorLeaveInput> {
  if (!input.doctorId || !input.startDate || !input.endDate) {
    return failure('เลือกแพทย์และกรอกช่วงวันลาให้ครบ', 'doctorId');
  }
  if (!isValidClinicDate(input.startDate) || !isValidClinicDate(input.endDate)) {
    return failure('วันที่ลาต้องอยู่ในรูปแบบ YYYY-MM-DD', 'startDate');
  }
  if (input.startDate > input.endDate) {
    return failure('วันเริ่มลาต้องไม่เกินวันสิ้นสุด', 'startDate');
  }
  const effectiveToday = todayDate ?? getBangkokToday();
  if (input.startDate < effectiveToday) {
    return failure('ไม่สามารถบันทึกวันลาในอดีตได้', 'startDate');
  }
  const doctor = doctors.find((item) => item.id === input.doctorId);
  if (!doctor) return failure('ไม่พบแพทย์ที่ต้องการบันทึกวันลา', 'doctorId');
  const permission = validateDoctorLeavePermission(input.doctorId, doctors, actorId, role);
  if (!permission.ok) return permission;

  const overlaps = leaves.some(
    (leave) =>
      leave.id !== editingId &&
      leave.doctorId === input.doctorId &&
      input.startDate <= leave.endDate &&
      input.endDate >= leave.startDate,
  );
  if (overlaps) return failure('ช่วงวันลาซ้ำซ้อนกับวันลาเดิมของแพทย์', 'startDate');

  return success({
    ...input,
    reason: input.reason?.trim() || undefined,
  });
}

export function validateDoctorLeavePermission(
  doctorId: string,
  doctors: ScheduleDoctor[],
  actorId?: string,
  role?: UserRole,
): ShopResult<true> {
  if (!role) return success(true);
  if (role === 'staff_admin') return success(true);
  const doctor = doctors.find((item) => item.id === doctorId);
  if (role === 'medical' && actorId && doctor && (doctor.id === actorId || doctor.profileId === actorId)) {
    return success(true);
  }
  return failure('ไม่มีสิทธิ์จัดการวันลาของแพทย์ท่านนี้', 'doctorId');
}

export function validateSlotPermission(
  doctorId: string,
  doctors: ScheduleDoctor[],
  actorId?: string,
  role?: UserRole,
): ShopResult<true> {
  if (!role || role === 'staff_admin') return success(true);
  const doctor = doctors.find((item) => item.id === doctorId);
  if (role === 'medical' && actorId && doctor && (doctor.id === actorId || doctor.profileId === actorId)) {
    return success(true);
  }
  return failure('ไม่มีสิทธิ์จัดการรอบตรวจของแพทย์ท่านนี้', 'doctorId');
}

export function getClinicDatesForWeekdays(
  startDate: string,
  endDate: string,
  weekdays: number[],
): string[] {
  if (!isValidClinicDate(startDate) || !isValidClinicDate(endDate) || startDate > endDate) return [];
  const selectedWeekdays = new Set(weekdays.filter((weekday) => weekday >= 1 && weekday <= 5));
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = shiftClinicDate(date, 1)) {
    if (selectedWeekdays.has(clinicWeekday(date))) dates.push(date);
  }
  return dates;
}

export function buildSlotBatchPlan(
  input: SlotBatchInput,
  slots: ScheduleSlot[],
  doctors: ScheduleDoctor[],
  services: ScheduleService[],
  todayDate?: string,
  doctorLeaves: DoctorLeave[] = [],
): ShopResult<SlotBatchPlan> {
  if (!input.doctorId || !input.serviceId || input.dates.length === 0 || input.timeBlocks.length === 0) {
    return failure('กรอกแพทย์ บริการ วันที่ และช่วงเวลาให้ครบ');
  }

  const doctor = doctors.find((item) => item.id === input.doctorId);
  if (!doctor || doctor.availability !== 'active') return failure('แพทย์ต้องเปิดใช้งานก่อนสร้างรอบ', 'doctorId');
  const service = services.find((item) => item.id === input.serviceId);
  if (!service || !service.isActive) return failure('เลือกบริการที่เปิดใช้งาน', 'serviceId');

  const effectiveToday = todayDate ?? getBangkokToday();
  const dates = [...new Set(input.dates)].sort();
  if (dates.some((date) => !isValidClinicDate(date))) return failure('วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD', 'dates');
  if (dates.some((date) => date < effectiveToday)) return failure('ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้', 'dates');

  const blocks = [...input.timeBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (const block of blocks) {
    if (!isValidClinicTime(block.startTime) || !isValidClinicTime(block.endTime)) {
      return failure('เวลาต้องอยู่ในรูปแบบ HH:mm', 'startTime');
    }
    if (block.startTime >= block.endTime) return failure('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด', 'startTime');
    if (block.startTime < '08:30' || block.endTime > '16:30') {
      return failure('รอบตรวจต้องอยู่ระหว่าง 08:30–16:30 น.', 'startTime');
    }
    if (block.startTime < '13:00' && block.endTime > '12:00') {
      return failure('ไม่สามารถสร้างรอบทับช่วงพัก 12:00–13:00 น.', 'startTime');
    }
    if (!Number.isInteger(block.maxCapacity) || block.maxCapacity < 1) {
      return failure('ความจุต้องเป็นจำนวนเต็มมากกว่า 0', 'maxCapacity');
    }
  }
  if (blocks.some((block, index) => index > 0 && block.startTime < blocks[index - 1].endTime)) {
    return failure('ช่วงเวลาที่เลือกทับซ้อนกัน', 'startTime');
  }

  const plannedSlots: SlotInput[] = [];
  const skippedLeaveDates = new Set<string>();
  let skippedConflictCount = 0;
  for (const date of dates) {
    if (clinicWeekday(date) === 0 || clinicWeekday(date) === 6) {
      return failure('คลินิกเปิดรอบตรวจเฉพาะวันจันทร์ถึงศุกร์', 'dates');
    }
    if (isDoctorOnLeave(doctorLeaves, input.doctorId, date)) {
      skippedLeaveDates.add(date);
      continue;
    }
    for (const block of blocks) {
      const candidate: SlotInput = {
        doctorId: input.doctorId,
        serviceId: input.serviceId,
        slotDate: date,
        startTime: block.startTime,
        endTime: block.endTime,
        maxCapacity: block.maxCapacity,
      };
      const overlaps = [...slots, ...plannedSlots].some(
        (slot) =>
          slot.doctorId === candidate.doctorId &&
          slot.slotDate === candidate.slotDate &&
          candidate.startTime < slot.endTime &&
          candidate.endTime > slot.startTime,
      );
      if (overlaps) {
        skippedConflictCount += 1;
        continue;
      }
      plannedSlots.push(candidate);
    }
  }

  return success({
    slots: plannedSlots,
    skippedLeaveDates: [...skippedLeaveDates],
    skippedConflictCount,
  });
}

export function validateDepartmentName(
  name: string,
  code: string | undefined,
  departments: ScheduleDepartment[],
  editingId?: string,
): ShopResult<true> {
  if (!name.trim()) return failure('กรอกชื่อแผนกก่อนบันทึก', 'name');
  const normalized = name.trim().toLocaleLowerCase('th');
  if (departments.some((item) => item.id !== editingId && item.name.trim().toLocaleLowerCase('th') === normalized)) {
    return failure('ชื่อแผนกนี้มีอยู่แล้ว', 'name');
  }
  return success(true);
}

export function countAffectedSlots(
  slots: ScheduleSlot[],
  doctorId: string,
  startDate: string,
  endDate: string,
): number {
  if (!doctorId || !startDate || !endDate || startDate > endDate) return 0;
  return slots.filter(
    (slot) =>
      slot.doctorId === doctorId &&
      slot.slotDate >= startDate &&
      slot.slotDate <= endDate,
  ).length;
}

function clinicWeekday(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function shiftClinicDate(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
