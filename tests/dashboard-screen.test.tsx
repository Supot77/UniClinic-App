import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DashboardScreen, { createUpcomingToastPreviewAppointments, filterAppointmentQueue, getUpcomingAppointmentsWithinWindow, sortAppointmentsByStartTime } from '@/components/dashboard/DashboardScreen';
import { AdminDatabaseStatusProvider, useAdminDatabaseStatus } from '@/context/AdminDatabaseStatusContext';
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
  sessionStorage.removeItem('login_appointment_toast');
});

function DatabaseStatusProbe() {
  return <span data-testid="database-status-probe">{useAdminDatabaseStatus()}</span>;
}

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
    if (role === 'patient') {
      expect(within(rangeFilter).getByRole('button', { name: 'วันนี้' })).toBeInTheDocument();
      expect(within(rangeFilter).getByRole('button', { name: 'ย้อนหลัง 7 วัน' })).toBeInTheDocument();
      expect(within(rangeFilter).getByRole('button', { name: 'ย้อนหลัง 30 วัน' })).toBeInTheDocument();
      const nextAppointmentSummary = screen.getByRole('region', { name: 'นัดหมายถัดไป' });
      expect(within(nextAppointmentSummary).queryByRole('link', { name: 'ดูนัดหมายทั้งหมด' })).not.toBeInTheDocument();
    }
    const nextRangeButton = within(rangeFilter).getByRole('button', { name: 'ย้อนหลัง 7 วัน' });
    fireEvent.click(nextRangeButton);

    expect(screen.getByRole('region', { name: 'ตัวกรองแดชบอร์ด' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: todayView.title })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'กำลังโหลดข้อมูลช่วงเวลาที่เลือก' })).toBeInTheDocument();
    expect(screen.queryByText('กำลังอัปเดตข้อมูลช่วงนี้…')).not.toBeInTheDocument();
    await waitFor(() => expect(getDashboardViewMock).toHaveBeenCalledWith(role, actorId, expect.any(String), '7d'));

    resolveNextView(nextView);
    await waitFor(() => expect(screen.queryByRole('status', { name: 'กำลังโหลดข้อมูลช่วงเวลาที่เลือก' })).not.toBeInTheDocument());
    expect(nextRangeButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the next medical queue visible while lower range data loads', async () => {
    const nextAppointment: DashboardView['appointmentQueue'][number] = {
      id: 'next-queue', queueNumber: 4, date: '2026-09-14', startTime: '09:15', status: 'confirmed',
      patientName: 'ผู้ป่วยถัดไป', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
    };
    const todayView: DashboardView = {
      ...createRangeTestView('medical', 'today'),
      metrics: [{ id: 'own-appointments', label: 'นัดของฉันวันนี้', value: 1, description: '', href: '/appointments', tone: 'blue' }],
      appointmentQueue: [nextAppointment],
      nextAppointment,
      upcomingAppointments: [nextAppointment],
    };
    const nextView = createRangeTestView('medical', '7d');
    let resolveNextView!: (view: DashboardView) => void;
    const nextViewPromise = new Promise<DashboardView>((resolve) => { resolveNextView = resolve; });
    getDashboardViewMock
      .mockImplementationOnce(() => Promise.resolve(todayView))
      .mockImplementationOnce(() => nextViewPromise);

    render(<DashboardScreen role="medical" actorId="medical-1" />);

    const nextQueue = await screen.findByRole('region', { name: 'คิวถัดไปที่ต้องตรวจ' });
    const rangeFilter = screen.getByRole('region', { name: 'ตัวกรองแดชบอร์ด' });
    fireEvent.click(within(rangeFilter).getByRole('button', { name: 'ย้อนหลัง 7 วัน' }));

    expect(within(nextQueue).getByText('คิว #4')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'กำลังโหลดข้อมูลช่วงเวลาที่เลือก' })).toBeInTheDocument();

    resolveNextView(nextView);
    await waitFor(() => expect(screen.queryByRole('status', { name: 'กำลังโหลดข้อมูลช่วงเวลาที่เลือก' })).not.toBeInTheDocument());
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
      title: 'ภาพรวมคลินิก',
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
        { status: 'pending', label: 'รอการยืนยัน', count: 1 },
        { status: 'confirmed', label: 'ยืนยันแล้ว', count: 1 },
        { status: 'in_progress', label: 'กำลังตรวจ', count: 0 },
        { status: 'completed', label: 'ตรวจเสร็จแล้ว', count: 0 },
      ],
      appointmentQueue: queue,
      departmentLoads: [{ departmentId: 'department-1', departmentName: 'เวชทั่วไป', appointmentCount: 2, capacity: 10, patientCount: 2, doctorCount: 1, activeDoctorCount: 1 }],
      doctorStatuses: [
        { doctorId: 'doctor-available', doctorName: 'แพทย์ว่าง', departmentId: 'department-1', departmentName: 'เวชทั่วไป', status: 'available' },
        { doctorId: 'doctor-away', doctorName: 'แพทย์ไม่อยู่', departmentId: 'department-1', departmentName: 'เวชทั่วไป', status: 'away' },
        { doctorId: 'doctor-away-2', doctorName: 'แพทย์ไม่อยู่สอง', departmentId: 'department-1', departmentName: 'เวชทั่วไป', status: 'away' },
        { doctorId: 'doctor-away-3', doctorName: 'แพทย์ไม่อยู่สาม', departmentId: 'department-1', departmentName: 'เวชทั่วไป', status: 'away' },
        { doctorId: 'doctor-away-4', doctorName: 'แพทย์ไม่อยู่สี่', departmentId: 'department-1', departmentName: 'เวชทั่วไป', status: 'away' },
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

    render(<AdminDatabaseStatusProvider>
      <>
        <DashboardScreen role="staff_admin" actorId="staff-1" />
        <DatabaseStatusProbe />
      </>
    </AdminDatabaseStatusProvider>);
    await waitFor(() => expect(screen.getByTestId('database-status-probe')).toHaveTextContent('connected'));
    const appointmentStatusGroup = await screen.findByRole('group', { name: 'เลือกสถานะนัดหมาย' });
    const appointmentStatusSection = appointmentStatusGroup.closest('section');
    const adminMedicationSection = screen.getByRole('heading', { name: 'รายการยาที่ต้องตรวจสอบ' }).closest('section');
    expect(appointmentStatusSection).toHaveClass('w-full', 'min-w-0');
    expect(appointmentStatusSection?.firstElementChild).toHaveClass('flex-row', 'items-start', 'gap-2', 'sm:items-center');
    const manageAppointmentsLink = within(appointmentStatusSection as HTMLElement).getByRole('link', { name: 'จัดการนัดหมาย' });
    expect(manageAppointmentsLink).toBe(appointmentStatusSection?.firstElementChild?.lastElementChild);
    expect(manageAppointmentsLink).toHaveClass('shrink-0', 'whitespace-nowrap');
    const medicationFilterGroup = screen.getByRole('group', { name: 'กรองสถานะยา' });
    expect(within(adminMedicationSection as HTMLElement).getByRole('link', { name: 'ดูคลังยา' })).toHaveAttribute('href', '/pharmacy');
    expect(adminMedicationSection).toHaveClass('border-y', 'border-brand-border-soft');
    expect(screen.getByRole('list', { name: 'รายการยา' })).toHaveClass('sm:grid-cols-2', 'lg:grid-cols-2');
    const allMedicationButton = within(medicationFilterGroup).getByRole('button', { name: /ทั้งหมด/ });
    const lowStockMedicationButton = within(medicationFilterGroup).getByRole('button', { name: /ใกล้หมด/ });
    const expiredMedicationButton = within(medicationFilterGroup).getByRole('button', { name: /หมดอายุ/ });
    expect(allMedicationButton).toHaveAttribute('aria-pressed', 'true');
    expect(medicationFilterGroup).toHaveClass('w-full', 'min-w-max', 'border-b', 'border-brand-border-soft');
    expect(allMedicationButton).toHaveClass('min-h-11', 'sm:min-h-12', 'rounded-t-2xl', 'border-t-brand-strong', 'text-xs', 'sm:text-sm');
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
    const pendingStatusButton = within(appointmentStatusGroup).getByRole('button', { name: /รอการยืนยัน/ });
    expect(appointmentStatusGroup).toHaveClass('border-b', 'border-brand-border-soft');
    expect(allStatusButton).toHaveClass('rounded-t-2xl', 'border-t-brand-strong');
    expect(allStatusButton).toHaveAttribute('aria-pressed', 'true');
    expect(allStatusButton).toHaveTextContent('2');
    expect(pendingStatusButton).toHaveTextContent('1');
    expect(screen.queryByRole('region', { name: 'ข้อมูลสรุป' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'จัดการนัดหมาย' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'คิวและนัดหมายล่าสุด' })).not.toBeInTheDocument();
    expect(screen.queryByText('แสดงข้อมูลจำเป็นต่อการทำงานในช่วง')).not.toBeInTheDocument();
    const departmentOverview = screen.getByRole('heading', { name: 'สรุปตามแผนก' }).closest('section');
    expect(departmentOverview).not.toBeNull();
    expect(within(departmentOverview as HTMLElement).getByText('เวชทั่วไป')).toBeInTheDocument();
    expect(within(departmentOverview as HTMLElement).queryByRole('button', { name: /เวชทั่วไป/ })).not.toBeInTheDocument();
    const departmentGrid = within(departmentOverview as HTMLElement).getByText('เวชทั่วไป').closest('div.grid');
    expect(departmentGrid).toHaveClass('grid-cols-1', 'gap-px', 'sm:grid-cols-2', 'lg:grid-cols-3');
    expect(appointmentStatusGroup.compareDocumentPosition(departmentOverview as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const dashboardHeader = screen.getByRole('banner');
    const progressGroup = screen.getByRole('group', { name: 'ความคืบหน้านัดหมาย' });
    const dashboardFilter = screen.getByRole('region', { name: 'ตัวกรองแดชบอร์ด' });
    expect(within(dashboardHeader).queryByRole('group', { name: 'ความคืบหน้านัดหมาย' })).not.toBeInTheDocument();
    expect(dashboardFilter.compareDocumentPosition(progressGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(progressGroup).getByRole('img', { name: 'ยืนยันแล้ว 50%' })).toBeInTheDocument();
    expect(within(progressGroup).getByRole('img', { name: 'ตรวจเสร็จแล้ว 0%' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'สรุปจากข้อมูลวันนี้' })).not.toBeInTheDocument();
    const chartModeGroup = screen.getByRole('group', { name: 'เลือกข้อมูลภาพรวม' });
    const statusChartButton = within(chartModeGroup).getByRole('button', { name: 'สรุปตามสถานะ' });
    const genderChartButton = within(chartModeGroup).getByRole('button', { name: 'สรุปตามเพศ' });
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
    const awayDoctorsButton = within(doctorStatusGroup).getByRole('button', { name: /ไม่อยู่/ });
    const doctorList = screen.getByText('แพทย์ไม่อยู่').closest('div.grid');
    expect(medicationFilterGroup.className).toBe(doctorStatusGroup.className);
    expect(allMedicationButton.className).toBe(awayDoctorsButton.className);
    expect(doctorList).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'sm:divide-y-0');
    expect(doctorList?.querySelectorAll(':scope > div')).toHaveLength(4);
    expect(departmentOverview!.compareDocumentPosition(doctorStatusGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(doctorStatusGroup.compareDocumentPosition(medicationFilterGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(doctorStatusGroup).getAllByRole('button')).toHaveLength(2);
    const availableDoctorsButton = within(doctorStatusGroup).getByRole('button', { name: /ว่าง/ });
    expect(doctorStatusGroup).toHaveClass('border-b', 'border-brand-border-soft');
    expect(awayDoctorsButton).toHaveAttribute('aria-pressed', 'true');
    expect(availableDoctorsButton).toHaveAttribute('aria-pressed', 'false');
    expect(availableDoctorsButton).toBeInTheDocument();
    expect(awayDoctorsButton).toBeInTheDocument();
    expect(screen.getByText('แพทย์ไม่อยู่')).toBeInTheDocument();
    const awayDoctorRow = screen.getByText('แพทย์ไม่อยู่').parentElement;
    expect(awayDoctorRow).not.toBeNull();
    expect(within(awayDoctorRow as HTMLElement).getByText('ลาหรือนอกเวลาทำการ')).toHaveClass('text-xs', 'sm:text-sm');
    expect(within(awayDoctorRow as HTMLElement).queryByText(/^ไม่อยู่$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^ดูตาราง$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ดูตารางแพทย์' })).toHaveAttribute('href', '/schedules');
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
      title: 'ภาพรวมงานแพทย์',
      description: 'ดูตาราง คิว และรายการยาที่ต้องตรวจสอบ',
      metrics: [
        { id: 'own-appointments', label: 'นัดของฉัน ย้อนหลัง 7 วัน', value: 4, description: '', href: '/appointments', tone: 'blue' },
        { id: 'own-queue', label: 'คิวของฉันในช่วงที่เลือก', value: 1, description: '', href: '/appointments', tone: 'amber' },
        { id: 'in-progress-in-range', label: 'กำลังตรวจ ย้อนหลัง 7 วัน', value: 0, description: '', href: '/appointments', tone: 'violet' },
        { id: 'completed-in-range', label: 'ตรวจเสร็จ ย้อนหลัง 7 วัน', value: 1, description: '', href: '/appointments', tone: 'emerald' },
      ],
      appointmentStatuses: [
        { status: 'pending', label: 'รอการยืนยัน', count: 1 },
        { status: 'confirmed', label: 'ยืนยันแล้ว', count: 2 },
        { status: 'in_progress', label: 'กำลังตรวจ', count: 0 },
        { status: 'completed', label: 'ตรวจเสร็จแล้ว', count: 1 },
      ],
      appointmentQueue: [...queue, {
        id: 'today-next', queueNumber: 4, date: '2026-09-14', startTime: '09:15', status: 'confirmed',
        patientName: 'ผู้ป่วยถัดไป', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      }, {
        id: 'range-confirmed', queueNumber: 5, date: '2026-09-10', startTime: '11:00', status: 'confirmed',
        patientName: 'ผู้ป่วยในช่วง 7 วัน', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      }],
      nextAppointment: {
        id: 'today-next', queueNumber: 4, date: '2026-09-14', startTime: '09:15', status: 'confirmed',
        patientName: 'ผู้ป่วยถัดไป', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      },
      upcomingAppointments: [{
        id: 'today-next', queueNumber: 4, date: '2026-09-14', startTime: '09:15', status: 'confirmed',
        patientName: 'ผู้ป่วยถัดไป', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      }, {
        id: 'today-next-2', queueNumber: 6, date: '2026-09-14', startTime: '10:15', status: 'confirmed',
        patientName: 'ผู้ป่วยรอบถัดไป', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
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
      const nextAppointmentSummary = screen.getByRole('region', { name: 'คิวถัดไปที่ต้องตรวจ' });
      const rangeFilter = screen.getByRole('region', { name: 'ตัวกรองแดชบอร์ด' });
      expect(nextAppointmentSummary.nextElementSibling).toBe(rangeFilter);
      expect(within(nextAppointmentSummary).getByText('คิว #4')).toBeInTheDocument();
      expect(within(nextAppointmentSummary).getByText(/14 กันยายน 2569/)).toBeInTheDocument();
      expect(within(nextAppointmentSummary).getByText('09:15 น.')).toBeInTheDocument();
      expect(within(nextAppointmentSummary).getByText('ผู้ป่วยถัดไป')).toBeInTheDocument();
      expect(within(nextAppointmentSummary).getByRole('button', { name: 'คิวก่อนหน้า' })).toBeDisabled();
      const nextQueueButton = within(nextAppointmentSummary).getByRole('button', { name: 'คิวถัดไป' });
      expect(nextQueueButton).not.toBeDisabled();
      expect(nextQueueButton).toHaveClass('border-brand-strong', 'bg-brand-strong', 'text-white');
      fireEvent.click(nextQueueButton);
      expect(within(nextAppointmentSummary).getByText('คิว #6')).toBeInTheDocument();
      expect(within(nextAppointmentSummary).getByText('ผู้ป่วยรอบถัดไป')).toBeInTheDocument();
      expect(within(nextAppointmentSummary).getByText('10:15 น.')).toBeInTheDocument();
      expect(within(nextAppointmentSummary).getByRole('button', { name: 'คิวก่อนหน้า' })).not.toBeDisabled();
      expect(within(nextAppointmentSummary).getByRole('button', { name: 'คิวถัดไป' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'รีเฟรช' }).parentElement).toHaveClass('absolute', 'right-0', 'top-0', 'sm:static');
      const appointmentsButton = screen.getByRole('button', { name: /นัดของฉัน ย้อนหลัง 7 วัน/ });
      expect(appointmentsButton).toHaveAttribute('aria-pressed', 'true');
    expect(appointmentsButton).toHaveClass('h-36', 'min-h-36', 'sm:h-32');
      expect(appointmentsButton.querySelector('svg.lucide-chevron-down')).toBeInTheDocument();
      const appointmentsList = screen.getByRole('region', { name: 'รายชื่อผู้ป่วยนัดของฉัน ย้อนหลัง 7 วัน' });
      expect(appointmentsList).toHaveClass('rounded-b-2xl');
      expect(within(appointmentsList).queryByText('นัดของฉัน ย้อนหลัง 7 วัน')).not.toBeInTheDocument();
      expect(within(appointmentsList).getByText(/พบ [0-9]+ รายการ/)).toHaveClass('text-sm');
      const pendingAppointments = within(appointmentsList).getByRole('group', { name: 'รายการรอการยืนยัน' });
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
      expect(within(appointmentsList).getByRole('link', { name: 'ดูนัดหมายทั้งหมด' })).toHaveClass('bg-brand-strong', 'min-h-9', 'sm:min-h-10');
      expect(within(pendingAppointments).getByRole('button', { name: 'รายการรอการยืนยันก่อนหน้า' })).toBeDisabled();
      expect(within(pendingAppointments).getByRole('button', { name: 'รายการรอการยืนยันถัดไป' })).toBeDisabled();
      expect(within(confirmedAppointments).getByRole('button', { name: 'รายการยืนยันแล้วก่อนหน้า' })).toBeDisabled();
      expect(within(confirmedAppointments).getByRole('button', { name: 'รายการยืนยันแล้วถัดไป' })).toBeDisabled();
      expect(within(appointmentsList).getByText('ผู้ป่วยวันก่อน')).toBeInTheDocument();
      const inProgressButton = screen.getByRole('button', { name: /กำลังตรวจ ย้อนหลัง 7 วัน/ });
      expect(inProgressButton).toBeInTheDocument();
      const completedButton = screen.getByRole('button', { name: /ตรวจเสร็จ ย้อนหลัง 7 วัน/ });
      expect(completedButton).toBeInTheDocument();
    expect(remainingButton).toHaveClass('h-36', 'min-h-36', 'sm:h-32');
    expect(inProgressButton).toHaveClass('h-36', 'min-h-36', 'sm:h-32');
    expect(completedButton).toHaveClass('h-36', 'min-h-36', 'sm:h-32');
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
      expect(screen.getByRole('region', { name: 'รายชื่อผู้ป่วยนัดของฉัน ย้อนหลัง 7 วัน' })).toBeInTheDocument();

      fireEvent.click(inProgressButton);
      expect(inProgressButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('region', { name: /รายชื่อผู้ป่วยกำลังตรวจ ย้อนหลัง 7 วัน/ })).toHaveTextContent('ไม่พบผู้ป่วยในสถานะนี้');

      fireEvent.click(remainingButton);
      const remainingList = screen.getByRole('region', { name: 'รายชื่อผู้ป่วยคิวของฉันในช่วงที่เลือก' });
      expect(within(remainingList).getByText('ผู้ป่วยในคิว')).toBeInTheDocument();
      expect(within(remainingList).queryByText('ผู้ป่วยวันนี้')).not.toBeInTheDocument();
      expect(within(remainingList).queryByText('ผู้ป่วยวันก่อน')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /ตรวจเสร็จ ย้อนหลัง 7 วัน/ }));
      const completedList = screen.getByRole('region', { name: /รายชื่อผู้ป่วยตรวจเสร็จ ย้อนหลัง 7 วัน/ });
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
      title: 'ภาพรวมงานแพทย์',
      description: 'ดูตาราง คิว และรายการยาที่ต้องตรวจสอบ',
      metrics: [
        { id: 'own-appointments', label: 'นัดของฉันวันนี้', value: 5, description: '', href: '/appointments', tone: 'blue' },
        { id: 'own-queue', label: 'คิวของฉันที่เหลือ', value: 4, description: '', href: '/appointments', tone: 'amber' },
        { id: 'in-progress-in-range', label: 'กำลังตรวจวันนี้', value: 0, description: '', href: '/appointments', tone: 'violet' },
        { id: 'completed-in-range', label: 'ตรวจเสร็จวันนี้', value: 0, description: '', href: '/appointments', tone: 'emerald' },
      ],
      appointmentStatuses: [
        { status: 'pending', label: 'รอการยืนยัน', count: 1 },
        { status: 'confirmed', label: 'ยืนยันแล้ว', count: 4 },
        { status: 'in_progress', label: 'กำลังตรวจ', count: 0 },
        { status: 'completed', label: 'ตรวจเสร็จแล้ว', count: 0 },
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

  it('keeps the empty medical next-queue summary free of an appointment action', async () => {
    getDashboardViewMock.mockResolvedValue({
      ...createRangeTestView('medical', 'today'),
      title: 'ภาพรวมงานแพทย์',
      description: 'ดูตาราง คิว และรายการยาที่ต้องตรวจสอบ',
      metrics: [{ id: 'own-appointments', label: 'นัดของฉันวันนี้', value: 0, description: '', href: '/appointments', tone: 'blue' }],
      nextAppointment: null,
    });

    render(<DashboardScreen role="medical" actorId="medical-1" />);

    const nextAppointmentSummary = await screen.findByRole('region', { name: 'คิวถัดไปที่ต้องตรวจ' });
    expect(within(nextAppointmentSummary).getByText('วันนี้ไม่มีคิวที่ต้องตรวจ')).toBeInTheDocument();
    expect(within(nextAppointmentSummary).queryByRole('link', { name: 'ดูนัดหมายทั้งหมด' })).not.toBeInTheDocument();
  });

  it('uses the staff medication status controls on the medical pharmacy dashboard', async () => {
    const view: DashboardView = {
      role: 'medical',
      actor: { id: 'pharmacist-1', fullName: 'เภสัชกรหนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-14',
      range: 'today',
      title: 'ภาพรวมงานเภสัชกรรม',
      description: 'ดูใบสั่งยารอจ่ายและสถานะคลังยา',
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

    expect(screen.queryByRole('region', { name: 'คิวถัดไปที่ต้องตรวจ' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'รายการยาที่ต้องตรวจสอบ' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /การแจ้งเตือนล่าสุด/ })).not.toBeInTheDocument();
    expect(screen.queryByText('แจ้งเตือนล่าสุด')).not.toBeInTheDocument();
    expect(screen.queryByText('แจ้งเตือนที่อ่านแล้ว')).not.toBeInTheDocument();
    expect(screen.queryByText('1 ยังไม่อ่าน')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'จัดการคลังยา' })).toHaveClass('bg-brand-strong', 'min-h-9', 'sm:min-h-10');
    const medicationSection = screen.getByRole('heading', { name: 'รายการยาที่ต้องตรวจสอบ' }).closest('section');
    expect(medicationSection).toHaveClass('border-b', 'border-brand-border-soft');
    expect(medicationSection).not.toHaveClass('border-t');
    expect(medicationSection?.parentElement).toHaveClass('w-full');
    expect(medicationSection?.parentElement).not.toHaveClass('max-w-[1600px]');
    expect(allMedicationButton).toHaveAttribute('aria-pressed', 'true');
    expect(medicationFilterGroup).toHaveClass('w-full', 'min-w-max');
    expect(allMedicationButton).toHaveClass('min-h-11', 'sm:min-h-12', 'rounded-t-2xl', 'border-t-brand-strong', 'text-xs', 'sm:text-sm');
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
    expect(screen.getByRole('progressbar', { name: 'จำนวนคงเหลือของยา ยาใกล้หมดในคลินิก' })).toHaveClass('h-1.5');

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
    expect(screen.queryByRole('progressbar', { name: 'จำนวนคงเหลือของยา ยาหมดอายุในคลินิก' })).not.toBeInTheDocument();
  });

  it('renders patient priorities with the next appointment, active medicines, and treatment history', async () => {
    const view: DashboardView = {
      role: 'patient',
      actor: { id: 'patient-1', fullName: 'ผู้ป่วยหนึ่ง' },
      date: '2026-09-14',
      startDate: '2026-09-01',
      range: '30d',
      title: 'ภาพรวมสุขภาพของฉัน',
      description: 'ดูนัดหมายถัดไป ยาที่กำลังใช้ และประวัติการรักษา',
      metrics: [
        { id: 'my-medications', label: 'ยาที่กำลังใช้อยู่', value: 1, description: '', href: '/reminders', tone: 'violet' },
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
        id: 'record-1', date: '2026-09-10T03:00:00.000Z', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป', symptom: 'มีไข้และไอ', summary: 'ติดตามอาการทั่วไป', medicationCount: 1,
      }, {
        id: 'record-older', date: '2026-09-01T03:00:00.000Z', doctorName: 'แพทย์สอง', departmentName: 'ทันตกรรม', symptom: 'ปวดฟัน', summary: 'ตรวจสุขภาพฟัน', advice: 'นัดติดตาม', medicationNames: ['Amoxicillin'], medicationCount: 0,
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

    expect(await screen.findByRole('main')).toHaveClass('w-screen', 'max-w-none', 'px-4', 'sm:px-6', 'lg:px-8', 'gap-6', 'sm:gap-8');
    expect(screen.getByRole('heading', { name: 'ภาพรวมสุขภาพของฉัน', level: 1 })).toHaveClass('text-2xl', 'sm:text-3xl', 'lg:text-4xl');
    expect(screen.getByRole('heading', { name: 'สรุปสถานะนัดหมาย', level: 2 })).toHaveClass('text-base', 'sm:text-lg');
    expect(screen.getByRole('heading', { name: 'ยาที่กำลังใช้อยู่', level: 2 })).toHaveClass('text-base', 'sm:text-lg');
    expect(screen.getByRole('heading', { name: 'ประวัติการรักษา', level: 2 })).toHaveClass('text-base', 'sm:text-lg');
    expect(screen.queryByRole('region', { name: 'ภาพรวมสุขภาพของฉัน' })).not.toBeInTheDocument();
    expect(screen.getAllByText('ยาที่กำลังใช้อยู่')).toHaveLength(1);
    expect(screen.queryByText('การแจ้งเตือน')).not.toBeInTheDocument();
    expect(screen.queryByText('การแจ้งเตือนวันนี้')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ยาที่กำลังใช้อยู่/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('รายละเอียดรายการยาที่กำลังใช้อยู่')).not.toBeInTheDocument();
    const nextAppointmentSummary = screen.getByRole('region', { name: 'นัดหมายถัดไป' });
    for (const button of within(nextAppointmentSummary).getAllByRole('button', { name: /นัดหมาย(ก่อนหน้า|ถัดไป)/ })) {
      expect(button).toHaveClass('size-9', 'sm:size-10', 'border-brand-strong', 'bg-brand-strong', 'text-white', 'hover:bg-brand-hover');
      expect(button).toBeDisabled();
    }
    expect(within(nextAppointmentSummary).getByText('แพทย์')).toHaveClass('text-[11px]', 'sm:text-xs');
    const navigationControls = within(nextAppointmentSummary).getByLabelText('เลื่อนดูนัดหมาย');
    expect(navigationControls).toHaveClass('lg:absolute', 'lg:right-0', 'lg:top-0');
    expect(within(nextAppointmentSummary).queryByRole('link', { name: /ดูนัดหมาย/ })).not.toBeInTheDocument();
    expect(within(nextAppointmentSummary).getByText('สถานะ').closest('div')?.parentElement).toContainElement(navigationControls);
    expect(within(nextAppointmentSummary).getByText('คิว #4')).toBeInTheDocument();
    for (const label of ['วันนัด', 'เวลา', 'เหลือเวลา']) {
      expect(within(nextAppointmentSummary).getByText(label).parentElement).toHaveClass('rounded-xl', 'border');
    }
    expect(within(nextAppointmentSummary).getByText('วันนัด').parentElement).toHaveClass('col-span-2', 'sm:col-span-1');
    expect(within(nextAppointmentSummary).getByText('วันพุธที่ 16 กันยายน 2569')).toHaveClass('break-words', 'text-base', 'font-bold', 'sm:text-lg');
    expect(within(nextAppointmentSummary).getByText('09:30 น.')).toHaveClass('text-lg', 'font-bold', 'text-brand-ink', 'sm:text-xl');
    expect(within(nextAppointmentSummary).getByText('แพทย์').closest('dl')).toHaveClass('grid', 'sm:grid-cols-3');
    expect(within(nextAppointmentSummary).getByText('เหลือเวลา')).toHaveClass('text-xs', 'font-semibold', 'text-brand-strong');
    expect(within(nextAppointmentSummary).getByText(/ถึงเวลานัดแล้ว|น้อยกว่า 1 ชม\.|\d+ (?:วัน|ชม\.)/)).toHaveClass('text-lg', 'font-bold', 'text-brand-strong', 'sm:text-xl');
    expect(within(nextAppointmentSummary).getByText('แพทย์หนึ่ง')).toHaveClass('break-words', 'leading-5');
    expect(within(nextAppointmentSummary).getByText('เวชทั่วไป')).toBeInTheDocument();
    expect(screen.getByText('ประวัติการรักษา')).toBeInTheDocument();
    expect(screen.getAllByText('Paracetamol 500mg')).toHaveLength(1);
    expect(screen.getByText('ติดตามอาการทั่วไป')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ดูนัดหมายทั้งหมด' })).toHaveClass('min-h-8', 'px-2.5', 'text-[11px]');
    expect(screen.getByRole('link', { name: 'ดูประวัติทั้งหมด' })).toHaveClass('min-h-8', 'px-2.5', 'text-[11px]');
    expect(screen.getByRole('columnheader', { name: 'วันที่' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'อาการที่ป่วย' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'แผนก' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'แพทย์' })).not.toBeInTheDocument();
    expect(screen.getByRole('table').parentElement).toHaveClass('rounded-2xl', 'border', 'bg-brand-surface');
    expect(screen.getByRole('link', { name: 'ดูประวัติทั้งหมด' })).toHaveAttribute('href', '/records');
    expect(screen.getByText('แสดง 2 จาก 2 รายการ')).toBeInTheDocument();

    const historyRows = screen.getByRole('table').querySelectorAll('tbody tr');
    expect(within(historyRows[0] as HTMLElement).getByText('มีไข้และไอ')).toBeInTheDocument();
    expect(screen.getByText('ตรวจสุขภาพฟัน')).toBeInTheDocument();
    expect(screen.getByText('ติดตามอาการทั่วไป')).toBeInTheDocument();
    expect(screen.queryByText('สถานะนัดหมายวันนี้')).not.toBeInTheDocument();
  });

  it('shows the next appointment toast once after a patient login', async () => {
    sessionStorage.setItem('login_appointment_toast', 'true');
    getDashboardViewMock.mockResolvedValue({
      ...createRangeTestView('patient', 'today'),
      nextAppointment: {
        id: 'appointment-toast', queueNumber: 2, date: '2026-09-16', startTime: '09:30', status: 'confirmed',
        patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      },
    } satisfies DashboardView);

    render(<DashboardScreen role="patient" actorId="patient-1" />);

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('นัดหมายถัดไป: วันพุธที่ 16 กันยายน 2569 เวลา 09:30 น.');
    expect(toast.getAttribute('style')).toContain('5000ms');
    expect(sessionStorage.getItem('login_appointment_toast')).toBeNull();
  });

  it('shows the next examination toast at the top right once after a medical login', async () => {
    sessionStorage.setItem('login_appointment_toast', 'true');
    getDashboardViewMock.mockResolvedValue({
      ...createRangeTestView('medical', 'today'),
      title: 'ภาพรวมงานแพทย์',
      description: 'ดูตาราง คิว และรายการยาที่ต้องตรวจสอบ',
      metrics: [{ id: 'own-appointments', label: 'นัดของฉันวันนี้', value: 1, description: '', href: '/appointments', tone: 'blue' }],
      nextAppointment: {
        id: 'medical-appointment-toast', queueNumber: 2, date: '2026-09-16', startTime: '09:30', status: 'confirmed',
        patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      },
    });

    render(<DashboardScreen role="medical" actorId="medical-1" />);

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('ตรวจครั้งถัดไป: วันพุธที่ 16 กันยายน 2569 เวลา 09:30 น.');
    expect(toast.getAttribute('style')).toContain('5000ms');
    expect(toast.parentElement).toHaveClass('top-20', 'sm:right-6');
    expect(sessionStorage.getItem('login_appointment_toast')).toBeNull();
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
      description: 'ดูนัดหมายถัดไป ยาที่กำลังใช้ และประวัติการรักษา',
      metrics: [],
      appointmentStatuses: [],
      appointmentQueue: [{
        id: 'appointment-next', queueNumber: 4, date: '2026-09-16', startTime: '09:30', status: 'confirmed',
        cancelRequestedAt: null, patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      }, {
        id: 'appointment-next-2', queueNumber: 5, date: '2026-09-17', startTime: '10:30', status: 'confirmed',
        cancelRequestedAt: null, patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์สอง', departmentName: 'ทันตกรรม',
      }],
      upcomingAppointments: [{
        id: 'appointment-next', queueNumber: 4, date: '2026-09-16', startTime: '09:30', status: 'confirmed',
        cancelRequestedAt: null, patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป',
      }, {
        id: 'appointment-next-2', queueNumber: 5, date: '2026-09-17', startTime: '10:30', status: 'confirmed',
        cancelRequestedAt: null, patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์สอง', departmentName: 'ทันตกรรม',
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
    const nextAppointmentSummary = screen.getByRole('region', { name: 'นัดหมายถัดไป' });
    expect(within(nextAppointmentSummary).getByRole('button', { name: 'นัดหมายก่อนหน้า' })).toBeDisabled();
    const nextAppointmentButton = within(nextAppointmentSummary).getByRole('button', { name: 'นัดหมายถัดไป' });
    expect(nextAppointmentButton).toHaveClass('border-brand-strong', 'bg-brand-strong', 'text-white', 'hover:bg-brand-hover');
    expect(nextAppointmentButton).not.toBeDisabled();
    fireEvent.click(nextAppointmentButton);
    expect(await within(nextAppointmentSummary).findByText('คิว #5')).toBeInTheDocument();
    expect(within(nextAppointmentSummary).getByRole('button', { name: 'นัดหมายก่อนหน้า' })).not.toBeDisabled();
    expect(within(nextAppointmentSummary).getByRole('button', { name: 'นัดหมายถัดไป' })).toBeDisabled();
    expect(screen.queryByText('รายการนัดหมายทั้งหมด')).not.toBeInTheDocument();
    expect(screen.queryByText('ข้อมูลสุขภาพของฉัน')).not.toBeInTheDocument();
    expect(screen.queryByText('มีประวัติแพ้ยา')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'ภาพรวมสุขภาพของฉัน' })).not.toBeInTheDocument();
    expect(screen.getByText('ติดตามอาการทั่วไป')).toBeInTheDocument();
    expect(screen.getByText(/ยังไม่ได้บันทึก/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'กินแล้ว' }));
    await waitFor(() => expect(recordPatientMedicationTakenMock).toHaveBeenCalledWith('reminder-1', '2026-09-14T08:00:00+07:00'));
  });

  it('shows real patient appointment rows when a summary status is selected', async () => {
    getDashboardViewMock.mockResolvedValue({
      ...createRangeTestView('patient', '7d'),
      appointmentStatuses: [
        { status: 'pending', label: 'รอการยืนยัน', count: 1 },
        { status: 'confirmed', label: 'ยืนยันแล้ว', count: 1 },
        { status: 'in_progress', label: 'กำลังตรวจ', count: 0 },
        { status: 'completed', label: 'ตรวจเสร็จแล้ว', count: 1 },
        { status: 'cancelled', label: 'ยกเลิก', count: 0 },
      ],
      appointmentQueue: [
        { id: 'patient-pending', queueNumber: 1, date: '2026-09-09', startTime: '09:00', status: 'pending', patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์หนึ่ง', departmentName: 'เวชทั่วไป' },
        { id: 'patient-confirmed', queueNumber: 2, date: '2026-09-12', startTime: '10:00', status: 'confirmed', patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์สอง', departmentName: 'อายุรกรรม' },
        { id: 'patient-completed', queueNumber: 3, date: '2026-09-13', startTime: '11:00', status: 'completed', patientName: 'ผู้ป่วยหนึ่ง', doctorName: 'แพทย์สาม', departmentName: 'ทันตกรรม' },
      ],
    });

    render(<DashboardScreen role="patient" actorId="patient-1" />);

    const allAppointmentsButton = await screen.findByRole('button', { name: /นัดหมายทั้งหมด/ });
    const activeAppointmentsButton = screen.getByRole('button', { name: /กำลังรอหรือกำลังตรวจ/ });
    const completedAppointmentsButton = screen.getByRole('button', { name: /ตรวจเสร็จแล้ว/ });
    for (const button of [allAppointmentsButton, activeAppointmentsButton, completedAppointmentsButton]) {
      expect(button).toHaveClass('border-brand-border-soft', 'bg-brand-page/40', 'hover:border-brand-border-strong', 'hover:bg-brand-soft/50');
    }
    expect(completedAppointmentsButton).not.toHaveClass('border-emerald-100', 'bg-emerald-50/50');

    fireEvent.click(allAppointmentsButton);
    const allDetails = await screen.findByRole('region', { name: 'สรุปนัดหมายทั้งหมด' });
    expect(allAppointmentsButton.nextElementSibling).toBe(allDetails);
    expect(within(allDetails).queryByText('สรุปนัดหมายทั้งหมด')).not.toBeInTheDocument();
    expect(within(allDetails).queryByText('ดูจำนวนนัดหมายแยกตามสถานะ')).not.toBeInTheDocument();
    expect(within(allDetails).getByText('คิว #1')).toBeInTheDocument();
    expect(within(allDetails).getByText('คิว #2')).toBeInTheDocument();
    expect(within(allDetails).getByText('คิว #3')).toBeInTheDocument();
    expect(within(allDetails).getByRole('link', { name: /คิว #1/ })).toHaveAttribute('href', '/records?appointment=patient-pending');

    fireEvent.click(screen.getByRole('button', { name: /กำลังรอหรือกำลังตรวจ/ }));
    const activeDetails = await screen.findByRole('region', { name: 'สรุปนัดที่กำลังรอหรือกำลังตรวจ' });
    expect(activeAppointmentsButton.nextElementSibling).toBe(activeDetails);
    expect(within(activeDetails).getByText('คิว #1')).toBeInTheDocument();
    expect(within(activeDetails).getByText('คิว #2')).toBeInTheDocument();
    expect(within(activeDetails).queryByText('คิว #3')).not.toBeInTheDocument();

    fireEvent.click(completedAppointmentsButton);
    expect(completedAppointmentsButton).toHaveClass('border-brand-strong', 'bg-brand-soft', 'ring-2', 'ring-brand-strong/35');
    const completedDetails = await screen.findByRole('region', { name: 'สรุปนัดที่ตรวจเสร็จแล้ว' });
    expect(completedAppointmentsButton.nextElementSibling).toBe(completedDetails);
    expect(within(completedDetails).getByText('คิว #3')).toBeInTheDocument();
    expect(within(completedDetails).queryByText('คิว #1')).not.toBeInTheDocument();
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
    expect(screen.getByText('ผลตรวจใน 7 วันที่ผ่านมา')).toBeInTheDocument();
  });
});
