export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
] as const;

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
] as const;

export const THAI_WEEKDAYS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'] as const;

export const CLINIC_TIME_BLOCKS = [
  { label: 'ช่วงเช้า 08:30–12:00', startTime: '08:30', endTime: '12:00' },
  { label: 'ช่วงบ่าย 13:00–16:30', startTime: '13:00', endTime: '16:30' },
] as const;

export const LEAVE_REASONS = ['ไปราชการ', 'ลาป่วย', 'ประชุมวิชาการ', 'อบรม', 'อื่น ๆ'] as const;

const BANGKOK_TIME_ZONE = 'Asia/Bangkok';

export function getBangkokDateKey(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shiftDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function getCurrentWeekMonday(referenceDate: Date | string = new Date()): string {
  const dateKey = typeof referenceDate === 'string' ? referenceDate : getBangkokDateKey(referenceDate);
  const day = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return shiftDate(dateKey, day === 0 ? -6 : 1 - day);
}
