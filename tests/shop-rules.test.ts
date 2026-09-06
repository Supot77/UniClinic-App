import { describe, expect, it } from 'vitest';
import { MOCK_DEPARTMENTS, MOCK_DOCTORS, MOCK_SLOTS } from '@/mocks/scheduleData';
import { deriveSlotStatus, validateDepartmentName, validateSlot } from '@/features/shop/domain/rules';

const validSlot = {
  doctorId: 'profile-stephen-strange',
  slotDate: '2026-09-07',
  startTime: '09:30',
  endTime: '10:00',
  maxCapacity: 1,
};

describe('shop schedule domain rules', () => {
  it('accepts adjacent slots but rejects overlapping slots', () => {
    const adjacent = validateSlot(
      { ...validSlot, slotDate: '2026-09-07', startTime: '09:30', endTime: '10:00' },
      MOCK_SLOTS,
      MOCK_DOCTORS,
      MOCK_DEPARTMENTS,
    );
    const overlapping = validateSlot(
      { ...validSlot, slotDate: '2026-09-07', startTime: '09:15', endTime: '09:45' },
      MOCK_SLOTS,
      MOCK_DOCTORS,
      MOCK_DEPARTMENTS,
    );
    expect(adjacent.ok).toBe(true);
    expect(overlapping).toMatchObject({ ok: false, error: expect.stringContaining('ทับซ้อน') });
  });

  it.each([
    [{ ...validSlot, slotDate: '2026-09-06' }, 'จันทร์ถึงศุกร์'],
    [{ ...validSlot, startTime: '08:00' }, '08:30'],
    [{ ...validSlot, startTime: '11:30', endTime: '12:30' }, 'ช่วงพัก'],
    [{ ...validSlot, maxCapacity: 0 }, 'จำนวนเต็ม'],
  ])('rejects an invalid clinic slot', (input, message) => {
    const result = validateSlot(input, [], MOCK_DOCTORS, MOCK_DEPARTMENTS);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining(message) });
  });

  it('does not allow capacity below existing bookings', () => {
    const result = validateSlot({ ...validSlot, maxCapacity: 2 }, [], MOCK_DOCTORS, MOCK_DEPARTMENTS, undefined, 3);
    expect(result).toMatchObject({ ok: false, field: 'maxCapacity' });
  });

  it.each([
    [{ ...validSlot, slotDate: '2026-02-30' }, 'YYYY-MM-DD'],
    [{ ...validSlot, startTime: '9:30' }, 'HH:mm'],
    [{ ...validSlot, endTime: '25:00' }, 'HH:mm'],
  ])('rejects malformed clinic date/time', (input, message) => {
    const result = validateSlot(input, [], MOCK_DOCTORS, MOCK_DEPARTMENTS);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining(message) });
  });

  it('rejects invalid booked counts before changing capacity', () => {
    expect(validateSlot(validSlot, [], MOCK_DOCTORS, MOCK_DEPARTMENTS, undefined, -1)).toMatchObject({ ok: false });
    expect(validateSlot(validSlot, [], MOCK_DOCTORS, MOCK_DEPARTMENTS, undefined, 2)).toMatchObject({ ok: false, field: 'maxCapacity' });
  });

  it('requires active doctor and department references', () => {
    const inactiveDoctor = MOCK_DOCTORS.map((doctor) => doctor.id === validSlot.doctorId ? { ...doctor, availability: 'inactive' as const } : doctor);
    expect(validateSlot(validSlot, [], inactiveDoctor, MOCK_DEPARTMENTS)).toMatchObject({ ok: false, field: 'doctorId' });

    const inactiveDepartment = MOCK_DEPARTMENTS.map((department) => department.id === 'dept-general' ? { ...department, isActive: false } : department);
    expect(validateSlot(validSlot, [], MOCK_DOCTORS, inactiveDepartment)).toMatchObject({ ok: false, field: 'doctorId' });
  });

  it('derives full while preserving a closed slot', () => {
    expect(deriveSlotStatus(4, 4)).toBe('full');
    expect(deriveSlotStatus(0, 4)).toBe('available');
    expect(deriveSlotStatus(0, 4, 'closed')).toBe('closed');
  });

  it('rejects duplicate department names regardless of case', () => {
    const result = validateDepartmentName('เวชปฏิบัติทั่วไป', 'NEW', MOCK_DEPARTMENTS);
    expect(result).toMatchObject({ ok: false, field: 'name' });
  });
});
