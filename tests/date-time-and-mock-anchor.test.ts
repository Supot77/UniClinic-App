import { describe, expect, it } from 'vitest';
import {
  CLINIC_TIME_BLOCKS,
  getBangkokDateKey,
  getCurrentWeekMonday,
  LEAVE_REASONS,
  shiftDate,
  THAI_MONTHS,
  THAI_MONTHS_SHORT,
  THAI_WEEKDAYS,
  WEEKDAY_NAMES,
} from '@/constants/dateTime';
import { clinicMockTables } from '@/mocks/clinicDatabase';
import { MOCK_WEEK_START } from '@/mocks/scheduleData';

describe('shared date-time constants', () => {
  it('exports shared Thai date labels and clinic schedule options', () => {
    expect(THAI_MONTHS).toHaveLength(12);
    expect(THAI_MONTHS_SHORT).toHaveLength(12);
    expect(THAI_WEEKDAYS).toEqual(['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']);
    expect(WEEKDAY_NAMES).toEqual(['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']);
    expect(CLINIC_TIME_BLOCKS).toEqual([
      { label: 'ช่วงเช้า 08:30–12:00', startTime: '08:30', endTime: '12:00' },
      { label: 'ช่วงบ่าย 13:00–16:30', startTime: '13:00', endTime: '16:30' },
    ]);
    expect(LEAVE_REASONS).toContain('อื่น ๆ');
  });

  it('calculates Monday from date-only values without local timezone drift', () => {
    expect(getCurrentWeekMonday('2026-09-14')).toBe('2026-09-14');
    expect(getCurrentWeekMonday('2026-09-20')).toBe('2026-09-14');
    expect(getCurrentWeekMonday('2026-10-01')).toBe('2026-09-28');
    expect(shiftDate('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('formats dates using Bangkok timezone', () => {
    expect(getBangkokDateKey(new Date('2026-09-19T16:59:59.000Z'))).toBe('2026-09-19');
    expect(getBangkokDateKey(new Date('2026-09-19T17:00:00.000Z'))).toBe('2026-09-20');
  });
});

describe('dynamic schedule mock anchor', () => {
  it('keeps schedule fixture dates in the current week', () => {
    const currentMonday = getCurrentWeekMonday();
    const slotsById = new Map(clinicMockTables.appointment_slots.map((slot) => [slot.id, slot]));

    expect(MOCK_WEEK_START).toBe(currentMonday);
    expect(slotsById.get('slot-history-7d')?.slot_date).toBe(shiftDate(currentMonday, -2));
    expect(slotsById.get('slot-history-30d')?.slot_date).toBe(shiftDate(currentMonday, -18));
    expect(slotsById.get('slot-001')?.slot_date).toBe(currentMonday);
    expect(slotsById.get('slot-007')?.slot_date).toBe(shiftDate(currentMonday, 3));
  });
});
