import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import PasswordSecurityCard from '@/components/profile/PasswordSecurityCard';
import * as authService from '@/services/authService';

vi.mock('@/services/authService', () => ({
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  changePassword: vi.fn(),
}));

describe('password recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests a Supabase recovery email with the reset callback URL', async () => {
    vi.mocked(authService.requestPasswordReset).mockResolvedValue(undefined);
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('อีเมล'), {
      target: { value: 'Doctor@Gmail.COM' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ส่งลิงก์ตั้งรหัสผ่านใหม่' }));

    await waitFor(() => {
      expect(authService.requestPasswordReset).toHaveBeenCalledWith(
        'Doctor@Gmail.COM',
        `${window.location.origin}/reset-password`,
      );
      expect(screen.getByRole('heading', { name: 'ตรวจสอบอีเมลของคุณ' })).toBeInTheDocument();
    });
  });

  it('does not update when the password confirmation is different', async () => {
    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), { target: { value: 'newpassword1' } });
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), { target: { value: 'different1' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
    expect(authService.updatePassword).not.toHaveBeenCalled();
  });

  it('updates the password from a valid recovery session', async () => {
    vi.mocked(authService.updatePassword).mockResolvedValue(undefined);
    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), { target: { value: 'newpassword1' } });
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), { target: { value: 'newpassword1' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }));

    await waitFor(() => {
      expect(authService.updatePassword).toHaveBeenCalledWith('newpassword1');
      expect(screen.getByRole('heading', { name: 'ตั้งรหัสผ่านใหม่สำเร็จ' })).toBeInTheDocument();
    });
  });
});

describe('profile password security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies the current password before changing it', async () => {
    vi.mocked(authService.changePassword).mockResolvedValue(undefined);
    render(<PasswordSecurityCard />);

    fireEvent.change(screen.getByLabelText('รหัสผ่านปัจจุบัน'), { target: { value: 'oldpassword' } });
    fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), { target: { value: 'Newpassword1' } });
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), { target: { value: 'Newpassword1' } });
    fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }));

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith('oldpassword', 'Newpassword1');
      expect(screen.getByRole('status')).toHaveTextContent('เปลี่ยนรหัสผ่านสำเร็จ');
    });
  });

  it('shows password rules while typing and rejects a password without uppercase', async () => {
    render(<PasswordSecurityCard />);
    fireEvent.change(screen.getByLabelText('รหัสผ่านปัจจุบัน'), { target: { value: 'Oldpassword1' } });
    fireEvent.change(screen.getByLabelText('รหัสผ่านใหม่'), { target: { value: 'newpassword1' } });
    expect(screen.getByText('○ ตัวพิมพ์ใหญ่ A–Z')).toBeInTheDocument();
    expect(screen.getByText('✓ ตัวพิมพ์เล็ก a–z')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), { target: { value: 'newpassword1' } });
    fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ตัวพิมพ์ใหญ่');
    expect(authService.changePassword).not.toHaveBeenCalled();
  });
});
