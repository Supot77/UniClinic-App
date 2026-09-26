import { describe, expect, it } from 'vitest';
import { MOCK_DEPARTMENTS, MOCK_DOCTORS, MOCK_SERVICES, MOCK_SLOTS, MOCK_WEEK_START } from '@/mocks/scheduleData';
import { shiftDate } from '@/constants/dateTime';
import {
  buildSlotBatchPlan,
  getClinicBatchEndTimeOptions,
  getClinicEndTimeOptions,
  getCreatableClinicStartTimeOptions,
  deriveSlotStatus,
  getEarliestCreatableClinicStartTime,
  getClinicDatesForWeekdays,
  isSlotExpired,
  validateDepartmentName,
  validateSlotEditWindow,
  validateSlot,
} from '@/features/scheduling/domain/rules';

const validSlot = {
  doctorId: 'profile-stephen-strange',
  serviceId: MOCK_SERVICES[0].id,
  slotDate: MOCK_WEEK_START,
  startTime: '09:30',
  endTime: '10:00',
  maxCapacity: 1,
};

const TEST_TODAY = MOCK_WEEK_START;
const TOMORROW = shiftDate(TEST_TODAY, 1);
const YESTERDAY = shiftDate(TEST_TODAY, -1);
const PAST_DATE = shiftDate(TEST_TODAY, -3);
const TEST_CURRENT_TIME = '08:00';

describe('scheduling schedule domain rules', () => {
  it('accepts adjacent slots but rejects overlapping slots', () => {
    const adjacent = validateSlot(
      { ...validSlot, slotDate: TEST_TODAY, startTime: '09:30', endTime: '10:00' },
      MOCK_SLOTS,
      MOCK_DOCTORS,
      MOCK_SERVICES,
      undefined,
      0,
      TEST_TODAY,
      [],
      TEST_CURRENT_TIME,
    );
    const overlapping = validateSlot(
      { ...validSlot, slotDate: TEST_TODAY, startTime: '09:15', endTime: '09:45' },
      MOCK_SLOTS,
      MOCK_DOCTORS,
      MOCK_SERVICES,
      undefined,
      0,
      TEST_TODAY,
      [],
      TEST_CURRENT_TIME,
    );
    expect(adjacent.ok).toBe(true);
    expect(overlapping).toMatchObject({ ok: false, error: expect.stringContaining('ทับซ้อน') });
  });

  it('rejects adding a slot for a past date', () => {
    const pastSlot = { ...validSlot, slotDate: PAST_DATE };
    const result = validateSlot(pastSlot, [], MOCK_DOCTORS, MOCK_SERVICES, undefined, 0, TEST_TODAY, [], TEST_CURRENT_TIME);
    expect(result).toMatchObject({
      ok: false,
      error: 'ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้',
      field: 'slotDate',
    });
  });

  it('allows adding a slot for today or future date', () => {
    const todayResult = validateSlot(validSlot, [], MOCK_DOCTORS, MOCK_SERVICES, undefined, 0, TEST_TODAY, [], TEST_CURRENT_TIME);
    expect(todayResult.ok).toBe(true);

    const futureResult = validateSlot(
      { ...validSlot, slotDate: TOMORROW },
      [],
      MOCK_DOCTORS,
      MOCK_SERVICES,
      undefined,
      0,
      TEST_TODAY,
      [],
      TEST_CURRENT_TIME,
    );
    expect(futureResult.ok).toBe(true);
  });

  it('rejects moving an existing slot to a past date', () => {
    const existingSlot = {
      ...validSlot,
      id: 'slot-future',
      slotDate: TOMORROW,
      serviceOfferingId: 'offering-1',
      bookedCount: 0,
      status: 'available' as const,
      hasHistory: false,
    };
    const result = validateSlot(
      { ...validSlot, slotDate: PAST_DATE },
      [existingSlot],
      MOCK_DOCTORS,
      MOCK_SERVICES,
      'slot-future',
      0,
      TEST_TODAY,
      [],
      TEST_CURRENT_TIME,
    );
    expect(result).toMatchObject({
      ok: false,
      error: 'ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้',
      field: 'slotDate',
    });
  });

  it('allows updating an existing past slot if slotDate is unchanged', () => {
    const pastSlot = {
      ...validSlot,
      id: 'slot-past',
      slotDate: PAST_DATE,
      serviceOfferingId: 'offering-1',
      bookedCount: 0,
      status: 'available' as const,
      hasHistory: false,
    };
    const result = validateSlot(
      { ...validSlot, slotDate: PAST_DATE, maxCapacity: 2 },
      [pastSlot],
      MOCK_DOCTORS,
      MOCK_SERVICES,
      'slot-past',
      0,
      TEST_TODAY,
      [],
      TEST_CURRENT_TIME,
    );
    expect(result.ok).toBe(true);
  });

  it.each([
    [{ ...validSlot, slotDate: YESTERDAY }, 'จันทร์ถึงศุกร์'],
    [{ ...validSlot, startTime: '08:00' }, '08:30'],
    [{ ...validSlot, startTime: '11:30', endTime: '12:30' }, 'ช่วงพัก'],
    [{ ...validSlot, maxCapacity: 0 }, 'จำนวนเต็ม'],
  ])('rejects an invalid clinic slot', (input, message) => {
    const result = validateSlot(input, [], MOCK_DOCTORS, MOCK_SERVICES, undefined, 0, TEST_TODAY, [], TEST_CURRENT_TIME);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining(message) });
  });

  it('does not allow capacity below existing bookings', () => {
    const result = validateSlot({ ...validSlot, maxCapacity: 2 }, [], MOCK_DOCTORS, MOCK_SERVICES, undefined, 3, TEST_TODAY, [], TEST_CURRENT_TIME);
    expect(result).toMatchObject({ ok: false, field: 'maxCapacity' });
  });

  it.each([
    [{ ...validSlot, slotDate: '2026-02-30' }, 'YYYY-MM-DD'],
    [{ ...validSlot, startTime: '9:30' }, 'HH:mm'],
    [{ ...validSlot, endTime: '25:00' }, 'HH:mm'],
  ])('rejects malformed clinic date/time', (input, message) => {
    const result = validateSlot(input, [], MOCK_DOCTORS, MOCK_SERVICES, undefined, 0, TEST_TODAY, [], TEST_CURRENT_TIME);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining(message) });
  });

  it('rejects invalid booked counts before changing capacity', () => {
    expect(validateSlot(validSlot, [], MOCK_DOCTORS, MOCK_SERVICES, undefined, -1, TEST_TODAY, [], TEST_CURRENT_TIME)).toMatchObject({ ok: false });
    expect(validateSlot(validSlot, [], MOCK_DOCTORS, MOCK_SERVICES, undefined, 2, TEST_TODAY, [], TEST_CURRENT_TIME)).toMatchObject({ ok: false, field: 'maxCapacity' });
  });

  it('requires active doctor and service references', () => {
    const inactiveDoctor = MOCK_DOCTORS.map((doctor) => doctor.id === validSlot.doctorId ? { ...doctor, availability: 'inactive' as const } : doctor);
    expect(validateSlot(validSlot, [], inactiveDoctor, MOCK_SERVICES, undefined, 0, TEST_TODAY, [], TEST_CURRENT_TIME)).toMatchObject({ ok: false, field: 'doctorId' });

    const inactiveService = MOCK_SERVICES.map((service) => service.id === validSlot.serviceId ? { ...service, isActive: false } : service);
    expect(validateSlot(validSlot, [], MOCK_DOCTORS, inactiveService, undefined, 0, TEST_TODAY, [], TEST_CURRENT_TIME)).toMatchObject({ ok: false, field: 'serviceId' });
  });

  it('builds selected weekdays and skips leave dates and existing conflicts', () => {
    expect(getClinicDatesForWeekdays(TEST_TODAY, shiftDate(TEST_TODAY, 6), [1, 3])).toEqual([TEST_TODAY, shiftDate(TEST_TODAY, 2)]);

    const existingSlot = {
      ...validSlot,
      id: 'existing-slot',
      slotDate: TOMORROW,
      startTime: '09:00',
      endTime: '09:30',
      serviceOfferingId: 'offering-1',
      bookedCount: 0,
      status: 'available' as const,
      hasHistory: false,
    };
    const result = buildSlotBatchPlan(
      {
        doctorId: validSlot.doctorId,
        serviceId: validSlot.serviceId,
        dates: [TOMORROW, shiftDate(TEST_TODAY, 2)],
        timeBlocks: [{ startTime: '09:00', endTime: '09:30', maxCapacity: 1 }],
      },
      [existingSlot],
      MOCK_DOCTORS,
      MOCK_SERVICES,
      TEST_TODAY,
      [{ id: 'leave-1', doctorId: validSlot.doctorId, startDate: shiftDate(TEST_TODAY, 2), endDate: shiftDate(TEST_TODAY, 2) }],
      TEST_CURRENT_TIME,
    );

    expect(result).toEqual({
      ok: true,
      value: { slots: [], skippedLeaveDates: [shiftDate(TEST_TODAY, 2)], skippedConflictCount: 1, skippedPastTimeCount: 0 },
    });
  });

  it('allows a same-day slot at the current minute but rejects earlier times', () => {
    expect(getEarliestCreatableClinicStartTime(TEST_TODAY, TEST_TODAY, '12:00')).toBe('13:00');
    expect(getEarliestCreatableClinicStartTime(TEST_TODAY, TEST_TODAY, '10:00')).toBe('10:00');
    expect(validateSlot(
      { ...validSlot, startTime: '09:59', endTime: '10:30' },
      [], MOCK_DOCTORS, MOCK_SERVICES, undefined, 0, TEST_TODAY, [], '10:00',
    )).toMatchObject({ ok: false, field: 'startTime' });
    expect(validateSlot(
      { ...validSlot, startTime: '10:00', endTime: '10:30' },
      [], MOCK_DOCTORS, MOCK_SERVICES, undefined, 0, TEST_TODAY, [], '10:00',
    ).ok).toBe(true);
  });

  it('returns only selectable clinic times for create controls', () => {
    const startOptions = getCreatableClinicStartTimeOptions('10:00');
    expect(startOptions[0]).toBe('10:00');
    expect(startOptions).toContain('11:59');
    expect(startOptions).not.toContain('09:59');
    expect(startOptions).not.toContain('12:00');
    expect(startOptions).toContain('13:00');

    const singleEndOptions = getClinicEndTimeOptions('11:30');
    expect(singleEndOptions).toContain('12:00');
    expect(singleEndOptions).not.toContain('12:01');
    expect(singleEndOptions).not.toContain('13:00');

    const batchEndOptions = getClinicBatchEndTimeOptions('08:30');
    expect(batchEndOptions).toContain('12:00');
    expect(batchEndOptions).not.toContain('12:01');
    expect(batchEndOptions).toContain('13:00');
  });

  it('skips past time blocks for today while keeping them for future dates', () => {
    const result = buildSlotBatchPlan(
      {
        doctorId: validSlot.doctorId,
        serviceId: validSlot.serviceId,
        dates: [TEST_TODAY, TOMORROW],
        timeBlocks: [
          { startTime: '09:30', endTime: '10:00', maxCapacity: 1 },
          { startTime: '10:00', endTime: '10:30', maxCapacity: 1 },
        ],
      },
      [], MOCK_DOCTORS, MOCK_SERVICES, TEST_TODAY, [], '10:00',
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        skippedPastTimeCount: 1,
        slots: expect.arrayContaining([
          expect.objectContaining({ slotDate: TEST_TODAY, startTime: '10:00' }),
          expect.objectContaining({ slotDate: TOMORROW, startTime: '09:30' }),
          expect.objectContaining({ slotDate: TOMORROW, startTime: '10:00' }),
        ]),
      },
    });
  });

  it('marks slot full at capacity while preserving manual and expired closed status', () => {
    expect(deriveSlotStatus(4, 4)).toBe('full');
    expect(deriveSlotStatus(5, 4)).toBe('full');
    expect(deriveSlotStatus(0, 4)).toBe('available');
    expect(deriveSlotStatus(0, 4, 'closed')).toBe('closed');
    expect(deriveSlotStatus(4, 4, undefined, {
      slotDate: TEST_TODAY,
      startTime: '09:00',
      currentDate: TEST_TODAY,
      currentTime: '10:00',
    })).toBe('closed');
  });

  it('closes slot immediately when past start time or past date', () => {
    const nowCtx = { currentDate: TEST_TODAY, currentTime: '10:00' };

    // Same day, startTime <= currentTime -> closed
    expect(deriveSlotStatus(0, 4, undefined, { slotDate: TEST_TODAY, startTime: '10:00', ...nowCtx })).toBe('closed');
    expect(deriveSlotStatus(0, 4, undefined, { slotDate: TEST_TODAY, startTime: '09:30', ...nowCtx })).toBe('closed');

    // Same day, startTime > currentTime -> available
    expect(deriveSlotStatus(0, 4, undefined, { slotDate: TEST_TODAY, startTime: '10:30', ...nowCtx })).toBe('available');

    // Past date -> closed
    expect(deriveSlotStatus(0, 4, undefined, { slotDate: YESTERDAY, startTime: '14:00', ...nowCtx })).toBe('closed');

    // Future date -> available
    expect(deriveSlotStatus(0, 4, undefined, { slotDate: TOMORROW, startTime: '08:30', ...nowCtx })).toBe('available');
  });

  it('correctly determines if a slot is expired', () => {
    expect(isSlotExpired(YESTERDAY, '09:00', TEST_TODAY, '08:00')).toBe(true);
    expect(isSlotExpired(TEST_TODAY, '09:00', TEST_TODAY, '09:00')).toBe(true);
    expect(isSlotExpired(TEST_TODAY, '09:00', TEST_TODAY, '09:01')).toBe(true);
    expect(isSlotExpired(TEST_TODAY, '09:30', TEST_TODAY, '09:15')).toBe(false);
    expect(isSlotExpired(TOMORROW, '08:30', TEST_TODAY, '18:00')).toBe(false);
  });

  it('allows editing a closed slot before its start and rejects it after start', () => {
    const closedSlot = { ...MOCK_SLOTS[0], status: 'closed' as const, slotDate: TEST_TODAY, startTime: '09:00' };
    expect(validateSlotEditWindow(closedSlot, closedSlot, TEST_TODAY, '08:59')).toEqual({ ok: true, value: true });
    expect(validateSlotEditWindow(closedSlot, closedSlot, TEST_TODAY, '09:00')).toMatchObject({
      ok: false,
      error: 'แก้ไขไม่ได้ เพราะรอบตรวจเริ่มไปแล้ว',
    });
  });

  it('rejects duplicate department names regardless of case', () => {
    const result = validateDepartmentName('เวชปฏิบัติทั่วไป', 'NEW', MOCK_DEPARTMENTS);
    expect(result).toMatchObject({ ok: false, field: 'name' });
  });
});
