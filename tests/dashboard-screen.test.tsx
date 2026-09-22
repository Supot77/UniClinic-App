import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DashboardScreen, { createUpcomingToastPreviewAppointments, filterAppointmentQueue, getUpcomingAppointmentsWithinWindow, sortAppointmentsByStartTime } from '@/components/dashboard/DashboardScreen';
import type { DashboardView } from '@/features/dashboard/types';

const getDashboardViewMock = vi.hoisted(() => vi.fn());
const requestPatientAppointmentCancellationMock = vi.hoisted(() => vi.fn());
const recordPatientMedicationTakenMock = vi.hoisted(() => vi.fn());
const navigationMocks = vi.hoisted(() => ({ replace: vi.fn(), search: '' }));
vi.mock('@/services/dashboardService', () => ({
  getDashboardView: getDashboardViewMock,
  requestPatientAppointmentCancellation: requestPatientAppointmentCancellationMock,
  recordPatientMedicationTaken: recordPatientMedicationTakenMock,
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/patient',
  useRouter: () => ({ replace: navigationMocks.replace }),
  useSearchParams: () => new URLSearchParams(navigationMocks.search),
}));

beforeEach(() => {
  navigationMocks.replace.mockReset();
  navigationMocks.search = '';
});

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

function createRangeTestView(role: DashboardView['role'], range: DashboardView['range']): DashboardView {
  return {
    role,
    actor: { id: `${role}-1`, fullName: 'ผู้ใช้งานทดสอบ' },
    date: '2026-09-14',
    startDate: range === 'today' ? '2026-09-14' : '2026-09-08',
    range,
    title: role === 'patient' ? 'ภาพรวมสุขภาพของฉัน' : 'ภาพรวมแดชบอร์ดทดสอบ',
    description: 'ข้อมูลทดสอบแดชบอร์ด',
    metrics: [],
    appointmentStatuses: [],
    appointmentQueue: [],
    departmentLoads: [],
    medicationAlerts: [],
    recentNotifications: [],
    roleCounts: [],
  };
}

describe('Dashboard appointment filters', () => {
  it.each([
    ['patient', 'patient-1'],
    ['medical', 'medical-1'],
    ['staff_admin', 'staff_admin-1'],
  ] as const)('updates only the lower dashboard data when %s changes range', async (role, actorId) => {
    const todayView = createRangeTestView(role, 'today');
    const nextView = createRangeTestView(role, '7d');
    let resolveNextView!: (view: DashboardView) => void;
    const nextViewPromise = new Promise<DashboardView>((resolve) => { resolveNextView = resolve; });
    getDashboardViewMock.mockReset();
    getDashboardViewMock
      .mockImplementationOnce(() => Promise.resolve(todayView))
      .mockImplementationOnce(() => nextViewPromise);

    render(<DashboardScreen role={role} actorId={actorId} />);

    expect(await screen.findByRole('region', { name: 'ตัวกรองแดชบอร์ด' })).toBeInTheDocument();
    const rangeFilter = screen.getByRole('region', { name: 'ตัวกรองแดชบอร์ด' });
    const nextRangeButton = within(rangeFilter).getByRole('button', { name: '7 วันที่ผ่านมา' });
    fireEvent.click(nextRangeButton);

    expect(screen.getByRole('region', { name: 'ตัวกรองแดชบอร์ด' })).toBeInTheDocument();
    expect(await screen.findByRole('status', { name: 'กำลังอัปเดตข้อมูลแดชบอร์ด' })).toBeInTheDocument();
    await waitFor(() => expect(getDashboardViewMock).toHaveBeenCalledWith(role, actorId, expect.any(String), '7d'));

    resolveNextView(nextView);
    await waitFor(() => expect(screen.queryByRole('status', { name: 'กำลังอัปเดตข้อมูลแดชบอร์ด' })).not.toBeInTheDocument());
    expect(nextRangeButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters today appointments, remaining queue, and restores all rows', () => {
    expect(filterAppointmentQueue(queue, 'appointments', '2026-09-14').map((item) => item.id)).toEqual(['today-pending', 'today-confirmed']);
    expect(filterAppointmentQueue(queue, 'today', '2026-09-14').map((item) => item.id)).toEqual(['today-pending', 'today-confirmed']);
    expect(filterAppointmentQueue(queue, 'remaining', '2026-09-14').map((item) => item.id)).toEqual(['today-confirmed']);
    expect(filterAppointmentQueue(queue, 'completed', '2026-09-14').map((item) => item.id)).toEqual(['other-day-completed']);
    expect(filterAppointmentQueue(queue, 'all', '2026-09-14')).toEqual(queue);
  });

  it('returns only active appointments starting within the next 30 minutes', () => {
    const now = new Date('2026-09-14T08:45:00+07:00');
    expect(getUpcomingAppointmentsWithinWindow(queue, now).map((item) => item.id)).toEqual(['today-pending']);
    expect(getUpcomingAppointmentsWithinWindow(queue, new Date('2026-09-14T09:30:00+07:00')).map((item) => item.id)).toEqual(['today-confirmed']);
    expect(getUpcomingAppointmentsWithinWindow(queue, new Date('2026-09-14T10:01:00+07:00'))).toEqual([]);
  });

  it('sorts appointments by the earliest date and time without mutating the queue', () => {
    const input = [queue[1], queue[0], queue[2]];
    const sorted = sortAppointmentsByStartTime(input);

    expect(sorted.map((item) => item.id)).toEqual(['other-day-completed', 'today-pending', 'today-confirmed']);
    expect(input.map((item) => item.id)).toEqual(['today-confirmed', 'today-pending', 'other-day-completed']);
  });

  it('creates two Bangkok-time preview appointments for the upcoming toast', () => {
    const previewAppointments = createUpcomingToastPreviewAppointments(new Date('2026-09-14T08:45:00+07:00'));

    expect(previewAppointments.map((item) => ({ id: item.id, date: item.date, startTime: item.startTime, patientName: item.patientName }))).toEqual([
      { id: 'preview-upcoming-toast-1', date: '2026-09-14', startTime: '09:00', patientName: 'ผู้ป่วยทดสอบ Toast 1' },
      { id: 'preview-upcoming-toast-2', date: '2026-09-14', startTime: '09:10', patientName: 'ผู้ป่วยทดสอบ Toast 2' },
    ]);
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
    expect(medicationFilterGroup).toHaveClass('w-fit', 'min-w-0', 'border-b', 'border-brand-border-soft');
    expect(allMedicationButton).toHaveClass('min-h-9', 'rounded-t-xl', 'border-t-brand-strong');
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
      startDate: '2026-09-08',
      range: '7d',
      title: 'ภาพรวมงานแพทย์และเภสัชกรรม',
      description: 'แสดงเฉพาะตารางและคิวของแพทย์ที่เข้าสู่ระบบ พร้อมข้อมูลยา',
      metrics: [
        { id: 'own-appointments', label: 'นัดของฉัน 7 วันที่ผ่านมา', value: 4, description: '', href: '/appointments', tone: 'blue' },
        { id: 'own-queue', label: 'คิวของฉันในช่วงที่เลือก', value: 1, description: '', href: '/appointments', tone: 'amber' },
        { id: 'in-progress-in-range', label: 'กำลังตรวจ 7 วันที่ผ่านมา', value: 0, description: '', href: '/appointments', tone: 'violet' },
        { id: 'completed-in-range', label: 'ตรวจเสร็จ 7 วันที่ผ่านมา', value: 1, description: '', href: '/appointments', tone: 'emerald' },
      ],
      appointmentStatuses: [
        { status: 'pending', label: 'รอยืนยัน', count: 1 },
        { status: 'confirmed', label: 'ยืนยันแล้ว', count: 2 },
        { status: 'in_progress', label: 'กำลังตรวจ', count: 0 },
        { status: 'completed', label: 'เสร็จสิ้น', count: 1 },
      ],
      appointmentQueue: [...queue, {
        id: 'today-next', queueNumber: 4, date: '2026-09-14', startTime: '09:15', status: 'confirmed',
        patientName: 'ผู้ป่วยถัดไป', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      }, {
        id: 'range-confirmed', queueNumber: 5, date: '2026-09-10', startTime: '11:00', status: 'confirmed',
        patientName: 'ผู้ป่วยในช่วง 7 วัน', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      }],
      departmentLoads: [],
      medicationAlerts: [],
      recentNotifications: [],
      roleCounts: [],
    };
    getDashboardViewMock.mockResolvedValue(view);

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-14T08:45:00+07:00'));
    try {
      render(<DashboardScreen role="medical" actorId="medical-1" />);
      const remainingButton = await screen.findByRole('button', { name: /คิวของฉันในช่วงที่เลือก/ });
      expect(screen.getByRole('button', { name: 'รีเฟรช' }).parentElement).toHaveClass('absolute', 'right-0', 'top-0', 'sm:static');
      const appointmentsButton = screen.getByRole('button', { name: /นัดของฉัน 7 วันที่ผ่านมา/ });
      expect(appointmentsButton).toHaveAttribute('aria-pressed', 'true');
    expect(appointmentsButton).toHaveClass('h-28', 'sm:h-32');
      expect(appointmentsButton.querySelector('svg.lucide-chevron-down')).toBeInTheDocument();
      const appointmentsList = screen.getByRole('region', { name: 'รายชื่อผู้ป่วยนัดของฉัน 7 วันที่ผ่านมา' });
      expect(within(appointmentsList).getByText('นัดของฉัน 7 วันที่ผ่านมา')).toHaveClass('text-xl');
      expect(within(appointmentsList).getByText(/รายการที่แสดง/)).toHaveClass('text-base');
      const pendingAppointments = within(appointmentsList).getByRole('group', { name: 'รายการรอยืนยัน' });
      const confirmedAppointments = within(appointmentsList).getByRole('group', { name: 'รายการยืนยันแล้ว' });
      expect(within(pendingAppointments).getByText('ผู้ป่วยวันนี้')).toBeInTheDocument();
      expect(within(confirmedAppointments).getByText('ผู้ป่วยถัดไป')).toBeInTheDocument();
      expect(within(confirmedAppointments).getByText('ผู้ป่วยในคิว')).toBeInTheDocument();
      expect(within(confirmedAppointments).getByText('ผู้ป่วยในช่วง 7 วัน')).toBeInTheDocument();
      const confirmedLinks = within(confirmedAppointments).getAllByRole('link');
      expect(confirmedLinks[0]).toHaveClass('px-4', 'py-4');
      expect(confirmedLinks[0]).toHaveTextContent('ผู้ป่วยในช่วง 7 วัน');
      expect(confirmedLinks[1]).toHaveTextContent('ผู้ป่วยถัดไป');
      expect(confirmedLinks[2]).toHaveTextContent('ผู้ป่วยในคิว');
      expect(confirmedLinks[0].querySelector('svg.lucide-chevron-right')).toBeInTheDocument();
      expect(within(appointmentsList).getByRole('link', { name: 'ดูนัดหมายทั้งหมด' })).toHaveClass('bg-brand-strong', 'min-h-8', 'sm:min-h-9');
      expect(within(pendingAppointments).getByRole('button', { name: 'รายการรอยืนยันก่อนหน้า' })).toBeDisabled();
      expect(within(pendingAppointments).getByRole('button', { name: 'รายการรอยืนยันถัดไป' })).toBeDisabled();
      expect(within(confirmedAppointments).getByRole('button', { name: 'รายการยืนยันแล้วก่อนหน้า' })).toBeDisabled();
      expect(within(confirmedAppointments).getByRole('button', { name: 'รายการยืนยันแล้วถัดไป' })).toBeDisabled();
      expect(within(appointmentsList).getByText('ผู้ป่วยวันก่อน')).toBeInTheDocument();
      const inProgressButton = screen.getByRole('button', { name: /กำลังตรวจ 7 วันที่ผ่านมา/ });
      expect(inProgressButton).toBeInTheDocument();
      const completedButton = screen.getByRole('button', { name: /ตรวจเสร็จ 7 วันที่ผ่านมา/ });
      expect(completedButton).toBeInTheDocument();
    expect(remainingButton).toHaveClass('h-28', 'sm:h-32');
    expect(inProgressButton).toHaveClass('h-28', 'sm:h-32');
    expect(completedButton).toHaveClass('h-28', 'sm:h-32');
      expect(screen.queryByText('ยังไม่ได้อ่าน')).not.toBeInTheDocument();

      const upcomingToast = screen.getByRole('status', { name: 'แจ้งเตือนนัดหมายถัดไป' });
      expect(upcomingToast).toHaveTextContent('ผู้ป่วยวันนี้');
      expect(upcomingToast).toHaveTextContent('09:00 น.');
      expect(within(upcomingToast).getByRole('button', { name: 'ผู้ป่วยก่อนหน้า' })).toBeDisabled();
      expect(within(upcomingToast).getByRole('button', { name: 'ผู้ป่วยถัดไป' })).not.toBeDisabled();

      fireEvent.click(within(upcomingToast).getByRole('button', { name: 'ผู้ป่วยถัดไป' }));
      expect(upcomingToast).toHaveTextContent('ผู้ป่วยถัดไป');
      expect(within(upcomingToast).getByRole('button', { name: 'ผู้ป่วยก่อนหน้า' })).not.toBeDisabled();
      expect(within(upcomingToast).getByRole('button', { name: 'ผู้ป่วยถัดไป' })).toBeDisabled();
      expect(screen.queryByRole('heading', { name: 'ผู้ป่วยถัดไป' })).not.toBeInTheDocument();

      fireEvent.click(appointmentsButton);
      expect(appointmentsButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('region', { name: 'รายชื่อผู้ป่วยนัดของฉัน 7 วันที่ผ่านมา' })).toBeInTheDocument();

      fireEvent.click(inProgressButton);
      expect(inProgressButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('region', { name: /รายชื่อผู้ป่วยกำลังตรวจ 7 วันที่ผ่านมา/ })).toHaveTextContent('ไม่มีรายชื่อผู้ป่วยในตัวกรองนี้');

      fireEvent.click(remainingButton);
      const remainingList = screen.getByRole('region', { name: 'รายชื่อผู้ป่วยคิวของฉันในช่วงที่เลือก' });
      expect(within(remainingList).getByText('ผู้ป่วยในคิว')).toBeInTheDocument();
      expect(within(remainingList).queryByText('ผู้ป่วยวันนี้')).not.toBeInTheDocument();
      expect(within(remainingList).queryByText('ผู้ป่วยวันก่อน')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /ตรวจเสร็จ 7 วันที่ผ่านมา/ }));
      const completedList = screen.getByRole('region', { name: /รายชื่อผู้ป่วยตรวจเสร็จ 7 วันที่ผ่านมา/ });
      expect(within(completedList).getByText('ผู้ป่วยวันก่อน')).toBeInTheDocument();
      expect(within(completedList).queryByText('ผู้ป่วยในคิว')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('enables appointment row pagination only when a status has more than three patients', async () => {
    const view: DashboardView = {
      role: 'medical',
      actor: { id: 'medical-1', fullName: 'แพทย์หนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-14',
      range: 'today',
      title: 'ภาพรวมงานแพทย์และเภสัชกรรม',
      description: 'แสดงเฉพาะตารางและคิวของแพทย์ที่เข้าสู่ระบบ พร้อมข้อมูลยา',
      metrics: [
        { id: 'own-appointments', label: 'นัดของฉันวันนี้', value: 5, description: '', href: '/appointments', tone: 'blue' },
        { id: 'own-queue', label: 'คิวของฉันที่เหลือ', value: 4, description: '', href: '/appointments', tone: 'amber' },
        { id: 'in-progress-in-range', label: 'กำลังตรวจวันนี้', value: 0, description: '', href: '/appointments', tone: 'violet' },
        { id: 'completed-in-range', label: 'ตรวจเสร็จวันนี้', value: 0, description: '', href: '/appointments', tone: 'emerald' },
      ],
      appointmentStatuses: [
        { status: 'pending', label: 'รอยืนยัน', count: 1 },
        { status: 'confirmed', label: 'ยืนยันแล้ว', count: 4 },
        { status: 'in_progress', label: 'กำลังตรวจ', count: 0 },
        { status: 'completed', label: 'เสร็จสิ้น', count: 0 },
      ],
      appointmentQueue: [
        { id: 'pending-1', queueNumber: 1, date: '2026-09-14', startTime: '09:00', status: 'pending', patientName: 'ผู้ป่วยรอยืนยัน', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป' },
        { id: 'confirmed-1', queueNumber: 2, date: '2026-09-14', startTime: '08:30', status: 'confirmed', patientName: 'ผู้ป่วยยืนยัน 1', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป' },
        { id: 'confirmed-2', queueNumber: 3, date: '2026-09-14', startTime: '09:30', status: 'confirmed', patientName: 'ผู้ป่วยยืนยัน 2', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป' },
        { id: 'confirmed-3', queueNumber: 4, date: '2026-09-14', startTime: '10:00', status: 'confirmed', patientName: 'ผู้ป่วยยืนยัน 3', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป' },
        { id: 'confirmed-4', queueNumber: 5, date: '2026-09-14', startTime: '10:30', status: 'confirmed', patientName: 'ผู้ป่วยยืนยัน 4', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป' },
      ],
      departmentLoads: [],
      medicationAlerts: [],
      recentNotifications: [],
      roleCounts: [],
    };
    getDashboardViewMock.mockResolvedValue(view);

    render(<DashboardScreen role="medical" actorId="medical-1" />);

    const appointmentsList = await screen.findByRole('region', { name: 'รายชื่อผู้ป่วยนัดของฉันวันนี้' });
    const confirmedAppointments = within(appointmentsList).getByRole('group', { name: 'รายการยืนยันแล้ว' });
    const previousButton = within(confirmedAppointments).getByRole('button', { name: 'รายการยืนยันแล้วก่อนหน้า' });
    const nextButton = within(confirmedAppointments).getByRole('button', { name: 'รายการยืนยันแล้วถัดไป' });

    expect(previousButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();
    expect(within(confirmedAppointments).getByText('ผู้ป่วยยืนยัน 1')).toBeInTheDocument();
    expect(within(confirmedAppointments).getByText('ผู้ป่วยยืนยัน 3')).toBeInTheDocument();
    expect(within(confirmedAppointments).queryByText('ผู้ป่วยยืนยัน 4')).not.toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(within(confirmedAppointments).queryByText('ผู้ป่วยยืนยัน 1')).not.toBeInTheDocument();
    expect(within(confirmedAppointments).getByText('ผู้ป่วยยืนยัน 4')).toBeInTheDocument();
    expect(previousButton).not.toBeDisabled();
    expect(nextButton).toBeDisabled();

    fireEvent.click(previousButton);
    expect(within(confirmedAppointments).getByText('ผู้ป่วยยืนยัน 1')).toBeInTheDocument();
  });

  it('uses the staff medication status controls on the medical pharmacy dashboard', async () => {
    const view: DashboardView = {
      role: 'medical',
      actor: { id: 'pharmacist-1', fullName: 'เภสัชกรหนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-14',
      range: 'today',
      title: 'ภาพรวมงานแพทย์และเภสัชกรรม',
      description: 'ติดตามงานจ่ายยาและสถานะคลังยา',
      metrics: [
        { id: 'pending-dispensing', label: 'ใบสั่งยารอจ่าย', value: 1, description: '', href: '/pharmacy', tone: 'amber' },
        { id: 'low-stock', label: 'ยาใกล้หมด', value: 1, description: '', href: '/pharmacy', tone: 'rose' },
        { id: 'expired', label: 'ยาหมดอายุ', value: 1, description: '', href: '/pharmacy', tone: 'violet' },
      ],
      appointmentStatuses: [],
      appointmentQueue: [],
      departmentLoads: [],
      medicationAlerts: [
        { id: 'med-low-stock', name: 'ยาใกล้หมดในคลินิก', stock: 2, minimumStock: 5, expiryDate: '2026-12-31', lowStock: true, expired: false },
        { id: 'med-expired', name: 'ยาหมดอายุในคลินิก', stock: 8, minimumStock: 5, expiryDate: '2026-09-01', lowStock: false, expired: true },
      ],
      pendingPrescriptions: [],
      recentNotifications: [
        { id: 'notification-latest', user_id: 'pharmacist-1', type: 'system', title: 'แจ้งเตือนล่าสุด', message: 'รายการยาได้รับการปรับปรุง', is_read: false, created_at: '2026-09-14T04:00:00.000Z' },
        { id: 'notification-read', user_id: 'pharmacist-1', type: 'broadcast', title: 'แจ้งเตือนที่อ่านแล้ว', message: 'ประกาศจากคลินิก', is_read: true, created_at: '2026-09-14T03:00:00.000Z' },
      ],
      unreadNotificationCount: 1,
      roleCounts: [],
    };
    getDashboardViewMock.mockResolvedValue(view);

    render(<DashboardScreen role="medical" actorId="pharmacist-1" />);
    const medicationFilterGroup = await screen.findByRole('group', { name: 'กรองสถานะยา' });
    const allMedicationButton = within(medicationFilterGroup).getByRole('button', { name: /ทั้งหมด/ });
    const lowStockMedicationButton = within(medicationFilterGroup).getByRole('button', { name: /ใกล้หมด/ });
    const expiredMedicationButton = within(medicationFilterGroup).getByRole('button', { name: /หมดอายุ/ });

    expect(screen.getByRole('heading', { name: 'รายการยาที่ต้องตรวจสอบ' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /การแจ้งเตือนล่าสุด/ })).not.toBeInTheDocument();
    expect(screen.queryByText('แจ้งเตือนล่าสุด')).not.toBeInTheDocument();
    expect(screen.queryByText('แจ้งเตือนที่อ่านแล้ว')).not.toBeInTheDocument();
    expect(screen.queryByText('1 ยังไม่อ่าน')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ดูคลังยา' })).toHaveClass('bg-brand-strong', 'min-h-8', 'sm:min-h-9');
    const medicationSection = screen.getByRole('heading', { name: 'รายการยาที่ต้องตรวจสอบ' }).closest('section');
    expect(medicationSection).toHaveClass('border-y', 'border-brand-border-soft');
    expect(medicationSection?.parentElement).not.toHaveClass('lg:grid-cols-2');
    expect(allMedicationButton).toHaveAttribute('aria-pressed', 'true');
    expect(medicationFilterGroup).toHaveClass('w-fit', 'min-w-0');
    expect(allMedicationButton).toHaveClass('min-h-9', 'rounded-t-xl', 'border-t-brand-strong');
    expect(allMedicationButton).toHaveTextContent('2');
    expect(lowStockMedicationButton).toHaveTextContent('1');
    expect(expiredMedicationButton).toHaveTextContent('1');
    expect(screen.getByText('ยาใกล้หมดในคลินิก')).toBeInTheDocument();
    expect(screen.getByText('ยาหมดอายุในคลินิก')).toBeInTheDocument();
    const medicationList = screen.getByRole('list', { name: 'รายการยา' });
    expect(medicationList).toHaveClass('lg:grid-cols-3');
    const medicationItems = within(medicationList).getAllByRole('listitem');
    expect(medicationItems).toHaveLength(2);
    expect(medicationItems[0]).toHaveClass('px-4', 'py-4');
    expect(screen.getByRole('progressbar', { name: 'สต๊อกยา ยาใกล้หมดในคลินิก' })).toHaveClass('h-1.5');

    const summary = screen.getByRole('region', { name: 'ข้อมูลสรุป' });
    fireEvent.click(within(summary).getByRole('button', { name: /ยาใกล้หมด/ }));
    expect(lowStockMedicationButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ยาใกล้หมดในคลินิก')).toBeInTheDocument();
    expect(screen.queryByText('ยาหมดอายุในคลินิก')).not.toBeInTheDocument();

    fireEvent.click(expiredMedicationButton);
    expect(expiredMedicationButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ยาหมดอายุในคลินิก')).toBeInTheDocument();
    expect(screen.queryByText('ยาใกล้หมดในคลินิก')).not.toBeInTheDocument();
    const expiredWarningIcon = screen.getByRole('img', { name: 'ยาหมดอายุ ยาหมดอายุในคลินิก' });
    expect(expiredWarningIcon).toBeInTheDocument();
    expect(expiredWarningIcon.querySelector('svg')).toHaveClass('size-6');
    expect(screen.queryByRole('progressbar', { name: 'สต๊อกยา ยาหมดอายุในคลินิก' })).not.toBeInTheDocument();
  });

  it('renders patient priorities with the next appointment, active medicines, and treatment history', async () => {
    const view: DashboardView = {
      role: 'patient',
      actor: { id: 'patient-1', fullName: 'ผู้ป่วยหนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-01',
      range: '30d',
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
      }, {
        id: 'record-older', date: '2026-09-01T03:00:00.000Z', doctorName: 'แพทย์สอง', departmentName: 'ทันตกรรม', summary: 'ตรวจสุขภาพฟัน', advice: 'นัดติดตาม', medicationNames: ['Amoxicillin'], medicationCount: 0,
      }],
      departmentLoads: [],
      medicationAlerts: [],
      recentNotifications: [{
        id: 'notification-1', user_id: 'patient-1', type: 'system', title: 'ยาครบกำหนด', message: 'ถึงเวลารับประทานยา', event_key: null, broadcast_id: null, read_at: null, deleted_at: null, created_at: '2026-09-14T03:00:00.000Z', is_read: false,
      }],
      roleCounts: [],
    };
    getDashboardViewMock.mockResolvedValue(view);
    navigationMocks.search = 'historySort=oldest';

    render(<DashboardScreen role="patient" actorId="patient-1" />);

    expect(await screen.findByRole('main')).toHaveClass('w-screen', 'max-w-none');
    expect(screen.getByRole('heading', { name: 'ภาพรวมสุขภาพของฉัน', level: 1 })).toHaveClass('text-2xl', 'sm:text-3xl');
    expect(screen.queryByRole('region', { name: 'ภาพรวมสุขภาพของฉัน' })).not.toBeInTheDocument();
    expect(screen.getAllByText('ยาที่กำลังใช้')).toHaveLength(1);
    expect(screen.queryByText('การแจ้งเตือน')).not.toBeInTheDocument();
    expect(screen.queryByText('การแจ้งเตือนวันนี้')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ยาที่กำลังใช้/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('รายละเอียดรายการยาที่กำลังใช้')).not.toBeInTheDocument();
    const nextAppointmentSummary = screen.getByRole('region', { name: 'นัดหมายถัดไป' });
    expect(within(nextAppointmentSummary).getByText('คิว #4')).toBeInTheDocument();
    expect(within(nextAppointmentSummary).getByText(/09:30/)).toHaveTextContent('09:30 น.');
    expect(within(nextAppointmentSummary).getByText('แพทย์หนึ่ง')).toBeInTheDocument();
    expect(within(nextAppointmentSummary).getByText('เวชทั่วไป')).toBeInTheDocument();
    expect(within(nextAppointmentSummary).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('ประวัติการรักษา')).toBeInTheDocument();
    expect(screen.getAllByText('Paracetamol 500mg')).toHaveLength(1);
    expect(screen.getByText('ติดตามอาการทั่วไป')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'วันที่' })).toBeInTheDocument();
    const historyToolbar = screen.getByRole('toolbar', { name: 'ตัวควบคุมประวัติการรักษา' });
    const sortControl = within(historyToolbar).getByRole('combobox', { name: 'เรียงลำดับประวัติการรักษา' });
    expect(within(historyToolbar).queryByPlaceholderText('ค้นหาแพทย์ แผนก ผลตรวจ หรือยา')).not.toBeInTheDocument();
    expect(sortControl).toHaveValue('oldest');
    expect(within(historyToolbar).getByRole('link', { name: 'ดูประวัติทั้งหมด' })).toHaveAttribute('href', '/records');
    expect(screen.getByText('แสดง 2 จาก 2 รายการ')).toBeInTheDocument();

    fireEvent.change(sortControl, { target: { value: 'oldest' } });
    expect(navigationMocks.replace).toHaveBeenLastCalledWith('/dashboard/patient?historySort=oldest', { scroll: false });
    const historyRows = screen.getByRole('table').querySelectorAll('tbody tr');
    expect(within(historyRows[0] as HTMLElement).getByText('แพทย์สอง')).toBeInTheDocument();

    expect(screen.getByText('แสดง 2 จาก 2 รายการ')).toBeInTheDocument();
    expect(screen.getByText('ตรวจสุขภาพฟัน')).toBeInTheDocument();
    expect(screen.getByText('ติดตามอาการทั่วไป')).toBeInTheDocument();
    expect(screen.queryByText('สถานะนัดหมายวันนี้')).not.toBeInTheDocument();
  });

  it('renders patient next appointment, medication log, and advice actions', async () => {
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
        id: 'record-1', date: '2026-09-14T03:00:00.000Z', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
        summary: 'ติดตามอาการทั่วไป', advice: 'พักผ่อนให้เพียงพอ', medicationNames: ['Paracetamol'], medicationCount: 1,
      }],
      departmentLoads: [], medicationAlerts: [], recentNotifications: [], roleCounts: [],
    } satisfies DashboardView);

    render(<DashboardScreen role="patient" actorId="patient-1" />);

    expect(await screen.findByRole('region', { name: 'นัดหมายถัดไป' })).toBeInTheDocument();
    expect(screen.queryByText('รายการนัดหมายทั้งหมด')).not.toBeInTheDocument();
    expect(screen.queryByText('ข้อมูลสุขภาพของฉัน')).not.toBeInTheDocument();
    expect(screen.queryByText('มีประวัติแพ้ยา')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'ภาพรวมสุขภาพของฉัน' })).not.toBeInTheDocument();
    expect(screen.getByText('คำแนะนำ: พักผ่อนให้เพียงพอ')).toBeInTheDocument();
    expect(screen.getByText(/ยังไม่ได้บันทึก/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'กินแล้ว' }));
    await waitFor(() => expect(recordPatientMedicationTakenMock).toHaveBeenCalledWith('reminder-1', '2026-09-14T08:00:00+07:00'));
  });

  it('filters patient treatment history according to the selected date range', async () => {
    const view: DashboardView = {
      role: 'patient',
      actor: { id: 'patient-1', fullName: 'ผู้ป่วยหนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-08',
      range: '7d',
      title: 'ภาพรวมสุขภาพของฉัน',
      description: '',
      metrics: [],
      appointmentStatuses: [],
      appointmentQueue: [],
      patientMedications: [],
      patientTreatmentHistory: [
        { id: 'rec-recent', date: '2026-09-10T03:00:00.000Z', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป', summary: 'อาการล่าสุด', medicationCount: 0 },
        { id: 'rec-old', date: '2026-08-01T03:00:00.000Z', doctorName: 'แพทย์สอง', departmentName: 'เวชทั่วไป', summary: 'อาการเก่า', medicationCount: 0 },
      ],
      departmentLoads: [], medicationAlerts: [], recentNotifications: [], roleCounts: [],
    };
    getDashboardViewMock.mockResolvedValue(view);
    render(<DashboardScreen role="patient" actorId="patient-1" />);

    expect(await screen.findByText('อาการล่าสุด')).toBeInTheDocument();
    expect(screen.queryByText('อาการเก่า')).not.toBeInTheDocument();
    expect(screen.getByText('แสดง 1 จาก 1 รายการ')).toBeInTheDocument();
    expect(screen.getByText('ผลตรวจและคำแนะนำที่เปิดดูได้จากบัญชีของคุณ ในช่วง 7 วันที่ผ่านมา')).toBeInTheDocument();
  });
});
