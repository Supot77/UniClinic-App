import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import LoginToastListener from '@/components/common/LoginToastListener';
import * as useAuthHook from '@/hooks/useAuth';
import * as reminderService from '@/services/reminderService';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/reminderService', () => ({
  getPatientMedicalRecords: vi.fn(),
  getReminders: vi.fn(),
}));

describe('LoginToastListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders medication reminder toast when patient logs in with active medications', async () => {
    sessionStorage.setItem('login_welcome_toast', 'true');
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: {
        id: 'patient-1',
        email: 'patient@mail.wu.ac.th',
        role: 'patient',
        displayName: 'นายสมชาย ใจดี',
      },
      role: 'patient',
      isLoading: false,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    vi.mocked(reminderService.getPatientMedicalRecords).mockResolvedValue([
      {
        id: 'rec-1',
        patient_id: 'patient-1',
        prescribed_medications: [
          { name: 'Paracetamol 500mg', dosage: '1 เม็ด', frequency: 'วันละ 3 ครั้ง หลังอาหาร' },
          { name: 'Amoxicillin 500mg', dosage: '1 แคปซูล', frequency: 'วันละ 2 ครั้ง ก่อนอาหาร' },
        ],
      } as never,
    ]);
    vi.mocked(reminderService.getReminders).mockResolvedValue([]);

    render(<LoginToastListener />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/แจ้งเตือนยา: Paracetamol 500mg, Amoxicillin 500mg/)).toBeInTheDocument();
    });

    expect(sessionStorage.getItem('login_welcome_toast')).toBeNull();
  });

  it('renders fallback message when patient has no active medications in reminder list', async () => {
    sessionStorage.setItem('login_welcome_toast', 'true');
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: {
        id: 'patient-1',
        email: 'patient@mail.wu.ac.th',
        role: 'patient',
        displayName: 'นายสมชาย ใจดี',
      },
      role: 'patient',
      isLoading: false,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    vi.mocked(reminderService.getPatientMedicalRecords).mockResolvedValue([]);
    vi.mocked(reminderService.getReminders).mockResolvedValue([]);

    render(<LoginToastListener />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/แจ้งเตือนยา: ไม่มีรายการยาที่ต้องทานในขณะนี้/)).toBeInTheDocument();
    });

    expect(sessionStorage.getItem('login_welcome_toast')).toBeNull();
  });

  it('does not render toast when user is not a patient', async () => {
    sessionStorage.setItem('login_welcome_toast', 'true');
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: {
        id: 'doctor-1',
        email: 'doctor@mail.wu.ac.th',
        role: 'medical',
        displayName: 'นพ. วิชัย มุ่งมั่น',
      },
      role: 'medical',
      isLoading: false,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    render(<LoginToastListener />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('login_welcome_toast')).toBeNull();
  });

  it('does not render toast when pending flag is not set', () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: {
        id: 'patient-1',
        email: 'patient@mail.wu.ac.th',
        role: 'patient',
        displayName: 'นายสมชาย ใจดี',
      },
      role: 'patient',
      isLoading: false,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    render(<LoginToastListener />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
