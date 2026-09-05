import type {
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleSlot,
  ScheduleSlotStatus,
} from '@/types/schedule';

export type ShopResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: string };

export interface SlotInput {
  doctorId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
}

const success = <T>(value: T): ShopResult<T> => ({ ok: true, value });
const failure = <T>(error: string, field?: string): ShopResult<T> => ({ ok: false, error, field });

export function deriveSlotStatus(
  bookedCount: number,
  maxCapacity: number,
  currentStatus?: ScheduleSlotStatus,
): ScheduleSlotStatus {
  if (currentStatus === 'closed') return 'closed';
  return bookedCount >= maxCapacity ? 'full' : 'available';
}

export function validateSlot(
  input: SlotInput,
  slots: ScheduleSlot[],
  doctors: ScheduleDoctor[],
  departments: ScheduleDepartment[],
  editingId?: string,
  bookedCount = 0,
): ShopResult<SlotInput> {
  if (!input.doctorId || !input.slotDate || !input.startTime || !input.endTime) {
    return failure('กรอกแพทย์ วันที่ และเวลาให้ครบ');
  }
  const doctor = doctors.find((item) => item.id === input.doctorId);
  const department = doctor && departments.find((item) => item.id === doctor.departmentId);
  if (!doctor || doctor.availability !== 'active' || !department?.isActive) {
    return failure('แพทย์และแผนกต้องเปิดใช้งานก่อนสร้างรอบ', 'doctorId');
  }
  if (input.startTime >= input.endTime) {
    return failure('เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด', 'startTime');
  }
  const weekday = new Date(`${input.slotDate}T12:00:00+07:00`).getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return failure('คลินิกเปิดรอบตรวจเฉพาะวันจันทร์ถึงศุกร์', 'slotDate');
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
  if (input.maxCapacity < bookedCount) {
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

export function validateDepartmentName(
  name: string,
  code: string,
  departments: ScheduleDepartment[],
  editingId?: string,
): ShopResult<true> {
  if (!name.trim() || !code.trim()) return failure('กรอกชื่อและรหัสแผนกก่อนบันทึก');
  const normalized = name.trim().toLocaleLowerCase('th');
  if (departments.some((item) => item.id !== editingId && item.name.trim().toLocaleLowerCase('th') === normalized)) {
    return failure('ชื่อแผนกนี้มีอยู่แล้ว', 'name');
  }
  return success(true);
}
