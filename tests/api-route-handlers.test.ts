import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { GET as getDoctorAccounts } from '@/app/api/doctors/accounts/route';
import { GET as getDoctors } from '@/app/api/doctors/route';
import { GET as getOfferings } from '@/app/api/schedules/offerings/route';
import { GET as getSlots } from '@/app/api/schedules/slots/route';

describe('API Route Handlers', () => {
  beforeEach(() => {
    supabaseMock.auth.getUser.mockReset();
    supabaseMock.rpc.mockReset();
    supabaseMock.from.mockClear();
    Object.keys(builders).forEach((key) => delete builders[key]);
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

    const response = await getSlots(new Request('http://localhost/api/schedules/slots'));

    expect(response.status).toBe(200);
    expect(builders.appointment_slots.select).toHaveBeenCalledWith('id, doctor_id, daily_service_offering_id, slot_date, start_time, end_time, max_capacity, booked_count, status, offering:daily_service_offerings(service_id, offering_date, is_active)');
    expect(builders.appointment_slots.order).toHaveBeenCalledWith('slot_date', { ascending: true });
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
