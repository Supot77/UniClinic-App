import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppointmentPage from '@/features/appointments';
import { MedicalRecordsPage, PatientRecordsPage } from '@/features/medical-records';
import { type ClinicRepository } from '@/features/clinic-care';
import { createClinicMockRepository } from './clinic-care-mock-repository';
import { appointmentId, doctorId, fixture, patientId, serviceId, slotId, universalServiceId, withAppointment } from './clinic-care-fixtures';

const editableRecordId = '00000000-0000-4000-8000-000000000019';
function recordSeed(createdAt: string) {
  const seed = withAppointment('medical');
  seed.records = [{ id: editableRecordId, appointment_id: appointmentId, patient_id: patientId, doctor_id: doctorId, patient: 'ผู้ป่วยทดสอบ', doctor: 'แพทย์ทดสอบ', diagnosis: 'เดิม', treatment_notes: '', prescribed_medications: [], created_at: createdAt, completed: true, height_cm: null, weight_kg: null, blood_pressure: null, pulse_bpm: null }];
  return seed;
}

describe('Clinic database-backed role containers with injected offline repository', () => {
  afterEach(() => vi.useRealTimers());
  it.each(['medical', 'staff_admin'] as const)('shows patient contact to %s', async (role) => {
    const seed = withAppointment(role);
    seed.appointments[0].patient_phone = '0800000000';
    seed.appointments[0].status = role === 'staff_admin' ? 'pending' : 'confirmed';
    render(<AppointmentPage role={role} repository={createClinicMockRepository(seed)} />);
    expect(await screen.findByText('เบอร์โทรผู้ป่วย: 0800000000')).toBeInTheDocument();
  });
  it('labels a missing phone without inventing a contact', async () => {
    const seed = withAppointment('medical');
    seed.appointments[0].status = 'confirmed';
    render(<AppointmentPage role="medical" repository={createClinicMockRepository(seed)} />);
    expect(await screen.findByText('เบอร์โทรผู้ป่วย: ไม่ได้ระบุ')).toBeInTheDocument();
  });
  it('uses the same full-viewport workspace frame for appointments', async () => {
    render(<AppointmentPage role="medical" repository={createClinicMockRepository(withAppointment('medical'))} />);
    const workspace = (await screen.findByRole('heading', { name: 'นัดหมายและคิวตรวจ' })).closest('section');
    expect(workspace).toHaveClass('w-screen', 'left-1/2', '-translate-x-1/2');
  });
  it('keeps one page heading and separates the medical record workspace from its history', async () => {
    render(<MedicalRecordsPage repository={createClinicMockRepository(withAppointment())} />);

    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'ผลตรวจและรายการยา' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'บันทึกผลตรวจ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'ผลตรวจของผู้ป่วยในความดูแล' })).toBeInTheDocument();
    expect(screen.getByText('โปรดตรวจสอบข้อมูลให้เรียบร้อยก่อนยืนยัน หลังบันทึกแล้วจะแก้ไขได้ภายใน 15 นาที')).toBeInTheDocument();
  });
  it('shows the patient visit reason as read-only context under the queue selector', async () => {
    render(<MedicalRecordsPage repository={createClinicMockRepository(withAppointment())} />);

    const reasonLabel = await screen.findByText('อาการหรือเหตุผลที่มาพบแพทย์:', { selector: 'span' });
    expect(reasonLabel.parentElement).toHaveTextContent('ทดสอบ');
  });
  it('allows the owning doctor to edit at minute 14 through the UI', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-08T08:14:00+07:00'));
    const repo = createClinicMockRepository(recordSeed('2026-09-08T08:00:00+07:00'), new Date('2026-09-08T08:14:00+07:00'));
    render(<MedicalRecordsPage repository={repo} />);
    expect(await screen.findByText(/แก้ไขได้อีก/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขผลตรวจ' }));
    fireEvent.change(screen.getByLabelText('ผลวินิจฉัยที่แก้ไข'), { target: { value: 'แก้ไขผ่าน UI' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }));
    await waitFor(() => expect(screen.getByText(/ผลวินิจฉัย:/).parentElement).toHaveTextContent('แก้ไขผ่าน UI'));
  });
  it('keeps meal timing editable when amending a prescribed medication', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-08T08:14:00+07:00'));
    const seed = recordSeed('2026-09-08T08:00:00+07:00');
    seed.records[0].prescribed_medications = [{ medication_id: seed.medications[0].id, name: seed.medications[0].name, dosage: '1 เม็ด', frequency: 'หลังอาหาร · เช้า', duration_days: 1, quantity: 1 }];
    const repo = createClinicMockRepository(seed, new Date('2026-09-08T08:14:00+07:00'));
    render(<MedicalRecordsPage repository={repo} />);
    fireEvent.click(await screen.findByRole('button', { name: 'แก้ไขผลตรวจ' }));
    const mealButton = screen.getByRole('button', { name: 'การใช้ยากับอาหาร รายการที่ 1' });
    expect(mealButton).toHaveTextContent('หลังอาหาร');
    fireEvent.click(mealButton);
    fireEvent.click(screen.getByRole('option', { name: 'ก่อนอาหาร' }));
    fireEvent.change(screen.getByDisplayValue('เช้า'), { target: { value: 'เช้า เย็น' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกการแก้ไข' }));
    await waitFor(async () => expect((await repo.load()).records[0].prescribed_medications?.[0].frequency).toBe('ก่อนอาหาร · เช้า เย็น'));
  });
  it('disables the edit action at minute 16 through the UI', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-08T08:16:00+07:00'));
    render(<MedicalRecordsPage repository={createClinicMockRepository(recordSeed('2026-09-08T08:00:00+07:00'), new Date('2026-09-08T08:16:00+07:00'))} />);
    expect(await screen.findByText('หมดเวลาแก้ไข')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'แก้ไขไม่ได้' })).toBeDisabled();
  });
  it('gives the patient record page a clear empty state', async () => {
    render(<PatientRecordsPage repository={createClinicMockRepository(fixture('patient'))} />);

    expect(await screen.findByRole('heading', { level: 1, name: 'ประวัติการรักษา' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'ผลตรวจและรายการยาของฉัน' })).toBeInTheDocument();
    expect(screen.getByText('ยังไม่มีผลตรวจ')).toBeInTheDocument();
    expect(screen.getByText('เมื่อมีผลตรวจ รายการจะแสดงที่นี่')).toBeInTheDocument();
  });
  it('does not expose medical records to staff_admin', async () => {
    const seed = fixture('staff_admin');
    seed.records = [{ id: editableRecordId, appointment_id: appointmentId, patient_id: patientId, doctor_id: doctorId, patient: 'ผู้ป่วยทดสอบ', doctor: 'แพทย์ทดสอบ', diagnosis: 'ผลตรวจสำหรับเจ้าหน้าที่', treatment_notes: 'คำแนะนำ', prescribed_medications: [], created_at: '2026-09-08T08:00:00+07:00', completed: true, height_cm: null, weight_kg: null, blood_pressure: null, pulse_bpm: null }];
    expect((await createClinicMockRepository(seed).load()).records).toHaveLength(0);

    const appointmentSeed = withAppointment('staff_admin');
    appointmentSeed.appointments[0].status = 'completed';
    appointmentSeed.appointments[0].has_record = true;
    render(<AppointmentPage role="staff_admin" repository={createClinicMockRepository(appointmentSeed)} />);
    expect(await screen.findByRole('heading', { name: 'รายการนัดทั้งหมด' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ผลตรวจและรายการยา' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'เปิดผลตรวจ' })).not.toBeInTheDocument();
  });
  it('saves and displays the prescribed dose, meal, times and duration', async () => {
    const repo = createClinicMockRepository(withAppointment());
    render(<MedicalRecordsPage repository={repo} />);
    const workspace = (await screen.findByRole('heading', { name: 'ผลตรวจและรายการยา' })).closest('section');
    expect(workspace).toHaveClass('w-screen', 'left-1/2', '-translate-x-1/2');
    fireEvent.change(screen.getByLabelText('ส่วนสูง (ซม.)'), { target: { value: '170' } });
    fireEvent.change(screen.getByLabelText('น้ำหนัก (กก.)'), { target: { value: '65.5' } });
    fireEvent.change(screen.getByLabelText('ความดันโลหิต (mmHg)'), { target: { value: '120/80' } });
    fireEvent.change(screen.getByLabelText('ชีพจร (ครั้ง/นาที)'), { target: { value: '72' } });
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    fireEvent.change(screen.getByLabelText('ผลวินิจฉัย'), { target: { value: 'ผลทดสอบ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    const addMedicationButton = screen.getByRole('button', { name: 'เพิ่มรายการยา' });
    expect(addMedicationButton).toHaveClass('bg-brand-surface', 'text-brand-ink', 'hover:bg-brand-soft');
    fireEvent.click(addMedicationButton);
    const removeMedicationButton = screen.getByRole('button', { name: 'ลบยารายการที่ 1' });
    expect(removeMedicationButton).toHaveClass('text-status-critical', 'hover:bg-status-critical-bg', 'shrink-0');
    expect(removeMedicationButton).not.toHaveClass('absolute');
    fireEvent.click(screen.getByRole('button', { name: 'ยารายการที่ 1' }));
    fireEvent.click(screen.getByRole('option', { name: 'ยาทดสอบ · เม็ด' }));
    fireEvent.change(screen.getByLabelText('ขนาดยาต่อครั้ง'), { target: { value: '2 เม็ด' } });
    fireEvent.click(screen.getByRole('button', { name: 'การใช้ยากับอาหาร รายการที่ 1' }));
    expect(screen.getByRole('listbox', { name: 'การใช้ยากับอาหาร รายการที่ 1' })).toHaveClass('bottom-full', 'mb-2');
    fireEvent.click(screen.getByRole('option', { name: 'หลังอาหาร' }));
    fireEvent.change(screen.getByLabelText('วิธีใช้ / ความถี่ รายการที่ 1'), { target: { value: 'เช้า เที่ยง เย็น' } });
    fireEvent.change(screen.getByLabelText('ระยะเวลา (วัน)'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('จำนวนที่สั่ง (หน่วยยา)'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันบันทึกผลและจบการตรวจ' }));
    expect(await screen.findByText('หลังอาหาร · เช้า เที่ยง เย็น')).toBeInTheDocument();
    expect(screen.getByText('2 เม็ด')).toBeInTheDocument();
    expect(screen.getByText('3 วัน')).toBeInTheDocument();
    expect(screen.getByText('170 ซม.')).toBeInTheDocument();
    expect(screen.getByText('65.5 กก.')).toBeInTheDocument();
    expect(screen.getByText('120/80 mmHg')).toBeInTheDocument();
    expect(screen.getByText('72 ครั้ง/นาที')).toBeInTheDocument();
    expect((await repo.load()).records[0].prescribed_medications?.[0]).toMatchObject({ dosage: '2 เม็ด', frequency: 'หลังอาหาร · เช้า เที่ยง เย็น', duration_days: 3, quantity: 18 });
    expect((await repo.load()).records[0]).toMatchObject({ height_cm: 170, weight_kg: 65.5, blood_pressure: '120/80', pulse_bpm: 72 });
  });
  it('removes a medication with a compact red X control without affecting the record form', async () => {
    render(<MedicalRecordsPage repository={createClinicMockRepository(withAppointment())} />);
    fireEvent.click(await screen.findByRole('button', { name: 'ถัดไป' }));
    fireEvent.change(screen.getByLabelText('ผลวินิจฉัย'), { target: { value: 'ผลทดสอบ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มรายการยา' }));
    expect(screen.getByRole('button', { name: 'ลบยารายการที่ 1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ลบยารายการที่ 1' }));
    expect(screen.queryByRole('button', { name: 'ลบยารายการที่ 1' })).not.toBeInTheDocument();
    expect(screen.getByText('ยังไม่มีรายการยา สามารถบันทึกผลตรวจโดยไม่สั่งยาได้')).toBeInTheDocument();
  });
  it('shows loading, then empty state without a role switcher', async () => {
    render(<AppointmentPage role="patient" repository={createClinicMockRepository(fixture())} />);
    expect(screen.getByRole('status', { name: 'กำลังโหลดหน้าบริการ' })).toBeInTheDocument();
    expect(await screen.findByText('ไม่พบนัดหมายตามเงื่อนไขนี้')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /มุมมอง/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'อนุมัตินัด' })).not.toBeInTheDocument();
  });
  it('hydrates booking form from a slot deep link', async () => {
    render(<AppointmentPage role="patient" initialSlotId={slotId} repository={createClinicMockRepository(fixture())} />);

    expect(await screen.findByRole('heading', { name: 'จองนัดใหม่' })).toBeInTheDocument();
    expect(screen.getByLabelText('วันที่ตรวจ')).toHaveValue('2026-09-09');
    expect(screen.getByRole('button', { name: 'บริการ' })).toHaveTextContent('ทั่วไป');
    expect(screen.getByRole('button', { name: 'รอบตรวจ' })).toHaveTextContent('09:00–09:30 · แพทย์ทดสอบ');
  });
  it('hides full slots and slots already booked by the patient while keeping another patient slot with capacity visible', async () => {
    const seed = fixture('patient');
    const fullSlotId = '00000000-0000-4000-8000-000000000007';
    const ownSlotId = '00000000-0000-4000-8000-000000000008';
    const partialSlotId = '00000000-0000-4000-8000-000000000009';
    seed.slots = [
      { ...seed.slots[0], id: fullSlotId, start_time: '09:00:00', max_capacity: 1, booked_count: 1 },
      { ...seed.slots[0], id: ownSlotId, start_time: '10:00:00', end_time: '10:30:00', max_capacity: 2, booked_count: 1 },
      { ...seed.slots[0], id: partialSlotId, start_time: '11:00:00', end_time: '11:30:00', max_capacity: 2, booked_count: 1 },
    ];
    seed.appointments = [{ id: '00000000-0000-4000-8000-000000000010', user_id: seed.actor.id, patient: 'ผู้ป่วยทดสอบ', slot_id: ownSlotId, queue_number: 1, reason: 'ทดสอบ', status: 'pending', cancel_requested_at: null, rejection_reason: null, has_record: false }];
    render(<AppointmentPage role="patient" initialSlotId={partialSlotId} repository={createClinicMockRepository(seed)} />);

    fireEvent.click(await screen.findByRole('button', { name: 'รอบตรวจ' }));
    expect(screen.queryByRole('option', { name: /09:00–09:30/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /10:00–10:30/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /11:00–11:30/ })).toBeInTheDocument();
  });
  it('filters a specific service while including universal-service rounds and keeping full rounds hidden', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-09T08:00:00+07:00'));
    const seed = fixture('patient');
    const universalSlotId = '00000000-0000-4000-8000-000000000020';
    const fullSpecificSlotId = '00000000-0000-4000-8000-000000000021';
    const availableSpecificSlotId = '00000000-0000-4000-8000-000000000022';
    seed.slots = [
      { ...seed.slots[0], id: fullSpecificSlotId, service_id: serviceId, service: 'เวชปฏิบัติทั่วไป', start_time: '09:00:00', booked_count: 1 },
      { ...seed.slots[0], id: universalSlotId, service_id: universalServiceId, service: 'ทุกบริการ', start_time: '10:00:00', end_time: '10:30:00', booked_count: 0 },
      { ...seed.slots[0], id: availableSpecificSlotId, service_id: serviceId, service: 'เวชปฏิบัติทั่วไป', start_time: '11:00:00', end_time: '11:30:00', booked_count: 0 },
    ];
    const allServicesView = render(<AppointmentPage role="patient" repository={createClinicMockRepository(seed)} />);
    fireEvent.click(await screen.findByRole('button', { name: 'บริการ' }));
    fireEvent.click(screen.getByRole('option', { name: 'ทุกบริการ' }));
    fireEvent.click(screen.getByRole('button', { name: 'รอบตรวจ' }));
    expect(screen.queryByRole('option', { name: /09:00–09:30/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /10:00–10:30/ })).toHaveTextContent('มีรอบนี้');
    expect(screen.getByRole('option', { name: /11:00–11:30/ })).toHaveTextContent('มีรอบนี้');
    allServicesView.unmount();
    render(<AppointmentPage role="patient" repository={createClinicMockRepository(seed)} />);
    expect(await screen.findByRole('heading', { name: 'จองนัดใหม่' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'บริการ' }));
    fireEvent.click(screen.getByRole('option', { name: 'เวชปฏิบัติทั่วไป' }));
    fireEvent.click(screen.getByRole('button', { name: 'รอบตรวจ' }));
    expect(screen.queryByRole('option', { name: /09:00–09:30/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /10:00–10:30/ })).toHaveTextContent('มีรอบนี้');
  });
  it.each(['cancelled', 'rejected', 'no_show'] as const)('shows a slot again after the patient appointment is %s', async (status) => {
    const seed = fixture('patient');
    seed.appointments = [{ id: '00000000-0000-4000-8000-000000000011', user_id: seed.actor.id, patient: 'ผู้ป่วยทดสอบ', slot_id: slotId, queue_number: 1, reason: 'ทดสอบ', status, cancel_requested_at: null, rejection_reason: status === 'rejected' ? 'ทดสอบ' : null, has_record: false }];
    render(<AppointmentPage role="patient" initialSlotId={slotId} repository={createClinicMockRepository(seed)} />);

    fireEvent.click(await screen.findByRole('button', { name: 'รอบตรวจ' }));
    expect(screen.getByRole('option', { name: /09:00–09:30/ })).toBeInTheDocument();
  });
  it('uses the shared Thai calendar for booking date while keeping the list filter separate', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-08T12:00:00+07:00'));
    render(<AppointmentPage role="patient" repository={createClinicMockRepository(fixture())} />);
    expect(await screen.findByRole('heading', { name: 'จองนัดใหม่' })).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: /เปิดปฏิทินเลือกวันที่ตรวจ/ });
    expect(screen.queryByRole('dialog', { name: 'เลือกวันที่ตรวจ' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'เลือกวันที่ตรวจ' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'วันที่ 7 กันยายน 2569' })).toBeDisabled();
    expect(within(dialog).getByText('กันยายน 2569')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'เดือนถัดไป' }));
    expect(within(dialog).getByText('ตุลาคม 2569')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'เดือนก่อนหน้า' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'วันที่ 10 กันยายน 2569' }));
    expect(screen.getByLabelText('วันที่ตรวจ')).toHaveValue('2026-09-10');
    expect(screen.queryByRole('dialog', { name: 'เลือกวันที่ตรวจ' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'เลือกวันที่ตรวจ' })).not.toBeInTheDocument();
    const dateFilter = screen.getByRole('button', { name: 'กรองวันที่' });
    dateFilter.focus();
    fireEvent.click(dateFilter);
    expect(document.activeElement).toBe(dateFilter);
    expect(screen.queryByRole('dialog', { name: 'เลือกวันที่ตรวจ' })).not.toBeInTheDocument();
  });
  it('shows database error and supports retry instead of rendering demo data', async () => {
    const repo = createClinicMockRepository(fixture());
    const load = vi.fn().mockRejectedValueOnce(new Error('ฐานข้อมูลไม่พร้อม')).mockImplementation(() => repo.load());
    render(<AppointmentPage role="patient" repository={{ ...repo, load }} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('ฐานข้อมูลไม่พร้อม');
    fireEvent.click(screen.getByRole('button', { name: 'โหลดข้อมูลใหม่' }));
    expect(await screen.findByText('ไม่พบนัดหมายตามเงื่อนไขนี้')).toBeInTheDocument();
  });
  it('staff sees approval controls without results navigation or booking form', async () => {
    const seed = withAppointment('staff_admin'); seed.appointments[0].status = 'pending';
    render(<AppointmentPage role="staff_admin" repository={createClinicMockRepository(seed)} />);
    expect(await screen.findByRole('button', { name: 'อนุมัตินัด' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ยกเลิกนัด' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ผลตรวจและรายการยา' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'จองนัดใหม่' })).not.toBeInTheDocument();
  });
  it('shows cancellation to staff only for approved or requested appointments', async () => {
    const confirmedSeed = withAppointment('staff_admin');
    confirmedSeed.appointments[0].status = 'confirmed';
    render(<AppointmentPage role="staff_admin" repository={createClinicMockRepository(confirmedSeed)} />);
    expect(await screen.findByRole('button', { name: 'ยกเลิกนัด' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status', { name: 'กำลังโหลดหน้าบริการ' })).not.toBeInTheDocument());
  });

  it('does not expose cancellation to medical', async () => {
    const medicalSeed = withAppointment('medical');
    medicalSeed.appointments[0].status = 'confirmed';
    render(<AppointmentPage role="medical" repository={createClinicMockRepository(medicalSeed)} />);
    expect(screen.queryByRole('button', { name: 'ยกเลิกนัด' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status', { name: 'กำลังโหลดหน้าบริการ' })).not.toBeInTheDocument());
  });
  it('filters staff appointments by cancellation request', async () => {
    const seed = withAppointment('staff_admin');
    seed.appointments[0].status = 'pending';
    seed.appointments[0].cancel_requested_at = '2026-09-08T08:00:00+07:00';
    render(<AppointmentPage role="staff_admin" repository={createClinicMockRepository(seed)} />);
    fireEvent.click(await screen.findByRole('button', { name: 'สถานะ' }));
    fireEvent.click(screen.getByRole('option', { name: 'คำขอยกเลิก' }));
    expect(await screen.findByText('ผู้ป่วยทดสอบ · คิว 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ยกเลิกนัด' })).toBeInTheDocument();
  });
  it('medical sees approval actions for a pending appointment in the owning doctor queue', async () => {
    const seed = withAppointment('medical'); seed.appointments[0].status = 'pending';
    render(<AppointmentPage role="medical" repository={createClinicMockRepository(seed)} />);
    expect(await screen.findByRole('button', { name: 'อนุมัตินัด' })).toBeInTheDocument();
    expect(screen.getByText('ปฏิเสธนัด', { selector: 'summary' })).toBeInTheDocument();
  });
  it('opens the whole date filter block and requires a rejection reason for staff', async () => {
    const seed = withAppointment('staff_admin'); seed.appointments[0].status = 'pending';
    render(<AppointmentPage role="staff_admin" repository={createClinicMockRepository(seed)} />);
    const dateFilter = await screen.findByRole('button', { name: 'กรองวันที่' });
    fireEvent.click(dateFilter);
    expect(screen.getByRole('dialog', { name: 'กรองวันที่' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ปิดปฏิทิน' }));
    expect(document.activeElement).toBe(dateFilter);
    fireEvent.click(screen.getByText('ปฏิเสธนัด', { selector: 'summary' }));
    const reason = screen.getByRole('textbox', { name: 'เหตุผลการปฏิเสธ' });
    expect(screen.getByRole('button', { name: 'ยืนยันปฏิเสธนัด' })).toBeInTheDocument();
    fireEvent.submit(reason.closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('กรุณาระบุเหตุผลการปฏิเสธ');
    fireEvent.change(reason, { target: { value: 'รอบบริการถูกยกเลิก' } });
    fireEvent.submit(reason.closest('form')!);
    expect(await screen.findByText('ปฏิเสธนัดแล้วและบันทึกเหตุผล')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'สถานะ' }));
    fireEvent.click(screen.getByRole('option', { name: 'ไม่อนุมัติ' }));
    expect(await screen.findByText('เหตุผลการปฏิเสธ:')).toBeInTheDocument();
    expect(screen.getByText('รอบบริการถูกยกเลิก')).toBeInTheDocument();
  });
  it('prevents duplicate clicks while a transition is pending and keeps the old state after failure', async () => {
    const seed = withAppointment('staff_admin'); seed.appointments[0].status = 'pending';
    const repo = createClinicMockRepository(seed);
    let reject: (error: Error) => void = () => {};
    const transition = vi.fn(() => new Promise<void>((_, r) => { reject = r; }));
    render(<AppointmentPage role="staff_admin" repository={{ ...repo, transition }} />);
    const button = await screen.findByRole('button', { name: 'อนุมัตินัด' });
    fireEvent.click(button); fireEvent.click(button);
    expect(transition).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    reject(new Error('สถานะเปลี่ยนแล้ว'));
    expect(await screen.findByRole('alert')).toHaveTextContent('สถานะเปลี่ยนแล้ว');
    expect(screen.getAllByText('รออนุมัติ', { selector: 'span' })).not.toHaveLength(0);
  });
  it('does not render a snapshot for a different role', async () => {
    render(<PatientRecordsPage repository={createClinicMockRepository(fixture('staff_admin'))} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('ไม่มีสิทธิ์');
    expect(screen.queryByRole('heading', { name: 'บันทึกผลตรวจและรายการยา' })).not.toBeInTheDocument();
  });
  it('medical saves a result and the completed record appears after reload', async () => {
    render(<MedicalRecordsPage repository={createClinicMockRepository(withAppointment())} />);
    fireEvent.click(await screen.findByRole('button', { name: 'ถัดไป' }));
    const diagnosis = screen.getByRole('textbox', { name: 'ผลวินิจฉัย' });
    fireEvent.change(diagnosis, { target: { value: 'ผลทดสอบ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันบันทึกผลและจบการตรวจ' }));
    expect(await screen.findByText('บันทึกผลและจบการตรวจแล้ว ผู้ป่วยเปิดดูได้')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/ผลวินิจฉัย:/).parentElement).toHaveTextContent('ผลทดสอบ'));
    expect(screen.queryByRole('button', { name: 'ยืนยันบันทึกผลและจบการตรวจ' })).not.toBeInTheDocument();
  });
  it('failed record save retains the entered diagnosis for correction', async () => {
    const repo: ClinicRepository = { ...createClinicMockRepository(withAppointment()), saveRecord: vi.fn().mockRejectedValue(new Error('ไม่พบยา')) };
    render(<MedicalRecordsPage repository={repo} />);
    fireEvent.click(await screen.findByRole('button', { name: 'ถัดไป' }));
    const diagnosis = screen.getByRole('textbox', { name: 'ผลวินิจฉัย' });
    fireEvent.change(diagnosis, { target: { value: 'ผลทดสอบ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันบันทึกผลและจบการตรวจ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ไม่พบยา');
    expect(diagnosis).toHaveValue('ผลทดสอบ');
  });
  it('defaults staff to all appointments and medical to pending_confirmed', async () => {
    const seed = fixture('staff_admin');
    const { unmount } = render(<AppointmentPage role="staff_admin" repository={createClinicMockRepository(seed)} />);
    expect(await screen.findByRole('button', { name: 'สถานะ' })).toHaveTextContent('ทุกสถานะ');
    expect(document.querySelector('[data-appointment-status-summary]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-appointment-status]')).toHaveLength(5);
    unmount();

    render(<AppointmentPage role="medical" repository={createClinicMockRepository(fixture('medical'))} />);
    expect(await screen.findByRole('button', { name: 'สถานะ' })).toHaveTextContent('รออนุมัติและรอตรวจ');
  });
  it('shows the newest queue first and allows switching to oldest first', async () => {
    const seed = fixture('patient');
    const newestSlotId = '00000000-0000-4000-8000-000000000012';
    const oldestSlotId = '00000000-0000-4000-8000-000000000013';
    seed.slots = [
      { ...seed.slots[0], id: newestSlotId, slot_date: '2026-09-11', booked_count: 1 },
      { ...seed.slots[0], id: oldestSlotId, slot_date: '2026-09-10', booked_count: 1 },
    ];
    seed.appointments = [
      { id: '00000000-0000-4000-8000-000000000014', user_id: seed.actor.id, patient: 'ผู้ป่วยทดสอบ', slot_id: newestSlotId, queue_number: 2, reason: 'ใหม่', status: 'pending', cancel_requested_at: null, rejection_reason: null, has_record: false },
      { id: '00000000-0000-4000-8000-000000000015', user_id: seed.actor.id, patient: 'ผู้ป่วยทดสอบ', slot_id: oldestSlotId, queue_number: 1, reason: 'เก่า', status: 'pending', cancel_requested_at: null, rejection_reason: null, has_record: false },
    ];
    render(<AppointmentPage role="patient" repository={createClinicMockRepository(seed)} />);

    const newestFirst = await screen.findAllByRole('article');
    expect(newestFirst[0]).toHaveTextContent('ใหม่');
    expect(newestFirst[1]).toHaveTextContent('เก่า');

    fireEvent.click(screen.getByRole('button', { name: 'เรียงคิว' }));
    fireEvent.click(screen.getByRole('option', { name: 'เก่าสุดก่อน' }));
    const oldestFirst = screen.getAllByRole('article');
    expect(oldestFirst[0]).toHaveTextContent('เก่า');
    expect(oldestFirst[1]).toHaveTextContent('ใหม่');
  });
  it('hides start exam button and displays slot arrival badge before slot time for medical', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-08T09:00:00+07:00'));
    const seed = withAppointment('medical');
    seed.appointments[0].status = 'confirmed';
    render(<AppointmentPage role="medical" repository={createClinicMockRepository(seed)} />);
    expect(await screen.findByText('ยังไม่ถึงเวลารอบตรวจ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'เริ่มตรวจ' })).not.toBeInTheDocument();
  });
  it('shows start exam button when slot time has arrived for medical', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-09T09:00:00+07:00'));
    const seed = withAppointment('medical');
    seed.appointments[0].status = 'confirmed';
    render(<AppointmentPage role="medical" repository={createClinicMockRepository(seed)} />);
    expect(await screen.findByRole('button', { name: 'เริ่มตรวจ' })).toBeInTheDocument();
    expect(screen.queryByText('ยังไม่ถึงเวลารอบตรวจ')).not.toBeInTheDocument();
  });
  it('opens the physical-exam stepper after medical starts an appointment', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-09T09:00:00+07:00'));
    const seed = withAppointment('medical');
    seed.appointments[0].status = 'confirmed';
    const repo = createClinicMockRepository(seed, new Date('2026-09-09T09:00:00+07:00'));
    render(<AppointmentPage role="medical" repository={repo} />);

    fireEvent.click(await screen.findByRole('button', { name: 'เริ่มตรวจ' }));

    expect(await screen.findByRole('heading', { name: 'การตรวจร่างกายเบื้องต้น' })).toBeInTheDocument();
    expect(screen.getByLabelText('ส่วนสูง (ซม.)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeInTheDocument();
    expect((await repo.load()).appointments[0]).toMatchObject({ status: 'in_progress', has_record: false });
  });
  it('throws error when doctor attempts to start exam before slot arrival in mock repository', async () => {
    const seed = withAppointment('medical');
    seed.appointments[0].status = 'confirmed';
    const repo = createClinicMockRepository(seed, new Date('2026-09-08T08:00:00+07:00'));
    await expect(repo.transition(seed.appointments[0].id, 'in_progress')).rejects.toThrow('ยังไม่ถึงเวลารอบตรวจ');
  });
});
