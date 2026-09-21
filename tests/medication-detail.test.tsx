import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MedicationDetailContent from '@/components/pharmacy/MedicationDetailContent';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-med-1', email: 'doctor@wu.ac.th' },
    role: 'medical',
    isLoading: false,
  }),
}));

const mockMedication = {
  id: 'med-paracetamol-1',
  name: 'Paracetamol',
  dosage: '500mg',
  brand_name: 'Sara',
  type: 'เม็ด',
  unit: 'เม็ด',
  pack_unit: 'กล่อง',
  pack_size: 100,
  category: 'ยาแก้ปวดลดไข้',
  coverage_type: 'covered' as const,
  manufacturer: 'องค์การเภสัชกรรม (GPO)',
  mfg_date: '2026-01-01',
  expiry_date: '2027-12-31',
  stock: 250,
  min_stock: 50,
  description: 'ยาบรรเทาอาการปวดศีรษะ เป็นไข้ตัวร้อน',
  ingredients: 'Paracetamol 500mg per tablet',
  is_active: true,
};

const mockLogs = [
  {
    id: 'log-1',
    medication_id: 'med-paracetamol-1',
    pharmacist_id: 'doc-1',
    action: 'dispense' as const,
    quantity: 10,
    reason: 'จ่ายยาตามใบสั่งแพทย์',
    created_at: '2026-09-15T10:30:00Z',
  },
  {
    id: 'log-2',
    medication_id: 'med-paracetamol-1',
    pharmacist_id: 'doc-1',
    action: 'add' as const,
    quantity: 200,
    reason: 'รับยาเข้าคลังรอบใหม่',
    created_at: '2026-09-01T09:00:00Z',
  },
];

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => {
          if (table === 'medications') {
            return {
              single: () => {
                if (val === 'med-paracetamol-1') {
                  return Promise.resolve({ data: mockMedication, error: null });
                }
                return Promise.resolve({ data: null, error: new Error('Medication not found') });
              },
            };
          }
          if (table === 'inventory_logs') {
            return {
              order: () => Promise.resolve({ data: mockLogs, error: null }),
            };
          }
          return {
            single: () => Promise.resolve({ data: null, error: null }),
            order: () => Promise.resolve({ data: [], error: null }),
          };
        },
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { ...mockMedication, stock: 300 }, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

describe('MedicationDetailContent Dynamic Route Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders medication full details and specifications correctly', async () => {
    render(<MedicationDetailContent medicationId="med-paracetamol-1" currentRole="medical" />);

    // Header items
    expect(await screen.findByRole('heading', { name: 'Paracetamol' })).toBeInTheDocument();
    expect(screen.getByText('500mg')).toBeInTheDocument();
    expect(screen.getByText('Sara')).toBeInTheDocument();
    expect(screen.getByText('พร้อมใช้งาน')).toBeInTheDocument();

    // Coverage banner
    expect(screen.getByText(/ยาในสิทธิ์ \(เบิกได้ตามสิทธิ์\)/)).toBeInTheDocument();
    expect(screen.getByText('In-formulary')).toBeInTheDocument();

    // Stock card
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('50 เม็ด')).toBeInTheDocument();
    expect(screen.getByText(/1 กล่อง = 100 เม็ด/)).toBeInTheDocument();

    // Specs
    expect(screen.getByText('องค์การเภสัชกรรม (GPO)')).toBeInTheDocument();
    expect(screen.getByText('ยาแก้ปวดลดไข้')).toBeInTheDocument();
    expect(screen.getByText('ยาบรรเทาอาการปวดศีรษะ เป็นไข้ตัวร้อน')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500mg per tablet')).toBeInTheDocument();

    // Back link
    const backLinks = screen.getAllByRole('link', { name: /กลับหน้ารายการยา/i });
    expect(backLinks.length).toBeGreaterThanOrEqual(1);
    expect(backLinks[0]).toHaveAttribute('href', '/pharmacy');
  });

  it('renders inventory history logs for the medication', async () => {
    render(<MedicationDetailContent medicationId="med-paracetamol-1" currentRole="medical" />);

    // Logs table content
    expect(await screen.findByText('จ่ายยาตามใบสั่งแพทย์')).toBeInTheDocument();
    expect(screen.getByText('รับยาเข้าคลังรอบใหม่')).toBeInTheDocument();
    expect(screen.getByText('10 เม็ด')).toBeInTheDocument();
    expect(screen.getByText('200 เม็ด')).toBeInTheDocument();
  });

  it('allows medical role to open edit modal and edit medication', async () => {
    render(<MedicationDetailContent medicationId="med-paracetamol-1" currentRole="medical" />);

    const editBtn = await screen.findByRole('button', { name: 'แก้ไขข้อมูลเวชภัณฑ์' });
    fireEvent.click(editBtn);

    // Edit modal should open
    expect(screen.getByRole('heading', { name: 'แก้ไขข้อมูลเวชภัณฑ์' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Paracetamol')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500mg')).toBeInTheDocument();
  });

  it('shows read-only locked status for staff_admin and admin roles', async () => {
    render(<MedicationDetailContent medicationId="med-paracetamol-1" currentRole="staff_admin" />);

    expect(await screen.findByText('ดูอย่างเดียว (ล็อค)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'แก้ไขข้อมูลเวชภัณฑ์' })).not.toBeInTheDocument();
  });

  it('displays not found error alert when medication does not exist', async () => {
    render(<MedicationDetailContent medicationId="non-existent-id" currentRole="medical" />);

    expect(await screen.findByText('ไม่พบข้อมูลเวชภัณฑ์')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'กลับสู่คลังยา' })).toHaveAttribute('href', '/pharmacy');
  });
});
