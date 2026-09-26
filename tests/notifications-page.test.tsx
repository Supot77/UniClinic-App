import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsPage from '@/app/(patient)/notifications/page';

const authState = vi.hoisted(() => ({
  user: { id: 'patient-1', email: 'patient@mail.wu.ac.th' },
  role: 'patient' as 'patient' | 'medical' | 'staff_admin',
  isLoading: false,
  isAuthenticated: true,
}));

const serviceMocks = vi.hoisted(() => ({
  deleteNotification: vi.fn(),
  getBroadcastHistory: vi.fn(),
  getNotifications: vi.fn(),
  getUnreadNotificationRecipients: vi.fn(),
  markAsRead: vi.fn(),
  sendBroadcast: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));
vi.mock('@/services/dashboardService', () => serviceMocks);

const notification = {
  id: 'notification-1',
  user_id: 'patient-1',
  type: 'appointment' as const,
  title: 'ยืนยันนัดหมายแล้ว',
  message: 'นัดหมายของคุณได้รับการยืนยัน',
  is_read: false,
  event_key: null,
  broadcast_id: null,
  read_at: null,
  deleted_at: null,
  created_at: '2026-09-21T03:00:00.000Z',
};

describe('NotificationsPage user-facing errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.role = 'patient';
    serviceMocks.getNotifications.mockResolvedValue([notification]);
    serviceMocks.getUnreadNotificationRecipients.mockResolvedValue([]);
    serviceMocks.getBroadcastHistory.mockResolvedValue([]);
    serviceMocks.markAsRead.mockResolvedValue({ ...notification, is_read: true });
    serviceMocks.deleteNotification.mockResolvedValue(undefined);
  });

  it('shows a friendly load error and a matching reload action', async () => {
    serviceMocks.getNotifications.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<NotificationsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
    expect(screen.getByRole('button', { name: 'โหลดข้อมูลใหม่' })).toBeInTheDocument();
  });

  it('does not show a reload action for a failed read-state update', async () => {
    serviceMocks.markAsRead.mockRejectedValueOnce({ code: '42501', message: 'permission denied' });

    render(<NotificationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'ทำเครื่องหมายว่าอ่านแล้ว: ยืนยันนัดหมายแล้ว' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('คุณไม่มีสิทธิ์ดำเนินการนี้'));
    expect(screen.queryByRole('button', { name: 'โหลดข้อมูลใหม่' })).not.toBeInTheDocument();
  });

  it('keeps refresh available as a compact accessible control', async () => {
    render(<NotificationsPage />);

    const refreshButton = await screen.findByRole('button', { name: 'รีเฟรช' });
    expect(refreshButton).toHaveAttribute('title', 'รีเฟรช');
    expect(refreshButton.querySelector('svg')).toBeTruthy();
  });

  it('uses the all-recipients heading and medication-style role tabs for staff admins', async () => {
    authState.role = 'staff_admin';

    render(<NotificationsPage />);

    expect(await screen.findByRole('heading', { name: 'ผู้รับทั้งหมด' })).toBeInTheDocument();
    expect(screen.queryByText('0 คน')).not.toBeInTheDocument();

    const allRecipientsTab = screen.getByRole('tab', { name: 'ผู้รับทุกคน 0' });
    expect(allRecipientsTab).toHaveClass('rounded-t-2xl', 'border-t-4');
    const periodControl = within(screen.getByRole('toolbar', { name: 'ตัวกรองการแจ้งเตือน' })).getByRole('group', { name: 'เลือกช่วงเวลา' });
    expect(periodControl.parentElement?.nextElementSibling?.nodeName).toBe('TIME');
    expect(periodControl.parentElement?.nextElementSibling).toHaveTextContent(/2569/);

    fireEvent.click(within(periodControl).getByRole('button', { name: 'ย้อนหลัง 7 วัน' }));
    await waitFor(() => expect(periodControl.parentElement?.nextElementSibling).toHaveTextContent('–'));
  });

  it.each(['patient', 'medical', 'staff_admin'] as const)('shows the selected notification period beside the segmented control for %s', async (role) => {
    authState.role = role;

    render(<NotificationsPage />);

    const toolbar = await screen.findByRole('toolbar', { name: 'ตัวกรองการแจ้งเตือน' });
    const periodControl = within(toolbar).getByRole('group', { name: 'เลือกช่วงเวลา' });
    const periodLabel = periodControl.parentElement?.nextElementSibling;
    expect(periodLabel?.nodeName).toBe('TIME');
    expect(periodLabel).toHaveTextContent(/2569/);

    fireEvent.click(within(periodControl).getByRole('button', { name: 'ย้อนหลัง 7 วัน' }));
    await waitFor(() => expect(periodLabel).toHaveTextContent('–'));
  });
});
