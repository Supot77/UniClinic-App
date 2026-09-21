import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { MOCK_DOCTORS } from '@/mocks/scheduleData';
import { DatabaseSchedulingRepository } from '@/features/scheduling/data/databaseRepository';
import { MockSchedulingRepository } from '@/features/scheduling/data/mockRepository';
import { validateDoctorLeave } from '@/features/scheduling/domain/rules';

const TEST_TODAY = '2026-09-13';
const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/23_doctor_leaves.sql'), 'utf8');

describe('doctor leave domain rules', () => {
  it('accepts a future leave and rejects past, reversed, and overlapping ranges', () => {
    const doctor = MOCK_DOCTORS[0];
    const leave = {
      doctorId: doctor.id,
      startDate: '2026-09-15',
      endDate: '2026-09-17',
      reason: 'ประชุมวิชาการ',
    };

    const existingLeave = { ...leave, id: 'leave-1' };
    expect(validateDoctorLeave(leave, [], MOCK_DOCTORS, undefined, doctor.profileId, 'medical', TEST_TODAY)).toMatchObject({ ok: true });
    expect(validateDoctorLeave({ ...leave, startDate: '2026-09-12' }, [], MOCK_DOCTORS, undefined, doctor.profileId, 'medical', TEST_TODAY)).toMatchObject({ ok: false, field: 'startDate' });
    expect(validateDoctorLeave({ ...leave, startDate: '2026-09-18', endDate: '2026-09-17' }, [], MOCK_DOCTORS, undefined, doctor.profileId, 'medical', TEST_TODAY)).toMatchObject({ ok: false, error: 'วันเริ่มลาต้องไม่เกินวันสิ้นสุด' });
    expect(validateDoctorLeave({ ...leave, startDate: '2026-09-16' }, [existingLeave], MOCK_DOCTORS, undefined, doctor.profileId, 'medical', TEST_TODAY)).toMatchObject({ ok: false, error: 'ช่วงวันลาซ้ำซ้อนกับวันลาเดิมของแพทย์' });
  });

  it('enforces medical ownership while allowing staff_admin to manage another doctor', () => {
    const [owner, other] = MOCK_DOCTORS;
    const input = { doctorId: other.id, startDate: '2026-09-15', endDate: '2026-09-15' };
    expect(validateDoctorLeave(input, [], MOCK_DOCTORS, undefined, owner.profileId, 'medical', TEST_TODAY)).toMatchObject({ ok: false, error: 'ไม่มีสิทธิ์จัดการวันลาของแพทย์ท่านนี้' });
    expect(validateDoctorLeave(input, [], MOCK_DOCTORS, undefined, 'admin', 'staff_admin', TEST_TODAY)).toMatchObject({ ok: true });
  });
});

describe('MockSchedulingRepository doctor leaves', () => {
  it('saves leave, blocks new slots, and preserves existing slots', () => {
    const repository = new MockSchedulingRepository();
    const doctor = repository.snapshot().doctors[0];
    const service = repository.snapshot().services[0];
    const existingSlot = repository.saveSlot(
      { doctorId: doctor.id, serviceId: service.id, slotDate: '2026-09-15', startTime: '10:00', endTime: '10:30', maxCapacity: 1 },
      undefined,
      TEST_TODAY,
    );
    expect(existingSlot).toMatchObject({ ok: true });
    const leaveResult = repository.saveDoctorLeave(
      { doctorId: doctor.id, startDate: '2026-09-15', endDate: '2026-09-17', reason: 'ไปราชการ' },
      undefined,
      'admin-1',
      'staff_admin',
      TEST_TODAY,
    );
    expect(leaveResult).toMatchObject({ ok: true, value: { doctorId: doctor.id, reason: 'ไปราชการ' } });

    const before = repository.snapshot();
    const blocked = repository.saveSlot(
      { doctorId: doctor.id, serviceId: service.id, slotDate: '2026-09-15', startTime: '09:00', endTime: '09:30', maxCapacity: 1 },
      undefined,
      TEST_TODAY,
    );
    expect(blocked).toMatchObject({ ok: false, error: 'แพทย์มีวันลาในวันที่เลือก ไม่สามารถสร้างรอบตรวจใหม่ได้' });
    expect(repository.snapshot()).toEqual(before);
    expect(repository.snapshot().slots.some((slot) => slot.slotDate === '2026-09-15' && slot.startTime === '10:00')).toBe(true);
  });

  it('deletes a leave only for an authorized actor', () => {
    const repository = new MockSchedulingRepository();
    const [owner, other] = repository.snapshot().doctors;
    const created = repository.saveDoctorLeave({ doctorId: owner.id, startDate: '2026-09-20', endDate: '2026-09-20' }, undefined, 'admin-1', 'staff_admin', TEST_TODAY);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(repository.deleteDoctorLeave(created.value.id, other.profileId, 'medical')).toMatchObject({ ok: false, error: 'ไม่มีสิทธิ์จัดการวันลาของแพทย์ท่านนี้' });
    expect(repository.snapshot().doctorLeaves).toHaveLength(1);
    expect(repository.deleteDoctorLeave(created.value.id, owner.profileId, 'medical')).toMatchObject({ ok: true });
    expect(repository.snapshot().doctorLeaves).toHaveLength(0);
  });
});

describe('DatabaseSchedulingRepository doctor leaves', () => {
  it('maps doctor leave rows and inserts a valid leave', async () => {
    const doctorId = 'a0000000-0000-0000-0000-000000000001';
    const row = {
      id: 'b0000000-0000-0000-0000-000000000001',
      doctor_id: doctorId,
      start_date: '2026-09-15',
      end_date: '2026-09-17',
      reason: 'อบรม',
      created_by: doctorId,
      created_at: '2026-09-13T00:00:00Z',
    };
    const mockSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockOrder = vi.fn().mockResolvedValue({ data: [row], error: null });
    const mockFrom = vi.fn((table: string) => table === 'doctor_leaves'
      ? { insert: mockInsert, select: vi.fn().mockReturnValue({ order: mockOrder }) }
      : {});
    const repo = new DatabaseSchedulingRepository({ from: mockFrom } as unknown as SupabaseClient);
    const doctors = [{ id: doctorId, profileId: doctorId, fullName: 'นพ. สมชาย', email: '', initials: 'สช', specialty: 'ทั่วไป', departmentId: 'dept-1', availability: 'active' as const }];

    await expect(repo.fetchDoctorLeaves()).resolves.toEqual([{ id: row.id, doctorId, startDate: row.start_date, endDate: row.end_date, reason: row.reason, createdBy: row.created_by, createdAt: row.created_at }]);
    const result = await repo.saveDoctorLeave({ doctorId, startDate: row.start_date, endDate: row.end_date, reason: row.reason }, [], doctors, undefined, doctorId, 'medical', TEST_TODAY);
    expect(result).toMatchObject({ ok: true, value: { id: row.id, doctorId, startDate: row.start_date } });
    expect(mockFrom).toHaveBeenCalledWith('doctor_leaves');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ doctor_id: doctorId, start_date: row.start_date, end_date: row.end_date }));
  });
});

describe('doctor leave migration', () => {
  it('defines additive storage, overlap protection, and canonical RLS', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.doctor_leaves');
    expect(migration).toContain('REFERENCES public.doctors(id) ON DELETE CASCADE');
    expect(migration).toContain('created_by uuid REFERENCES auth.users(id)');
    expect(migration).toContain('doctor_leaves_no_overlap');
    expect(migration).toContain("public.get_user_role() = 'staff_admin'");
    expect(migration).toContain("public.get_user_role() = 'medical'");
    expect(migration).toContain('doctor_id = auth.uid()');
    expect(migration).not.toMatch(/^\s*(TRUNCATE|DELETE|UPDATE|INSERT)\b/im);
    expect(migration).not.toMatch(/service_role|\.env\.local/i);
  });
});
