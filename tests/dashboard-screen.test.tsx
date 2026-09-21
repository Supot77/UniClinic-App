import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DashboardScreen, { filterAppointmentQueue } from '@/components/dashboard/DashboardScreen';
import type { DashboardView } from '@/features/dashboard/types';

const getDashboardViewMock = vi.hoisted(() => vi.fn());
const requestPatientAppointmentCancellationMock = vi.hoisted(() => vi.fn());
const recordPatientMedicationTakenMock = vi.hoisted(() => vi.fn());
vi.mock('@/services/dashboardService', () => ({
  getDashboardView: getDashboardViewMock,
  requestPatientAppointmentCancellation: requestPatientAppointmentCancellationMock,
  recordPatientMedicationTaken: recordPatientMedicationTakenMock,
}));

const queue: DashboardView['appointmentQueue'] = [
  {
    id: 'today-pending', queueNumber: 1, date: '2026-09-14', startTime: '09:00', status: 'pending',
    patientName: 'ผู้ป่วยวันนี้', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
  },
  {
    id: 'today-confirmed', queueNumber: 2, date: '2026-09-14', startTime: '10:00', status: 'confirmed',
    patientName: 'ผู้ป่วยในคิว', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
  },
  {
    id: 'other-day-completed', queueNumber: 3, date: '2026-09-13', startTime: '11:00', status: 'completed',
    patientName: 'ผู้ป่วยวันก่อน', doctorName: 'แพทย์สอง', departmentName: 'อายุรกรรม',
  },
];

describe('Dashboard appointment filters', () => {
  it('filters today appointments, remaining queue, and restores all rows', () => {
    expect(filterAppointmentQueue(queue, 'today', '2026-09-14').map((item) => item.id)).toEqual(['today-pending', 'today-confirmed']);
    expect(filterAppointmentQueue(queue, 'remaining', '2026-09-14').map((item) => item.id)).toEqual(['today-confirmed']);
    expect(filterAppointmentQueue(queue, 'completed', '2026-09-14').map((item) => item.id)).toEqual(['other-day-completed']);
    expect(filterAppointmentQueue(queue, 'all', '2026-09-14')).toEqual(queue);
  });

  it('filters the staff patient table without a redundant heading', async () => {
    const view: DashboardView = {
      role: 'staff_admin',
      actor: { id: 'staff-1', fullName: 'เจ้าหน้าที่หนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-14',
      range: 'today',
      title: 'ภาพรวมงานคลินิกของผู้ดูแลระบบ',
      description: 'ติดตามนัดหมายและคิวของคลินิก',
      doctorGenderCounts: [
        { gender: 'male', label: 'ผู้ชาย', count: 2, percentage: 66.7 },
        { gender: 'female', label: 'ผู้หญิง', count: 1, percentage: 33.3 },
        { gender: 'unspecified', label: 'ไม่ระบุเพศ', count: 0, percentage: 0 },
      ],
      patientGenderCounts: [
        { gender: 'male', label: 'ผู้ชาย', count: 1, percentage: 33.3 },
        { gender: 'female', label: 'ผู้หญิง', count: 1, percentage: 33.3 },
        { gender: 'unspecified', label: 'ไม่ระบุเพศ', count: 1, percentage: 33.3 },
      ],
      metrics: [
        { id: 'appointments-in-range', label: 'นัดหมายวันนี้', value: 2, description: '', href: '/appointments', tone: 'blue' },
        { id: 'remaining-queue', label: 'คิวที่เหลือ', value: 1, description: '', href: '/appointments', tone: 'amber' },
      ],
      appointmentStatuses: [
        { status: 'pending', label: 'รอยืนยัน', count: 1 },
        { status: 'confirmed', label: 'ยืนยันแล้ว', count: 1 },
        { status: 'in_progress', label: 'กำลังตรวจ', count: 0 },
        { status: 'completed', label: 'เสร็จสิ้น', count: 0 },
      ],
      appointmentQueue: queue,
      departmentLoads: [{ departmentId: 'department-1', departmentName: 'เวชทั่วไป', appointmentCount: 2, capacity: 10, patientCount: 2, doctorCount: 1, activeDoctorCount: 1 }],
      doctorStatuses: [
        { doctorId: 'doctor-available', doctorName: 'แพทย์ว่าง', departmentId: 'department-1', departmentName: 'เวชทั่วไป', status: 'available' },
        { doctorId: 'doctor-away', doctorName: 'แพทย์ไม่อยู่', departmentId: 'department-1', departmentName: 'เวชทั่วไป', status: 'away' },
        { doctorId: 'doctor-in-progress', doctorName: 'แพทย์กำลังตรวจ', departmentId: 'department-1', departmentName: 'เวชทั่วไป', status: 'in_progress', currentPatientName: 'ผู้ป่วยกำลังตรวจ' },
      ],
      medicationAlerts: [
        { id: 'med-low-stock', name: 'ยาใกล้หมดในคลินิก', stock: 2, minimumStock: 5, expiryDate: '2026-12-31', lowStock: true, expired: false },
        { id: 'med-expired', name: 'ยาหมดอายุในคลินิก', stock: 8, minimumStock: 5, expiryDate: '2026-09-01', lowStock: false, expired: true },
      ],
      recentNotifications: [],
      roleCounts: [],
    };
    getDashboardViewMock.mockResolvedValue(view);

    render(<DashboardScreen role="staff_admin" actorId="staff-1" />);
    expect(await screen.findByRole('status', { name: 'สถานะฐานข้อมูล: เชื่อมต่อแล้ว' })).toBeInTheDocument();
    const appointmentStatusGroup = await screen.findByRole('group', { name: 'เลือกสถานะนัดหมาย' });
    const medicationFilterGroup = screen.getByRole('group', { name: 'กรองสถานะยา' });
    const allMedicationButton = within(medicationFilterGroup).getByRole('button', { name: /ทั้งหมด/ });
    const lowStockMedicationButton = within(medicationFilterGroup).getByRole('button', { name: /ใกล้หมด/ });
    const expiredMedicationButton = within(medicationFilterGroup).getByRole('button', { name: /หมดอายุ/ });
    expect(allMedicationButton).toHaveAttribute('aria-pressed', 'true');
    expect(medicationFilterGroup).toHaveClass('border-b', 'border-brand-border-soft');
    expect(allMedicationButton).toHaveClass('rounded-t-2xl', 'border-t-brand-strong');
    expect(allMedicationButton).toHaveTextContent('2');
    expect(lowStockMedicationButton).toHaveTextContent('1');
    expect(expiredMedicationButton).toHaveTextContent('1');
    expect(screen.getByText('ยาใกล้หมดในคลินิก')).toBeInTheDocument();
    expect(screen.getByText('ยาหมดอายุในคลินิก')).toBeInTheDocument();
    fireEvent.click(expiredMedicationButton);
    expect(expiredMedicationButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ยาหมดอายุในคลินิก')).toBeInTheDocument();
    expect(screen.queryByText('ยาใกล้หมดในคลินิก')).not.toBeInTheDocument();
    fireEvent.click(lowStockMedicationButton);
    expect(screen.getByText('ยาใกล้หมดในคลินิก')).toBeInTheDocument();
    expect(screen.queryByText('ยาหมดอายุในคลินิก')).not.toBeInTheDocument();
    fireEvent.click(allMedicationButton);
    const allStatusButton = within(appointmentStatusGroup).getByRole('button', { name: /ทั้งหมด/ });
    const pendingStatusButton = within(appointmentStatusGroup).getByRole('button', { name: /รอยืนยัน/ });
    expect(appointmentStatusGroup).toHaveClass('border-b', 'border-brand-border-soft');
    expect(allStatusButton).toHaveClass('rounded-t-2xl', 'border-t-brand-strong');
    expect(allStatusButton).toHaveAttribute('aria-pressed', 'true');
    expect(allStatusButton).toHaveTextContent('2');
    expect(pendingStatusButton).toHaveTextContent('1');
    expect(screen.queryByRole('region', { name: 'ข้อมูลสรุป' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'จัดการนัดหมาย' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'คิวและนัดหมายล่าสุด' })).not.toBeInTheDocument();
    expect(screen.queryByText('แสดงข้อมูลจำเป็นต่อการทำงานในช่วง')).not.toBeInTheDocument();
    const departmentOverview = screen.getByRole('heading', { name: 'ภาพรวมแยกตามแผนก' }).closest('section');
    expect(departmentOverview).not.toBeNull();
    expect(within(departmentOverview as HTMLElement).getByText('เวชทั่วไป')).toBeInTheDocument();
    expect(within(departmentOverview as HTMLElement).queryByRole('button', { name: /เวชทั่วไป/ })).not.toBeInTheDocument();
    expect(appointmentStatusGroup.compareDocumentPosition(departmentOverview as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const dashboardHeader = screen.getByRole('banner');
    const progressGroup = screen.getByRole('group', { name: 'ความคืบหน้านัดหมาย' });
    const dashboardFilter = screen.getByRole('region', { name: 'ตัวกรองแดชบอร์ด' });
    expect(within(dashboardHeader).queryByRole('group', { name: 'ความคืบหน้านัดหมาย' })).not.toBeInTheDocument();
    expect(dashboardFilter.compareDocumentPosition(progressGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(progressGroup).getByRole('img', { name: 'ยืนยันแล้ว 50%' })).toBeInTheDocument();
    expect(within(progressGroup).getByRole('img', { name: 'ตรวจเสร็จสิ้น 0%' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'สรุปจากข้อมูลวันนี้' })).not.toBeInTheDocument();
    const chartModeGroup = screen.getByRole('group', { name: 'เลือกข้อมูลภาพรวม' });
    const statusChartButton = within(chartModeGroup).getByRole('button', { name: 'แผนภาพสถานะ' });
    const genderChartButton = within(chartModeGroup).getByRole('button', { name: 'แผนภาพเพศ' });
    expect(statusChartButton).toHaveAttribute('aria-pressed', 'true');
    expect(genderChartButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('region', { name: 'สรุปเพศผู้ป่วยและแพทย์ในคลินิก' })).not.toBeInTheDocument();
    fireEvent.click(genderChartButton);
    expect(genderChartButton).toHaveAttribute('aria-pressed', 'true');
    expect(statusChartButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('group', { name: 'ความคืบหน้านัดหมาย' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'สรุปเพศผู้ป่วยและแพทย์ในคลินิก' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'ผู้ป่วยทั้งหมด 3 คน' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'แพทย์ทั้งหมด 3 คน' })).toBeInTheDocument();
    fireEvent.click(statusChartButton);
    expect(statusChartButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'ความคืบหน้านัดหมาย' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'สรุปเพศผู้ป่วยและแพทย์ในคลินิก' })).not.toBeInTheDocument();
    expect(screen.queryByText('เข้ารับบริการจริง')).not.toBeInTheDocument();
    const doctorStatusGroup = screen.getByRole('group', { name: 'กรองสถานะแพทย์' });
    expect(departmentOverview!.compareDocumentPosition(doctorStatusGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(doctorStatusGroup.compareDocumentPosition(medicationFilterGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(doctorStatusGroup).getAllByRole('button')).toHaveLength(2);
    const availableDoctorsButton = within(doctorStatusGroup).getByRole('button', { name: /ว่าง/ });
    const awayDoctorsButton = within(doctorStatusGroup).getByRole('button', { name: /ไม่อยู่/ });
    expect(doctorStatusGroup).toHaveClass('border-b', 'border-brand-border-soft');
    expect(awayDoctorsButton).toHaveAttribute('aria-pressed', 'true');
    expect(availableDoctorsButton).toHaveAttribute('aria-pressed', 'false');
    expect(availableDoctorsButton).toBeInTheDocument();
    expect(awayDoctorsButton).toBeInTheDocument();
    expect(screen.getByText('แพทย์ไม่อยู่')).toBeInTheDocument();
    expect(screen.queryByText('แพทย์ว่าง')).not.toBeInTheDocument();
    expect(screen.queryByText('แพทย์กำลังตรวจ')).not.toBeInTheDocument();
    fireEvent.click(availableDoctorsButton);
    expect(availableDoctorsButton).toHaveAttribute('aria-pressed', 'true');
    expect(awayDoctorsButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('แพทย์ว่าง')).toBeInTheDocument();
    expect(screen.queryByText('แพทย์ไม่อยู่')).not.toBeInTheDocument();
    expect(screen.queryByText('แพทย์กำลังตรวจ')).not.toBeInTheDocument();
    fireEvent.click(awayDoctorsButton);
    expect(awayDoctorsButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('แพทย์ไม่อยู่')).toBeInTheDocument();
    expect(screen.queryByText('แพทย์ว่าง')).not.toBeInTheDocument();
    expect(screen.getByText('ผู้ป่วยวันก่อน')).toBeInTheDocument();

    fireEvent.click(pendingStatusButton);
    expect(pendingStatusButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ผู้ป่วยวันนี้')).toBeInTheDocument();
    expect(screen.queryByText('ผู้ป่วยวันก่อน')).not.toBeInTheDocument();

    fireEvent.click(allStatusButton);
    expect(screen.getByText('ผู้ป่วยวันก่อน')).toBeInTheDocument();

    fireEvent.click(within(appointmentStatusGroup).getByRole('button', { name: /ยืนยันแล้ว/ }));
    expect(screen.getByText('ผู้ป่วยในคิว')).toBeInTheDocument();
    expect(screen.queryByText('ผู้ป่วยวันนี้')).not.toBeInTheDocument();
  });

  it('uses medical summary metrics as appointment filters and removes unread metric', async () => {
    const view: DashboardView = {
      role: 'medical',
      actor: { id: 'medical-1', fullName: 'แพทย์หนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-14',
      range: 'today',
      title: 'ภาพรวมงานแพทย์และเภสัชกรรม',
      description: 'แสดงเฉพาะตารางและคิวของแพทย์ที่เข้าสู่ระบบ พร้อมข้อมูลยา',
      metrics: [
        { id: 'own-appointments', label: 'นัดของฉันวันนี้', value: 2, description: '', href: '/appointments', tone: 'blue' },
        { id: 'own-queue', label: 'คิวของฉันที่เหลือ', value: 1, description: '', href: '/appointments', tone: 'amber' },
        { id: 'completed-in-range', label: 'ตรวจเสร็จวันนี้', value: 0, description: '', href: '/appointments', tone: 'emerald' },
      ],
      appointmentStatuses: [
        { status: 'pending', label: 'รอยืนยัน', count: 1 },
        { status: 'confirmed', label: 'ยืนยันแล้ว', count: 1 },
        { status: 'in_progress', label: 'กำลังตรวจ', count: 0 },
        { status: 'completed', label: 'เสร็จสิ้น', count: 0 },
      ],
      appointmentQueue: queue,
      departmentLoads: [],
      medicationAlerts: [],
      recentNotifications: [],
      roleCounts: [],
    };
    getDashboardViewMock.mockResolvedValue(view);

    render(<DashboardScreen role="medical" actorId="medical-1" />);
    const remainingButton = await screen.findByRole('button', { name: /คิวของฉันที่เหลือ/ });
    expect(screen.getByRole('button', { name: /นัดของฉันวันนี้/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ตรวจเสร็จวันนี้/ })).toBeInTheDocument();
    expect(screen.queryByText('ยังไม่ได้อ่าน')).not.toBeInTheDocument();

    fireEvent.click(remainingButton);
    expect(screen.getByText('ผู้ป่วยในคิว')).toBeInTheDocument();
    expect(screen.queryByText('ผู้ป่วยวันนี้')).not.toBeInTheDocument();
    expect(screen.queryByText('ผู้ป่วยวันก่อน')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ตรวจเสร็จวันนี้/ }));
    expect(screen.getByText('ผู้ป่วยวันก่อน')).toBeInTheDocument();
    expect(screen.queryByText('ผู้ป่วยในคิว')).not.toBeInTheDocument();
  });

  it('renders patient priorities with the next appointment, active medicines, and treatment history', async () => {
    const view: DashboardView = {
      role: 'patient',
      actor: { id: 'patient-1', fullName: 'ผู้ป่วยหนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-14',
      range: 'today',
      title: 'ภาพรวมสุขภาพของฉัน',
      description: 'นัดหมาย ยา การเตือน และข้อความของบัญชีนี้เท่านั้น',
      metrics: [
        { id: 'my-medications', label: 'ยาที่กำลังใช้', value: 1, description: '', href: '/reminders', tone: 'violet' },
        { id: 'next-appointment', label: 'นัดหมายถัดไป', value: 1, description: '', href: '/appointments', tone: 'blue' },
        { id: 'unread-notifications', label: 'การแจ้งเตือน', value: 0, description: '', href: '/notifications', tone: 'emerald' },
      ],
      appointmentStatuses: [],
      appointmentQueue: [],
      nextAppointment: {
        id: 'appointment-next', queueNumber: 4, date: '2026-09-16', startTime: '09:30', status: 'confirmed',
        patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      },
      patientMedications: [{
        id: 'reminder-1', name: 'Paracetamol 500mg', dosage: '500 mg', instruction: 'บรรเทาปวดและลดไข้', reminderTimes: ['08:00', '18:00'], nextDoseTime: '18:00', endDate: '2026-09-30',
      }],
      patientTreatmentHistory: [{
        id: 'record-1', date: '2026-09-10T03:00:00.000Z', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป', summary: 'ติดตามอาการทั่วไป', medicationCount: 1,
      }],
      departmentLoads: [],
      medicationAlerts: [],
      recentNotifications: [{
        id: 'notification-1', user_id: 'patient-1', type: 'system', title: 'ยาครบกำหนด', message: 'ถึงเวลารับประทานยา', event_key: null, broadcast_id: null, read_at: null, deleted_at: null, created_at: '2026-09-14T03:00:00.000Z', is_read: false,
      }],
      roleCounts: [],
    };
    getDashboardViewMock.mockResolvedValue(view);

    render(<DashboardScreen role="patient" actorId="patient-1" />);

    expect(await screen.findByText('นัดหมายของฉัน')).toBeInTheDocument();
    expect(screen.getAllByText('ยาที่กำลังใช้').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('การแจ้งเตือน')).not.toBeInTheDocument();
    expect(screen.queryByText('การแจ้งเตือนวันนี้')).not.toBeInTheDocument();
    const medicationSummaryButton = screen.getByRole('button', { name: /ยาที่กำลังใช้/ });
    expect(medicationSummaryButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(medicationSummaryButton);
    expect(screen.getByLabelText('รายละเอียดรายการยาที่กำลังใช้')).toBeInTheDocument();
    expect(medicationSummaryButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('ประวัติการรักษาล่าสุด')).toBeInTheDocument();
    expect(screen.getAllByText('Paracetamol 500mg')).toHaveLength(2);
    expect(screen.getByText('ติดตามอาการทั่วไป')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'วันที่' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ดูประวัติทั้งหมด' })).toHaveAttribute('href', '/records');
    expect(screen.queryByText('สถานะนัดหมายวันนี้')).not.toBeInTheDocument();
  });

  it('renders patient booking, cancellation, medication log, and advice actions', async () => {
    requestPatientAppointmentCancellationMock.mockResolvedValue(undefined);
    recordPatientMedicationTakenMock.mockResolvedValue(undefined);
    getDashboardViewMock.mockResolvedValue({
      role: 'patient',
      actor: { id: 'patient-1', fullName: 'ผู้ป่วยหนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-14',
      range: 'today',
      title: 'ภาพรวมสุขภาพของฉัน',
      description: 'นัดหมาย ยา การเตือน และข้อความของบัญชีนี้เท่านั้น',
      metrics: [],
      appointmentStatuses: [],
      appointmentQueue: [{
        id: 'appointment-next', queueNumber: 4, date: '2026-09-16', startTime: '09:30', status: 'confirmed',
        cancelRequestedAt: null, patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      }],
      nextAppointment: {
        id: 'appointment-next', queueNumber: 4, date: '2026-09-16', startTime: '09:30', status: 'confirmed',
        cancelRequestedAt: null, patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      },
      patientProfile: {
        phone: '0812345678', patientType: 'student', patientId: '67116004', allergyStatus: 'yes', allergyDetail: 'Penicillin',
        chronicDiseaseStatus: 'no', chronicDiseaseDetail: null,
      },
      patientMedications: [{
        id: 'reminder-1', name: 'Paracetamol', dosage: '500 mg', instruction: 'หลังอาหาร', reminderTimes: ['08:00'], nextDoseTime: '08:00', endDate: null,
        todayDoses: [{ scheduledAt: '2026-09-14T08:00:00+07:00', time: '08:00', status: 'pending' }],
      }],
      patientTreatmentHistory: [{
        id: 'record-1', date: '2026-09-10T03:00:00.000Z', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
        summary: 'ติดตามอาการทั่วไป', advice: 'พักผ่อนให้เพียงพอ', medicationNames: ['Paracetamol'], medicationCount: 1,
      }],
      departmentLoads: [], medicationAlerts: [], recentNotifications: [], roleCounts: [],
    } satisfies DashboardView);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<DashboardScreen role="patient" actorId="patient-1" />);

    expect(await screen.findByRole('link', { name: 'จองนัดใหม่' })).toHaveAttribute('href', '/schedules');
    expect(screen.queryByText('ข้อมูลสุขภาพของฉัน')).not.toBeInTheDocument();
    expect(screen.queryByText('มีประวัติแพ้ยา')).not.toBeInTheDocument();
    expect(screen.getByText('คำแนะนำ: พักผ่อนให้เพียงพอ')).toBeInTheDocument();
    expect(screen.getByText(/ยังไม่ได้บันทึก/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'กินแล้ว' }));
    await waitFor(() => expect(recordPatientMedicationTakenMock).toHaveBeenCalledWith('reminder-1', '2026-09-14T08:00:00+07:00'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'ขอยกเลิกนัด' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'ขอยกเลิกนัด' }));
    await waitFor(() => expect(requestPatientAppointmentCancellationMock).toHaveBeenCalledWith('appointment-next'));
    vi.restoreAllMocks();
  });
});
