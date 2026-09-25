import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
};

const { supabaseMock, builders } = vi.hoisted(() => {
  const builders: Record<string, QueryBuilder> = {};
  const supabaseMock = {
    auth: { getUser: vi.fn() },
    from: vi.fn((table: string) => builders[table]),
    rpc: vi.fn(),
  };
  return { supabaseMock, builders };
});

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn(async () => supabaseMock) }));

function builder(result: { data?: unknown; error?: unknown; count?: number | null }): QueryBuilder {
  const query = {} as QueryBuilder;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.insert = vi.fn(() => query);
  query.update = vi.fn(() => query);
  query.delete = vi.fn(() => query);
  query.single = vi.fn(async () => result);
  query.maybeSingle = vi.fn(async () => result);
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return query;
}

import { POST as postDepartment } from '@/app/api/departments/route';
import { GET as getDepartments } from '@/app/api/departments/route';
import { POST as postAppointment } from '@/app/api/appointments/route';
import { PATCH as patchMedicalRecord } from '@/app/api/medical-records/[id]/route';
import { GET as getDoctorAccounts } from '@/app/api/doctors/accounts/route';
import { GET as getDoctors } from '@/app/api/doctors/route';
import { GET as getOfferings } from '@/app/api/schedules/offerings/route';
import { GET as getSlots } from '@/app/api/schedules/slots/route';
import { POST as postSlots } from '@/app/api/schedules/slots/route';

describe('API Route Handlers', () => {
  beforeEach(() => {
    supabaseMock.auth.getUser.mockReset();
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockClear();
    Object.keys(builders).forEach((key) => delete builders[key]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows public department discovery and limits inactive rows for guests', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    builders.departments = builder({ data: [{ id: 'department-1', name: 'เวชทั่วไป', is_active: true }], error: null });

    const response = await getDepartments();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{ id: 'department-1', name: 'เวชทั่วไป', is_active: true }]);
    expect(builders.departments.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('allows guests to read only active doctor profiles for the schedule', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    builders.doctors = builder({ data: [
      { id: 'doctor-active', specialty: 'เวชทั่วไป', department_id: 'department-1' },
      { id: 'doctor-inactive', specialty: 'ทันตกรรม', department_id: 'department-1' },
    ], error: null });
    builders.profiles = builder({ data: [
      { id: 'doctor-active', title: 'นพ.', first_name: 'สมชาย', last_name: 'ใจดี', role: 'medical', is_active: true },
      { id: 'doctor-inactive', title: 'ทพ.', first_name: 'สมศักดิ์', last_name: 'ฟันสวย', role: 'medical', is_active: false },
    ], error: null });
    builders.departments = builder({ data: [{ id: 'department-1', name: 'เวชทั่วไป' }], error: null });

    const response = await getDoctors();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{
      id: 'doctor-active',
      specialty: 'เวชทั่วไป',
      department_id: 'department-1',
      profile: { id: 'doctor-active', title: 'นพ.', first_name: 'สมชาย', last_name: 'ใจดี' },
      department: { id: 'department-1', name: 'เวชทั่วไป' },
    }]);
  });

  it('allows guests to read active service offerings without creator identifiers', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    builders.daily_service_offerings = builder({ data: [{ id: 'offering-1', service_id: 'service-1', doctor_id: 'doctor-1', offering_date: '2026-09-23', is_active: true }], error: null });

    const response = await getOfferings();

    expect(response.status).toBe(200);
    expect(builders.daily_service_offerings.select).toHaveBeenCalledWith('id, service_id, doctor_id, offering_date, is_active');
    await expect(response.json()).resolves.toEqual([{ id: 'offering-1', service_id: 'service-1', doctor_id: 'doctor-1', offering_date: '2026-09-23', is_active: true }]);
  });

  it('allows guests to read public schedule slots while keeping appointment writes protected', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    builders.appointment_slots = builder({ data: [{ id: 'slot-1', doctor_id: 'doctor-1', slot_date: '2026-09-23', status: 'available' }], error: null });
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });

    const response = await getSlots(new Request('http://localhost/api/schedules/slots'));

    expect(response.status).toBe(200);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('get_schedule_slots');
    expect(builders.appointment_slots.select).toHaveBeenCalledWith('id, doctor_id, daily_service_offering_id, slot_date, start_time, end_time, max_capacity, status, offering:daily_service_offerings(service_id, offering_date, is_active, service:services(id, code, name, is_active)), doctor:doctors(id, profile:profiles(id, title, first_name, last_name), department:departments(id, name))');
  });

  it('rejects a same-day slot that starts before the current Bangkok time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-08T05:00:00Z'));
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'staff-1' } }, error: null });
    builders.profiles = builder({ data: { id: 'staff-1', role: 'staff_admin', is_active: true }, error: null });

    const response = await postSlots(new Request('http://localhost/api/schedules/slots', {
      method: 'POST',
      body: JSON.stringify({
        doctorId: '00000000-0000-4000-8000-000000000001',
        serviceId: '00000000-0000-4000-8000-000000000002',
        slotDate: '2026-09-08',
        startTime: '11:30',
        endTime: '12:00',
        maxCapacity: 1,
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'ไม่สามารถสร้างรอบตรวจของเวลาที่ผ่านมาได้' });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('splits batch creation so past blocks are removed only from today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-08T05:00:00Z'));
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'staff-1' } }, error: null });
    const profiles = builder({ data: { id: '00000000-0000-4000-8000-000000000001', role: 'medical', is_active: true }, error: null });
    profiles.single.mockResolvedValueOnce({ data: { id: 'staff-1', role: 'staff_admin', is_active: true }, error: null });
    builders.profiles = profiles;
    builders.doctors = builder({ data: { id: '00000000-0000-4000-8000-000000000001' }, error: null });
    builders.services = builder({ data: { id: '00000000-0000-4000-8000-000000000002', is_active: true }, error: null });
    supabaseMock.rpc.mockResolvedValue({ data: 1, error: null });

    const response = await postSlots(new Request('http://localhost/api/schedules/slots', {
      method: 'POST',
      body: JSON.stringify({
        doctorId: '00000000-0000-4000-8000-000000000001',
        serviceId: '00000000-0000-4000-8000-000000000002',
        dates: ['2026-09-08', '2026-09-09'],
        timeBlocks: [
          { startTime: '08:30', endTime: '09:00', maxCapacity: 1 },
          { startTime: '13:00', endTime: '13:30', maxCapacity: 1 },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(201);
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(1, 'create_appointment_slot_batch', expect.objectContaining({
      p_dates: ['2026-09-08'],
      p_time_blocks: [{ start_time: '13:00', end_time: '13:30', max_capacity: 1 }],
    }));
    expect(supabaseMock.rpc).toHaveBeenNthCalledWith(2, 'create_appointment_slot_batch', expect.objectContaining({
      p_dates: ['2026-09-09'],
      p_time_blocks: [
        { start_time: '08:30', end_time: '09:00', max_capacity: 1 },
        { start_time: '13:00', end_time: '13:30', max_capacity: 1 },
      ],
    }));
  });

  it('rejects protected department writes without a session', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await postDepartment(new Request('http://localhost/api/departments', {
      method: 'POST', body: JSON.stringify({ name: 'เวชทั่วไป' }), headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(401);
  });

  it('rejects appointment booking without a session', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await postAppointment(new Request('http://localhost/api/appointments', {
      method: 'POST', body: JSON.stringify({ slotId: '00000000-0000-4000-8000-000000000001', reason: 'ตรวจอาการ' }), headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(401);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('validates appointment booking before invoking the transactional RPC', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'patient-1' } }, error: null });
    builders.profiles = builder({ data: { id: 'patient-1', role: 'patient', is_active: true }, error: null });

    const response = await postAppointment(new Request('http://localhost/api/appointments', {
      method: 'POST', body: JSON.stringify({ slotId: 'not-a-uuid', reason: '' }), headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('passes a medical-record amendment to update_medical_record for the owning medical user', async () => {
    const recordId = '00000000-0000-4000-8000-000000000018';
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'medical-1' } }, error: null });
    builders.profiles = builder({ data: { id: 'medical-1', role: 'medical', is_active: true }, error: null });
    supabaseMock.rpc.mockResolvedValue({ data: recordId, error: null });

    const response = await patchMedicalRecord(new Request(`http://localhost/api/medical-records/${recordId}`, {
      method: 'PATCH', body: JSON.stringify({ diagnosis: 'แก้ไขแล้ว', advice: '', prescriptions: [], height_cm: null, weight_kg: null, blood_pressure: null, pulse_bpm: null }), headers: { 'Content-Type': 'application/json' },
    }), { params: Promise.resolve({ id: recordId }) });

    expect(response.status).toBe(200);
    expect(supabaseMock.rpc).toHaveBeenCalledWith('update_medical_record', expect.objectContaining({ p_record_id: recordId, p_diagnosis: 'แก้ไขแล้ว' }));
  });

  it('returns the database rejection when an amendment is outside the 15-minute window', async () => {
    const recordId = '00000000-0000-4000-8000-000000000018';
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'medical-1' } }, error: null });
    builders.profiles = builder({ data: { id: 'medical-1', role: 'medical', is_active: true }, error: null });
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'หมดเวลาแก้ไขผลตรวจแล้ว' } });

    const response = await patchMedicalRecord(new Request(`http://localhost/api/medical-records/${recordId}`, {
      method: 'PATCH', body: JSON.stringify({ diagnosis: 'แก้ไขแล้ว', advice: '', prescriptions: [] }), headers: { 'Content-Type': 'application/json' },
    }), { params: Promise.resolve({ id: recordId }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'หมดเวลาแก้ไขผลตรวจแล้ว' });
  });

  it('returns the database rejection when another doctor owns the session', async () => {
    const recordId = '00000000-0000-4000-8000-000000000018';
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'medical-2' } }, error: null });
    builders.profiles = builder({ data: { id: 'medical-2', role: 'medical', is_active: true }, error: null });
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'เฉพาะแพทย์เจ้าของเคสเท่านั้นที่แก้ไขผลตรวจได้' } });

    const response = await patchMedicalRecord(new Request(`http://localhost/api/medical-records/${recordId}`, {
      method: 'PATCH', body: JSON.stringify({ diagnosis: 'ไม่ควรแก้ได้', advice: '', prescriptions: [] }), headers: { 'Content-Type': 'application/json' },
    }), { params: Promise.resolve({ id: recordId }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'เฉพาะแพทย์เจ้าของเคสเท่านั้นที่แก้ไขผลตรวจได้' });
  });

  it('enforces canonical role before protected appointment booking', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'medical-1' } }, error: null });
    builders.profiles = builder({ data: { id: 'medical-1', role: 'medical', is_active: true }, error: null });

    const response = await postAppointment(new Request('http://localhost/api/appointments', {
      method: 'POST', body: JSON.stringify({ slotId: '00000000-0000-4000-8000-000000000001', reason: 'ตรวจอาการ' }), headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(403);
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('does not expose doctor account options to patients', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'patient-1' } }, error: null });
    builders.profiles = builder({ data: { id: 'patient-1', role: 'patient', is_active: true }, error: null });

    const response = await getDoctorAccounts();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it('builds doctor account display names from structured profile fields', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'staff-1' } }, error: null });
    const profiles = builder({
      data: [{
        id: 'doctor-1',
        title: 'นาย',
        first_name: 'สมชาย',
        last_name: 'ใจดี',
        role: 'medical',
        is_active: true,
      }],
      error: null,
    });
    profiles.single.mockResolvedValueOnce({ data: { id: 'staff-1', role: 'staff_admin', is_active: true }, error: null });
    builders.profiles = profiles;

    const response = await getDoctorAccounts();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{
      profileId: 'doctor-1',
      fullName: 'นาย สมชาย ใจดี',
      email: '',
    }]);
    expect(profiles.select).toHaveBeenNthCalledWith(2, 'id, title, first_name, last_name, role, is_active');
    expect(profiles.order).toHaveBeenCalledWith('first_name', { ascending: true });
    expect(profiles.order).toHaveBeenCalledWith('last_name', { ascending: true });
  });
});
