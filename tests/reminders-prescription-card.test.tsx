import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MedicationRemindersPage from '@/app/(patient)/reminders/page';

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'profile-stephen-strange', email: 'doctor@wu.ac.th' },
    role: 'medical',
    isLoading: false,
  }),
}));

vi.mock('@/services/reminderService', () => ({
  getAvailableMedications: vi.fn().mockResolvedValue([
    { id: 'med-paracetamol', name: 'Paracetamol 500mg', type: 'เม็ด', category: 'ยาสามัญ', stock: 50 },
    { id: 'med-amoxicillin', name: 'Amoxicillin 500mg', type: 'แคปซูล', category: 'ยาปฏิชีวนะ', stock: 30 },
  ]),
  getPatientMedicalRecords: vi.fn().mockResolvedValue([
    {
      id: 'record-peter',
      appointment_id: 'app-1',
      patient_id: 'profile-peter-parker',
      created_at: '2026-09-22T15:14:00.000Z',
      doctor: { id: 'doc-1', title: 'นพ.', first_name: 'สมชาย', last_name: 'ใจดี' },
      patient: { id: 'profile-peter-parker', title: 'นาย', first_name: 'Peter', last_name: 'Parker', phone: '081-111-2222', student_id: '66000001' },
      prescribed_medications: [
        { medication_id: 'med-paracetamol', name: 'Paracetamol 500mg', dosage: '1 เม็ด', frequency: 'วันละ 3 ครั้ง หลังอาหาร', quantity: 20 },
        { medication_id: 'med-amoxicillin', name: 'Amoxicillin 500mg', dosage: '1 แคปซูล', frequency: 'วันละ 2 ครั้ง ก่อนอาหาร', quantity: 14 },
      ],
    },
  ]),
  getReminders: vi.fn().mockResolvedValue([]),
  createReminder: vi.fn(),
  updateReminder: vi.fn(),
  deleteReminder: vi.fn(),
}));

vi.mock('@/services/authService', () => ({
  getPatients: vi.fn().mockResolvedValue([
    { id: 'profile-peter-parker', title: 'นาย', first_name: 'Peter', last_name: 'Parker', student_id: '66000001', phone: '081-111-2222', role: 'patient' },
  ]),
  getProfile: vi.fn().mockResolvedValue(null),
}));

describe('Reminders Page - Prescription Order Cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the prescription order card with "แจ้งกินยา" badge at the top right', async () => {
    render(<MedicationRemindersPage />);

    // Verify top-right badge is "แจ้งกินยา"
    await waitFor(() => {
      const badges = screen.getAllByText('แจ้งกินยา');
      expect(badges.length).toBeGreaterThan(0);
    });

    // Verify the prescription table header is rendered
    expect(screen.getByText(/รายการยาตามใบสั่ง/)).toBeDefined();

    // Verify 4 table column headers (สต็อกในคลัง has been removed)
    expect(screen.getByText('รายการยาและเวชภัณฑ์')).toBeDefined();
    expect(screen.getByText('ขนาดยาและวิธีใช้')).toBeDefined();
    expect(screen.getByText('จำนวนที่สั่ง')).toBeDefined();
    expect(screen.getByText('สถานะการจ่าย')).toBeDefined();
    expect(screen.queryByText('สต็อกในคลัง')).toBeNull();

    // Verify doctor-prescribed medications are displayed
    expect(screen.getByText('Paracetamol 500mg')).toBeDefined();
    expect(screen.getByText('Amoxicillin 500mg')).toBeDefined();

    // Verify footer status has been removed
    expect(screen.queryByText('จ่ายยาครบถ้วนแล้ว')).toBeNull();
    expect(screen.queryByText(/ตัดจ่ายแล้วเมื่อ/)).toBeNull();
  });
});
