import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage, { validateRegistration } from '@/app/(auth)/register/page';
import * as authService from '@/services/authService';

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/services/authService', () => ({ signUp: vi.fn() }));

describe('registration validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects invalid name, student ID, university email, phone and password confirmation', () => {
    expect(validateRegistration({
      fullName: 'สมชาย123',
      studentId: '1234ABCD',
      email: 'student@wu.ac.th',
      phone: '08123',
      password: '1234567',
      confirmPassword: 'different',
    })).toEqual(expect.objectContaining({
      fullName: expect.any(String),
      studentId: expect.any(String),
      email: expect.any(String),
      phone: expect.any(String),
      password: expect.any(String),
      confirmPassword: expect.any(String),
    }));
  });

  it('keeps student ID and phone numeric with their required lengths', () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/รหัสนักศึกษา/), { target: { value: '67A11600499' } });
    fireEvent.change(screen.getByLabelText(/เบอร์โทรศัพท์/), { target: { value: '08X123456789' } });

    expect(screen.getByLabelText(/รหัสนักศึกษา/)).toHaveValue('67116004');
    expect(screen.getByLabelText(/เบอร์โทรศัพท์/)).toHaveValue('0812345678');
  });

  it('shows field errors and does not submit invalid information', async () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/ชื่อ-นามสกุล/), { target: { value: 'Somchai123' } });
    fireEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }));

    expect(await screen.findByText('ใช้ได้เฉพาะตัวอักษรไทย อังกฤษ และช่องว่าง')).toBeInTheDocument();
    expect(screen.getByText('รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก')).toBeInTheDocument();
    expect(screen.getByText('กรุณาใช้อีเมล @mail.wu.ac.th เท่านั้น')).toBeInTheDocument();
    expect(authService.signUp).not.toHaveBeenCalled();
  });

  it('submits normalized valid information', async () => {
    vi.mocked(authService.signUp).mockResolvedValue({} as never);
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/ชื่อ-นามสกุล/), { target: { value: 'สมชาย ใจดี' } });
    fireEvent.change(screen.getByLabelText(/รหัสนักศึกษา/), { target: { value: '67116004' } });
    fireEvent.change(screen.getByLabelText(/เบอร์โทรศัพท์/), { target: { value: '0812345678' } });
    fireEvent.change(screen.getByLabelText(/อีเมลมหาวิทยาลัย/), { target: { value: 'STUDENT@mail.wu.ac.th' } });
    fireEvent.change(screen.getByLabelText(/^รหัสผ่าน /), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/ยืนยันรหัสผ่าน/), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }));

    await waitFor(() => {
      expect(authService.signUp).toHaveBeenCalledWith('student@mail.wu.ac.th', 'password123', 'สมชาย ใจดี', '67116004', '0812345678');
      expect(router.push).toHaveBeenCalledWith('/login?registered=true');
    });
  });
});
