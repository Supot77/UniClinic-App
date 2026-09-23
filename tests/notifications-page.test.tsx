import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsPage from '@/app/(patient)/notifications/page';

const authState = vi.hoisted(() => ({
  user: { id: 'patient-1', email: 'patient@mail.wu.ac.th' },
  role: 'patient' as const,
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
});
