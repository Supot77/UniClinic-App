import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockSchedulingRepository } from '@/features/scheduling/data/mockRepository';
import { shiftDate } from '@/constants/dateTime';
import { MOCK_WEEK_START } from '@/mocks/scheduleData';

const TEST_WEEK_START = MOCK_WEEK_START;
const TEST_TOMORROW = shiftDate(TEST_WEEK_START, 1);
const TEST_NEXT_DAY = shiftDate(TEST_WEEK_START, 2);
const TEST_PAST_DATE = shiftDate(TEST_WEEK_START, -3);
const TEST_BATCH_DATE = shiftDate(TEST_WEEK_START, 3);
const TEST_LEAVE_DATE = shiftDate(TEST_WEEK_START, 4);

describe('MockSchedulingRepository', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-08T01:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('soft deletes referenced departments and hard deletes new ones', () => {
    const repository = new MockSchedulingRepository();
    const referenced = repository.toggleDepartment('dept-general');
    expect(referenced).toEqual({ ok: true, value: 'disabled' });
    expect(repository.snapshot().departments.find((item) => item.id === 'dept-general')?.isActive).toBe(false);

    const created = repository.saveDepartment({
      name: 'คลินิกทดสอบ',
      code: 'TST',
      description: 'ข้อมูลจำลอง',
      room: 'ห้อง 1',
      tone: 'sky',
      hasHistory: false,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(repository.toggleDepartment(created.value.id)).toEqual({ ok: true, value: 'deleted' });
    expect(repository.snapshot().departments.some((item) => item.id === created.value.id)).toBe(false);
  });

  it('does not mutate state when slot validation fails', () => {
    const repository = new MockSchedulingRepository();
    const before = repository.snapshot();
    const result = repository.saveSlot({
      doctorId: 'profile-stephen-strange',
      serviceId: 'service-general',
      slotDate: TEST_WEEK_START,
      startTime: '09:15',
      endTime: '09:45',
      maxCapacity: 1,
    });
    expect(result.ok).toBe(false);
    expect(repository.snapshot()).toEqual(before);
  });

  it('exposes the shared mock account catalog and rejects duplicate doctor bindings', () => {
    const repository = new MockSchedulingRepository();
    expect(repository.snapshot().doctorAccounts.length).toBeGreaterThan(0);
    const before = repository.snapshot();
    const result = repository.saveDoctor({
      profileId: before.doctors[0].profileId,
      fullName: 'แพทย์ซ้ำ',
      initials: 'ซ้ำ',
      email: 'duplicate@clinic-demo.test',
      specialty: 'ทดสอบ',
      departmentId: before.doctors[0].departmentId,
      availability: 'active',
    });
    expect(result).toMatchObject({ ok: false, field: 'profileId' });
    expect(repository.snapshot()).toEqual(before);
  });

  it('rejects edits for unknown IDs without creating records', () => {
    const repository = new MockSchedulingRepository();
    const before = repository.snapshot();
    expect(repository.saveDepartment({ name: 'ใหม่', code: 'NEW', description: '', room: '', tone: 'sky' }, 'missing')).toMatchObject({ ok: false });
    expect(repository.saveDoctor({
      profileId: 'profile-gregory-house', fullName: 'Gregory House', initials: 'GH', email: 'gh@test', specialty: 'ทดสอบ', departmentId: 'dept-general', availability: 'active',
    }, 'missing')).toMatchObject({ ok: false });
    expect(repository.saveSlot({ doctorId: 'profile-stephen-strange', serviceId: 'service-general', slotDate: TEST_WEEK_START, startTime: '09:30', endTime: '10:00', maxCapacity: 1 }, 'missing')).toMatchObject({ ok: false });
    expect(repository.snapshot()).toEqual(before);
  });

  it('rejects adding a slot for a past date', () => {
    const repository = new MockSchedulingRepository();
    const before = repository.snapshot();
    const serviceId = before.services[0].id;
    const result = repository.saveSlot(
      {
        doctorId: 'profile-stephen-strange',
        serviceId,
        slotDate: TEST_PAST_DATE,
        startTime: '09:00',
        endTime: '09:30',
        maxCapacity: 1,
      },
      undefined,
      TEST_WEEK_START,
    );
    expect(result).toMatchObject({
      ok: false,
      error: 'ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้',
      field: 'slotDate',
    });
    expect(repository.snapshot()).toEqual(before);
  });

  it('closes a slot without changing its booked count', () => {
    const repository = new MockSchedulingRepository();
    const slot = repository.snapshot().slots.find((item) => item.bookedCount > 0);
    expect(slot).toBeDefined();
    if (!slot) return;
    expect(repository.toggleSlot(slot.id)).toMatchObject({ ok: true, value: { status: 'closed', bookedCount: slot.bookedCount } });
  });

  it('allows editing a future closed slot while preserving its closed status', () => {
    const repository = new MockSchedulingRepository();
    const before = repository.snapshot();
    const input = {
      doctorId: before.doctors[0].id,
      serviceId: before.services[0].id,
      slotDate: TEST_BATCH_DATE,
      startTime: '09:00',
      endTime: '09:30',
      maxCapacity: 2,
    };
    const created = repository.saveSlot(input, undefined, TEST_WEEK_START);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(repository.toggleSlot(created.value.id)).toMatchObject({ ok: true, value: { status: 'closed' } });
    const edited = repository.saveSlot({ ...input, endTime: '10:00' }, created.value.id, TEST_WEEK_START);

    expect(edited).toMatchObject({ ok: true, value: { status: 'closed', endTime: '10:00' } });
  });

  it('hard deletes a new doctor until a slot references it', () => {
    const repository = new MockSchedulingRepository();
    const result = repository.saveDoctor({
      profileId: 'profile-gregory-house', fullName: 'Gregory House', initials: 'GH', email: 'gh@test', specialty: 'วินิจฉัย', departmentId: 'dept-general', availability: 'active',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(repository.toggleDoctor(result.value.id)).toEqual({ ok: true, value: 'deleted' });
    expect(repository.snapshot().doctors.some((doctor) => doctor.id === result.value.id)).toBe(false);
  });

  it('creates concrete slots for selected dates and keeps existing conflicts unchanged', () => {
    const repository = new MockSchedulingRepository();
    const before = repository.snapshot();
    const serviceId = before.services[0].id;
    const result = repository.createSlotBatch(
      {
        doctorId: 'profile-stephen-strange',
        serviceId,
        dates: [TEST_TOMORROW, TEST_NEXT_DAY],
        timeBlocks: [{ startTime: '08:30', endTime: '09:00', maxCapacity: 2 }],
      },
      TEST_WEEK_START,
      'profile-stephen-strange',
      'medical',
    );

    expect(result).toEqual({ ok: true, value: 2 });
    const created = repository.snapshot().slots.filter(
      (slot) => slot.doctorId === 'profile-stephen-strange' && [TEST_TOMORROW, TEST_NEXT_DAY].includes(slot.slotDate),
    );
    expect(created).toHaveLength(2);
    expect(created.every((slot) => slot.maxCapacity === 2 && slot.bookedCount === 0)).toBe(true);
  });

  it('skips doctor leave dates while creating batch slots', () => {
    const repository = new MockSchedulingRepository();
    const serviceId = repository.snapshot().services[0].id;
    expect(repository.saveDoctorLeave({ doctorId: 'profile-stephen-strange', startDate: TEST_LEAVE_DATE, endDate: TEST_LEAVE_DATE, reason: 'ประชุม' }, undefined, undefined, undefined, TEST_WEEK_START)).toMatchObject({ ok: true });

    const result = repository.createSlotBatch(
      {
        doctorId: 'profile-stephen-strange',
        serviceId,
        dates: [TEST_BATCH_DATE, TEST_LEAVE_DATE],
        timeBlocks: [{ startTime: '08:30', endTime: '09:00', maxCapacity: 1 }],
      },
      TEST_WEEK_START,
    );

    expect(result).toEqual({ ok: true, value: 1 });
    expect(repository.snapshot().slots.filter((slot) => slot.doctorId === 'profile-stephen-strange' && slot.slotDate === TEST_LEAVE_DATE && slot.startTime === '08:30')).toHaveLength(0);
  });

  it('rejects batch slot changes outside the medical doctor ownership scope', () => {
    const repository = new MockSchedulingRepository();
    const before = repository.snapshot();
    const result = repository.createSlotBatch(
      {
        doctorId: 'profile-charles-xavier',
        serviceId: before.services[0].id,
        dates: [TEST_TOMORROW],
        timeBlocks: [{ startTime: '08:30', endTime: '09:00', maxCapacity: 1 }],
      },
      TEST_WEEK_START,
      'profile-stephen-strange',
      'medical',
    );

    expect(result).toMatchObject({ ok: false, field: 'doctorId' });
    expect(repository.snapshot()).toEqual(before);
  });

  it('prevents medical role from closing or modifying slots of another doctor', () => {
    const repository = new MockSchedulingRepository();
    const doctors = repository.snapshot().doctors;
    expect(doctors.length).toBeGreaterThanOrEqual(2);
    const doctor1 = doctors[0];
    const doctor2 = doctors[1];

    // หา slot ของ doctor2
    const slotDoctor2 = repository.snapshot().slots.find((s) => s.doctorId === doctor2.id);
    expect(slotDoctor2).toBeDefined();
    if (!slotDoctor2) return;

    // doctor1 (medical) พยายาม toggle slot ของ doctor2 -> ต้องถูกปฏิเสธ
    const failResult = repository.toggleSlot(slotDoctor2.id, doctor1.profileId, 'medical');
    expect(failResult).toMatchObject({
      ok: false,
      error: 'ไม่มีสิทธิ์จัดการรอบตรวจของแพทย์ท่านอื่น',
    });

    // staff_admin สามารถ toggle slot ของ doctor2 ได้
    const adminResult = repository.toggleSlot(slotDoctor2.id, 'admin-id', 'staff_admin');
    expect(adminResult.ok).toBe(true);
  });

  it('allows medical role to toggle their own slot', () => {
    const repository = new MockSchedulingRepository();
    const doctor = repository.snapshot().doctors[0];
    const ownSlot = repository.snapshot().slots.find((s) => s.doctorId === doctor.id);
    expect(ownSlot).toBeDefined();
    if (!ownSlot) return;

    const result = repository.toggleSlot(ownSlot.id, doctor.profileId, 'medical');
    expect(result.ok).toBe(true);
  });

});
