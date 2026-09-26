import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { allowedActions, bangkokDate, createClinicApiRepository, createClinicDatabaseRepository } from '@/features/clinic-care';
import { createClinicMockRepository } from './clinic-care-mock-repository';
import { appointmentId, doctorId, fixture, medicationId, patientId, serviceId, slotId, staffId, withAppointment } from './clinic-care-fixtures';

const recordId = '00000000-0000-4000-8000-000000000018';
function recordSeed(createdAt: string) {
  const seed = withAppointment('medical');
  seed.records = [{ id: recordId, appointment_id: appointmentId, patient_id: patientId, doctor_id: doctorId, patient: 'ผู้ป่วยทดสอบ', doctor: 'แพทย์ทดสอบ', diagnosis: 'เดิม', treatment_notes: '', prescribed_medications: [], created_at: createdAt, completed: true, height_cm: null, weight_kg: null, blood_pressure: null, pulse_bpm: null }];
  return seed;
}

describe('Clinic manual contract', () => {
  it('books once, assigns a queue, and leaves state intact after duplicate failure', async () => {
    const repo = createClinicMockRepository(fixture());
    await repo.book(slotId, 'ทดสอบ');
    const before = await repo.load();
    expect(before.appointments[0]).toMatchObject({ status: 'pending', queue_number: 1 });
    expect(before.slots[0].booked_count).toBe(1);
    await expect(repo.book(slotId, 'ซ้ำ')).rejects.toThrow('มีนัด');
    expect(await repo.load()).toEqual(before);
  });
  it.each(['full', 'closed', 'invalid'] as const)('rejects %s without changing state', async (kind) => {
    const seed = fixture();
    if (kind === 'full') seed.slots[0].booked_count = 1;
    if (kind === 'closed') seed.slots[0].status = 'closed';
    const repo = createClinicMockRepository(seed);
    const before = await repo.load();
    await expect(repo.book(slotId, kind === 'invalid' ? '  ' : 'ทดสอบ')).rejects.toThrow();
    expect(await repo.load()).toEqual(before);
  });
  it('requests cancellation without freeing capacity or changing status', async () => {
    const seed = withAppointment('patient'); seed.appointments[0].status = 'confirmed';
    const repo = createClinicMockRepository(seed);
    await repo.transition(appointmentId, 'request_cancel');
    const data = await repo.load();
    expect(data.appointments[0].status).toBe('confirmed');
    expect(data.appointments[0].cancel_requested_at).toBeTruthy();
    expect(data.slots[0].booked_count).toBe(1);
  });
  it('requires and stores a reason when staff rejects an appointment', async () => {
    const seed = withAppointment('staff_admin'); seed.appointments[0].status = 'pending';
    const repo = createClinicMockRepository(seed);
    await expect(repo.transition(appointmentId, 'rejected')).rejects.toThrow('เหตุผลการปฏิเสธ');
    await repo.transition(appointmentId, 'rejected', 'รอบบริการถูกยกเลิก');
    expect((await repo.load()).appointments[0]).toMatchObject({ status: 'rejected', rejection_reason: 'รอบบริการถูกยกเลิก' });
  });
  it('lets the owning doctor approve or reject a pending appointment, but not another doctor appointment', async () => {
    const seed = withAppointment('medical'); seed.appointments[0].status = 'pending';
    expect(allowedActions('medical', seed.appointments[0], seed.slots[0])).toEqual(['confirmed', 'rejected']);
    const repo = createClinicMockRepository(seed);
    await repo.transition(appointmentId, 'confirmed');
    expect((await repo.load()).appointments[0].status).toBe('confirmed');

    const rejectedSeed = withAppointment('medical'); rejectedSeed.appointments[0].status = 'pending';
    const rejectedRepo = createClinicMockRepository(rejectedSeed);
    await rejectedRepo.transition(appointmentId, 'rejected', 'แพทย์ติดภารกิจ');
    expect((await rejectedRepo.load()).appointments[0]).toMatchObject({ status: 'rejected', rejection_reason: 'แพทย์ติดภารกิจ' });

    const otherDoctorSeed = withAppointment('medical'); otherDoctorSeed.appointments[0].status = 'pending'; otherDoctorSeed.slots[0].doctor_id = patientId;
    const otherDoctorRepo = createClinicMockRepository(otherDoctorSeed);
    const before = await otherDoctorRepo.load();
    await expect(otherDoctorRepo.transition(appointmentId, 'confirmed')).rejects.toThrow('ไม่มีสิทธิ์');
    expect(await otherDoctorRepo.load()).toEqual(before);
  });
  it('staff cancels only one selected appointment and preserves closed slot status', async () => {
    const seed = withAppointment('staff_admin'); seed.appointments[0].status = 'confirmed'; seed.slots[0].status = 'closed';
    const repo = createClinicMockRepository(seed);
    await repo.transition(appointmentId, 'cancelled');
    expect((await repo.load()).slots[0]).toMatchObject({ booked_count: 0, status: 'closed' });
  });
  it('exposes cancellation only to staff for approved or requested appointments', () => {
    const pending = withAppointment('staff_admin').appointments[0];
    pending.status = 'pending';
    const confirmed = { ...pending, status: 'confirmed' as const };
    const requested = { ...pending, cancel_requested_at: '2026-09-08T08:00:00+07:00' };
    expect(allowedActions('staff_admin', pending)).not.toContain('cancelled');
    expect(allowedActions('staff_admin', requested)).toContain('cancelled');
    expect(allowedActions('staff_admin', confirmed)).toContain('cancelled');
    expect(allowedActions('medical', confirmed)).not.toContain('cancelled');
  });
  it('cannot complete without a record or modify another doctor appointment', async () => {
    for (const otherDoctor of [false, true]) {
      const seed = withAppointment();
      if (otherDoctor) seed.slots[0].doctor_id = patientId;
      const repo = createClinicMockRepository(seed); const before = await repo.load();
      await expect(repo.transition(appointmentId, 'completed')).rejects.toThrow();
      expect(await repo.load()).toEqual(before);
    }
  });
  it('saves and completes atomically, preserves the pharmacy JSON contract and prevents amendments', async () => {
    const repo = createClinicMockRepository(withAppointment());
    const input = { appointmentId, diagnosis: 'ผลทดสอบ', advice: 'คำแนะนำ', complete: true,
      height_cm: 170, weight_kg: 65.5, blood_pressure: '120/80', pulse_bpm: 72,
      prescriptions: [{ medication_id: medicationId, name: 'ชื่อปลอม', dosage: 'ทดสอบ', frequency: 'ทดสอบ', duration_days: 1, quantity: 2 }] };
    await repo.saveRecord(input);
    const before = await repo.load();
    expect(before.appointments[0].status).toBe('completed');
    expect(before.records[0].prescribed_medications?.[0]).toMatchObject({ name: 'ยาทดสอบ', quantity: 2 });
    expect(before.records[0]).toMatchObject({ height_cm: 170, weight_kg: 65.5, blood_pressure: '120/80', pulse_bpm: 72 });
    await expect(repo.saveRecord(input)).rejects.toThrow();
    expect(await repo.load()).toEqual(before);
  });
  it('rejects invalid physical-exam values before changing the record state', async () => {
    const repo = createClinicMockRepository(withAppointment());
    const before = await repo.load();
    await expect(repo.saveRecord({ appointmentId, diagnosis: 'ผลทดสอบ', advice: '', complete: true,
      height_cm: 251, weight_kg: null, blood_pressure: '120-80', pulse_bpm: null, prescriptions: [] })).rejects.toThrow();
    expect(await repo.load()).toEqual(before);
  });
  it('invalid medication does not leave a partial record or completed appointment', async () => {
    const repo = createClinicMockRepository(withAppointment()); const before = await repo.load();
    await expect(repo.saveRecord({ appointmentId, diagnosis: 'ผลทดสอบ', advice: '', complete: true, prescriptions: [
      { medication_id: patientId, name: 'ยา', dosage: 'ทดสอบ', frequency: 'ทดสอบ', duration_days: 1, quantity: 1 },
    ] })).rejects.toThrow();
    expect(await repo.load()).toEqual(before);
  });
  it('allows the owning doctor to amend at minute 14 and rejects at minute 16', async () => {
    const input = { recordId, diagnosis: 'แก้ไขแล้ว', advice: '', prescriptions: [], height_cm: null, weight_kg: null, blood_pressure: null, pulse_bpm: null };
    const withinWindow = createClinicMockRepository(recordSeed('2026-09-08T08:00:00+07:00'), new Date('2026-09-08T08:14:00+07:00'));
    await withinWindow.updateRecord(input);
    expect((await withinWindow.load()).records[0].diagnosis).toBe('แก้ไขแล้ว');

    const expired = createClinicMockRepository(recordSeed('2026-09-08T08:00:00+07:00'), new Date('2026-09-08T08:16:00+07:00'));
    await expect(expired.updateRecord(input)).rejects.toThrow('หมดเวลาแก้ไขผลตรวจแล้ว');
  });
  it('rejects an amendment from a different doctor', async () => {
    const seed = recordSeed('2026-09-08T08:00:00+07:00');
    seed.actor.id = staffId;
    const repo = createClinicMockRepository(seed, new Date('2026-09-08T08:05:00+07:00'));
    await expect(repo.updateRecord({ recordId, diagnosis: 'ไม่ควรแก้ได้', advice: '', prescriptions: [], height_cm: null, weight_kg: null, blood_pressure: null, pulse_bpm: null })).rejects.toThrow('เฉพาะแพทย์เจ้าของเคส');
  });
  it('uses the Bangkok date across UTC midnight', () => expect(bangkokDate(new Date('2026-09-08T18:00:00Z'))).toBe('2026-09-09'));
});

describe('Clinic database adapter boundary', () => {
  it('loads medical records for staff_admin through the API repository', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const record = {
      id: recordId,
      appointment_id: appointmentId,
      patient_id: patientId,
      doctor_id: doctorId,
      diagnosis: 'ผลตรวจสำหรับเจ้าหน้าที่',
      treatment_notes: 'คำแนะนำ',
      prescribed_medications: [],
      created_at: '2026-09-08T08:00:00+07:00',
      height_cm: null,
      weight_kg: null,
      blood_pressure: null,
      pulse_bpm: null,
      appointment: { status: 'completed' },
      patient: { first_name: 'ผู้ป่วย', last_name: 'ทดสอบ' },
      doctor: { profile: { first_name: 'แพทย์', last_name: 'ทดสอบ' } },
    };
    const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    fetchMock
      .mockImplementationOnce(() => json([]))
      .mockImplementationOnce(() => json([]))
      .mockImplementationOnce(() => json([]))
      .mockImplementationOnce(() => json([record]))
      .mockImplementationOnce(() => json({ profile: { id: staffId }, role: 'staff_admin' }));

    const data = await createClinicApiRepository('staff_admin').load();
    expect(data.records).toHaveLength(1);
    expect(data.records[0]).toMatchObject({ diagnosis: 'ผลตรวจสำหรับเจ้าหน้าที่', completed: true });
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toContain('/api/medical-records');
  });

  function client(role = 'patient', active = true) {
    const rpc = vi.fn().mockResolvedValue({ data: fixture(), error: null });
    const single = vi.fn().mockResolvedValue({ data: { role, is_active: active }, error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: patientId } }, error: null });
    const fake = { auth: { getUser }, from: vi.fn((table: string) => table === 'services'
      ? { select: () => ({ eq: () => ({ order: vi.fn().mockResolvedValue({ data: [{ id: serviceId, code: 'GEN', name: 'เวชปฏิบัติทั่วไป' }, { id: '00000000-0000-4000-8000-000000000017', code: 'ALL', name: 'ทุกบริการ' }], error: null }) }) }) }
      : table === 'appointment_slots'
        ? { select: () => ({ in: vi.fn().mockResolvedValue({ data: [{ id: slotId, offering: { service_id: serviceId, service: { id: serviceId, name: 'เวชปฏิบัติทั่วไป' } } }], error: null }) }) }
        : { select: () => ({ eq: () => ({ single }) }) }), rpc };
    return { fake: fake as unknown as SupabaseClient, rpc, getUser };
  }
  it('loads a schema-checked snapshot from RPC with verified session', async () => {
    const c = client(); await expect(createClinicDatabaseRepository(c.fake, 'patient').load()).resolves.toEqual(fixture());
    expect(c.getUser).toHaveBeenCalled(); expect(c.rpc).toHaveBeenCalledWith('pai_workspace', undefined);
  });
  it.each(['medical', 'staff_admin'] as const)('loads only appointment patient phones for %s', async (role) => {
    const seed = withAppointment(role);
    const inIds = vi.fn().mockResolvedValue({ data: [{ id: patientId, phone: '0800000000' }], error: null });
    const fake = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: seed.actor.id } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: seed, error: null }),
      from: vi.fn((table: string) => table === 'services'
        ? { select: () => ({ eq: () => ({ order: vi.fn().mockResolvedValue({ data: [{ id: serviceId, code: 'GEN', name: 'เวชปฏิบัติทั่วไป' }, { id: '00000000-0000-4000-8000-000000000017', code: 'ALL', name: 'ทุกบริการ' }], error: null }) }) }) }
        : table === 'appointment_slots'
          ? { select: () => ({ in: vi.fn().mockResolvedValue({ data: [{ id: slotId, offering: { service_id: serviceId, service: { id: serviceId, name: 'เวชปฏิบัติทั่วไป' } } }], error: null }) }) }
          : { select: () => ({
            eq: () => ({ single: vi.fn().mockResolvedValue({ data: { role, is_active: true }, error: null }) }),
            in: inIds,
          }) }),
    };
    const repo = createClinicDatabaseRepository(fake as unknown as SupabaseClient, role);
    expect((await repo.load()).appointments[0].patient_phone).toBe('0800000000');
    expect(inIds).toHaveBeenCalledWith('id', [patientId]);
    inIds.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    await expect(repo.load()).rejects.toThrow('ไม่สามารถโหลดเบอร์โทร');
  });
  it.each([['medical', true], ['patient', false], ['unknown', true]])('rejects mismatched/inactive/unknown role %s %s before RPC', async (role, active) => {
    const c = client(String(role), Boolean(active));
    await expect(createClinicDatabaseRepository(c.fake, 'patient').book(slotId, 'ทดสอบ')).rejects.toThrow('ไม่มีสิทธิ์');
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it('does not accept UI role claims or send patient identity as a booking argument', async () => {
    const c = client(); const repo = createClinicDatabaseRepository(c.fake, 'patient');
    await expect(repo.transition(appointmentId, 'confirmed')).rejects.toThrow();
    expect(c.rpc).not.toHaveBeenCalled();
    await repo.book(slotId, ' ทดสอบ ');
    expect(c.rpc).toHaveBeenCalledWith('pai_book_appointment', { p_slot_id: slotId, p_reason: 'ทดสอบ' });
  });
  it.each(['medical', 'staff_admin'] as const)('allows %s to send an appointment decision to the RPC', async (role) => {
    const c = client(role); const repo = createClinicDatabaseRepository(c.fake, role);
    await repo.transition(appointmentId, 'confirmed');
    expect(c.rpc).toHaveBeenCalledWith('pai_transition_appointment', { p_appointment_id: appointmentId, p_action: 'confirmed', p_reason: null });
  });
  it('does not fall back to mock when the migration is missing', async () => {
    const c = client(); c.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    await expect(createClinicDatabaseRepository(c.fake, 'patient').load()).rejects.toThrow('ระบบยังไม่พร้อมบันทึกผลตรวจ');
  });
  it('sends physical-exam measurements to the database RPC', async () => {
    const c = client('medical');
    const repo = createClinicDatabaseRepository(c.fake, 'medical');
    await repo.saveRecord({ appointmentId, diagnosis: 'ผลทดสอบ', advice: '', complete: false,
      height_cm: 170, weight_kg: 65.5, blood_pressure: '120/80', pulse_bpm: 72, prescriptions: [] });
    expect(c.rpc).toHaveBeenCalledWith('pai_save_record', expect.objectContaining({
      p_appointment_id: appointmentId, p_height_cm: 170, p_weight_kg: 65.5,
      p_blood_pressure: '120/80', p_pulse_bpm: 72, p_complete: false,
    }));
  });
  it('uses the dedicated update_medical_record RPC for amendments', async () => {
    const c = client('medical');
    const repo = createClinicDatabaseRepository(c.fake, 'medical');
    await repo.updateRecord({ recordId, diagnosis: 'แก้ไขแล้ว', advice: '', prescriptions: [], height_cm: null, weight_kg: null, blood_pressure: null, pulse_bpm: null });
    expect(c.rpc).toHaveBeenCalledWith('update_medical_record', expect.objectContaining({ p_record_id: recordId, p_diagnosis: 'แก้ไขแล้ว' }));
  });
});
