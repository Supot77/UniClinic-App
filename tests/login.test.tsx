import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LoginPage from '@/app/(auth)/login/page';
import * as authService from '@/services/authService';

const routerState = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

const searchParamsState = vi.hoisted(() => ({
  get: vi.fn().mockReturnValue(null),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerState,
  useSearchParams: () => searchParamsState,
}));

vi.mock('@/services/authService', () => ({
  signIn: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form properly', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
    expect(screen.getByLabelText('อีเมล')).toHaveAttribute('placeholder', 'name@example.com');
    expect(screen.getByText(/ผู้ป่วยใช้อีเมลที่ลงท้ายด้วย @mail\.wu\.ac\.th/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'แสดงรหัสผ่าน' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ลืมรหัสผ่าน?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
  });

  it('shows loading animation and redirect state during successful login', async () => {
    let resolveSignIn: (value: unknown) => void = () => {};
    const signInPromise = new Promise((resolve) => {
      resolveSignIn = resolve;
    });
    vi.mocked(authService.signIn).mockReturnValue(signInPromise as never);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('อีเมล'), {
      target: { value: 'patient@mail.wu.ac.th' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });

    const submitBtn = screen.getByRole('button', { name: 'เข้าสู่ระบบ' });
    fireEvent.click(submitBtn);

    // During authentication
    expect(screen.getByRole('button', { name: /กำลังเข้าสู่ระบบ/i })).toBeDisabled();

    // Resolve sign in
    resolveSignIn({ user: { id: 'test-user' } });

    // Expect redirect overlay and button text
    await waitFor(() => {
      expect(screen.getByText('เข้าสู่ระบบสำเร็จ')).toBeInTheDocument();
      expect(within(screen.getByRole('status')).getByText('กำลังเปิดหน้าถัดไป…')).toBeInTheDocument();
      expect(routerState.push).toHaveBeenCalledWith('/dashboard');
      expect(routerState.refresh).toHaveBeenCalled();
    });
  });

  it('handles sign in error and resets button', async () => {
    vi.mocked(authService.signIn).mockRejectedValue(new Error('Invalid login credentials'));

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('อีเมล'), {
      target: { value: 'wrong@mail.wu.ac.th' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    });

    const submitBtn = screen.getByRole('button', { name: 'เข้าสู่ระบบ' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'แสดงรหัสผ่าน' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'แสดงรหัสผ่าน' }));
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'ซ่อนรหัสผ่าน' })).toBeInTheDocument();
  });

  it('rejects malformed email before calling the auth service', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('อีเมล'), {
      target: { value: 'user@example' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));

    expect(await screen.findByText('กรุณากรอกอีเมลให้ถูกต้อง')).toBeInTheDocument();
    expect(authService.signIn).not.toHaveBeenCalled();
  });
});
