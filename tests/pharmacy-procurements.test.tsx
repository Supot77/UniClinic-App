import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProcurementsTab from '@/components/pharmacy/ProcurementsTab';
import PharmacyContent from '@/components/pharmacy/PharmacyContent';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = { replace: mockReplace, push: mockPush, refresh: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-med-1', email: 'doctor@wu.ac.th' },
    role: 'medical',
    isLoading: false,
  }),
}));

const mockMedications = [
  {
    id: 'med-1',
    name: 'Paracetamol 500mg',
    dosage: '500mg',
    brand_name: 'Sara',
    manufacturer: 'GPO',
    coverage_type: 'covered' as const,
    type: 'เม็ด',
    category: 'ยาแก้ปวดลดไข้',
    unit: 'เม็ด',
    description: 'ลดไข้ บรรเทาปวด',
    stock: 100,
    min_stock: 30,
    mfg_date: '2026-01-01',
    expiry_date: '2027-12-31',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockProcurements = [
  {
    id: 'po-1',
    medication_id: 'med-1',
    medication_name: 'Paracetamol 500mg',
    order_number: 'PO-202609-001',
    supplier: 'บ. สหการแพทย์ จำกัด',
    package_breakdown: {
      crates: 1,
      boxes_per_crate: 10,
      strips_per_box: 10,
      units_per_strip: 10,
      package_type_note: '1 ลัง (10 กล่อง/ลัง, 10 แผง/กล่อง, 10 เม็ด/แผง)',
    },
    total_units: 1000,
    unit: 'เม็ด',
    status: 'pending' as const,
    ordered_at: '2026-09-24',
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
  },
];

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

describe('ProcurementsTab & Stock-in Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
    localStorage.clear();
    sessionStorage.clear();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'medication_procurements') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProcurements,
              error: null,
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'medications') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockMedications, error: null }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockMedications[0], error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockMedications[0], error: null }),
            }),
          }),
        };
      }
      if (table === 'inventory_logs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });
  });

  it('renders procurement tab with pending orders and summary cards', async () => {
    await act(async () => {
      render(
        <ProcurementsTab
          medications={mockMedications}
          canManage={true}
          isAdminOrStaff={false}
          userId="user-med-1"
          userName="นพ. กัญจน์"
          onRefresh={vi.fn()}
          onStockUpdated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );
    });

    expect(screen.getByText('ประวัติการสั่งซื้อและนำเข้ายา')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getAllByText('รอนำเข้าคลัง')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^นำเข้าคลังยา$/ })).toBeInTheDocument();
  });

  it('opens import modal with prefilled existing medication details when clicking "นำเข้าคลังยา"', async () => {
    await act(async () => {
      render(
        <ProcurementsTab
          medications={mockMedications}
          canManage={true}
          isAdminOrStaff={false}
          userId="user-med-1"
          userName="นพ. กัญจน์"
          onRefresh={vi.fn()}
          onStockUpdated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );
    });

    const importBtn = screen.getByRole('button', { name: /^นำเข้าคลังยา$/ });
    await act(async () => {
      fireEvent.click(importBtn);
    });

    // Modal should be open
    expect(screen.getByText('ตรวจรับและนำเข้าคลังยา')).toBeInTheDocument();
    // Auto-filled read-only details
    expect(screen.getByText('Auto-filled')).toBeInTheDocument();
    expect(screen.getByText('ยาแก้ปวดลดไข้')).toBeInTheDocument();
    expect(screen.getByText(/สต็อกคงเหลือปัจจุบัน:/)).toBeInTheDocument();
    expect(screen.getAllByText('100 เม็ด')[0]).toBeInTheDocument();

    // Check action button
    expect(screen.getByRole('button', { name: /ยืนยันนำเข้าคลังยา/ })).toBeInTheDocument();
  });

  it('allows switching to procurements tab from PharmacyContent', async () => {
    await act(async () => {
      render(
        <PharmacyContent
          initialTab="procurements"
          currentRole="medical"
          userId="user-med-1"
        />
      );
    });

    expect(screen.getByText('ประวัติสั่งซื้อและนำเข้ายา')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^สั่งยาเพิ่ม$/ })[0]).toBeInTheDocument();
  });

  it('creates a new procurement order with valid UUID and displays it immediately', async () => {
    let insertedPayload: Record<string, unknown> | null = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'medication_procurements') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
          insert: vi.fn().mockImplementation((payload) => {
            insertedPayload = payload;
            return Promise.resolve({ error: null });
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    await act(async () => {
      render(
        <ProcurementsTab
          medications={mockMedications}
          canManage={true}
          isAdminOrStaff={false}
          userId="a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
          userName="นพ. กัญจน์"
          onRefresh={vi.fn()}
          onStockUpdated={vi.fn()}
          onShowToast={vi.fn()}
          isAddModalOpen={true}
          onCloseAddModal={vi.fn()}
        />
      );
    });

    expect(screen.getByText('สั่งยาเพิ่ม / บันทึกการสั่งซื้อ')).toBeInTheDocument();

    const medSelect = screen.getByDisplayValue(/-- เลือกยาจากคลัง/i);
    fireEvent.change(medSelect, { target: { value: 'med-1' } });

    const crateInput = screen.getByPlaceholderText('เช่น 1');
    fireEvent.change(crateInput, { target: { value: '2' } });

    const submitBtn = screen.getByRole('button', { name: /บันทึกคำสั่งซื้อ/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(insertedPayload).not.toBeNull();
    const insertedItem = insertedPayload as unknown as Record<string, unknown>;
    expect(insertedItem).toBeDefined();
    expect(insertedItem.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(insertedItem.total_units).toBeGreaterThan(0);
  });

  it('renders edit and delete buttons for orders and triggers delete confirmation modal', async () => {
    let deletedId: string | null = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'medication_procurements') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProcurements,
              error: null,
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((_field: string, val: string) => {
              deletedId = val;
              return { eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ id: val }], error: null }) }) };
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    await act(async () => {
      render(
        <ProcurementsTab
          medications={mockMedications}
          canManage={true}
          isAdminOrStaff={false}
          userId="user-med-1"
          userName="นพ. กัญจน์"
          onRefresh={vi.fn()}
          onStockUpdated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );
    });

    const editBtn = screen.getByRole('button', { name: /^แก้ไข$/ });
    const deleteBtn = screen.getByRole('button', { name: /^ลบ$/ });
    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();

    // Click delete
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(screen.getByText('ยืนยันการลบคำสั่งซื้อ')).toBeInTheDocument();
    const confirmDeleteBtn = screen.getByRole('button', { name: /^ลบคำสั่งซื้อ$/ });

    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });

    expect(deletedId).toBe('po-1');
  });

  it('opens edit modal and updates procurement order', async () => {
    let updatedPayload: Record<string, unknown> | null = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'medication_procurements') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProcurements,
              error: null,
            }),
          }),
          update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            updatedPayload = payload;
            return {
              eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ id: 'po-1' }], error: null }) }) }),
            };
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    await act(async () => {
      render(
        <ProcurementsTab
          medications={mockMedications}
          canManage={true}
          isAdminOrStaff={false}
          userId="user-med-1"
          userName="นพ. กัญจน์"
          onRefresh={vi.fn()}
          onStockUpdated={vi.fn()}
          onShowToast={vi.fn()}
        />
      );
    });

    const editBtn = screen.getByRole('button', { name: /^แก้ไข$/ });
    await act(async () => {
      fireEvent.click(editBtn);
    });

    expect(screen.getByText('แก้ไขข้อมูลคำสั่งซื้อยา')).toBeInTheDocument();
    const saveEditBtn = screen.getByRole('button', { name: /^บันทึกการแก้ไข$/ });

    await act(async () => {
      fireEvent.click(saveEditBtn);
    });

    expect(updatedPayload).not.toBeNull();
    expect((updatedPayload as unknown as { medication_name: string })?.medication_name).toBe('Paracetamol 500mg');
  });

  it.each(['merge', 'new_item'])('receives %s through one atomic RPC', async (mode) => {
    await act(async () => {
      render(<ProcurementsTab medications={mockMedications} canManage isAdminOrStaff={false}
        onRefresh={vi.fn()} onStockUpdated={vi.fn()} onShowToast={vi.fn()} />);
    });
    fireEvent.click(screen.getByRole('button', { name: /^นำเข้าคลังยา$/ }));
    if (mode === 'new_item') fireEvent.click(screen.getByRole('button', { name: /แยกเป็นรายการยาใหม่/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ยืนยันนำเข้าคลังยา/ }));
    });
    expect(mockRpc).toHaveBeenCalledExactlyOnceWith('receive_medication_procurement', expect.objectContaining({
      p_procurement_id: 'po-1', p_quantity: 1000,
      p_medication_id: mode === 'merge' ? 'med-1' : null,
      p_new_medication: mode === 'merge' ? null : expect.objectContaining({ name: 'Paracetamol 500mg' }),
    }));
    expect(mockFrom.mock.calls.filter(([table]) => table !== 'medication_procurements')).toEqual([]);
  });

  it('keeps the receipt modal open and shows RPC errors without a success toast', async () => {
    const toast = vi.fn();
    mockRpc.mockResolvedValue({ error: { message: 'รับเข้าซ้ำไม่ได้' } });
    await act(async () => {
      render(<ProcurementsTab medications={mockMedications} canManage isAdminOrStaff={false}
        onRefresh={vi.fn()} onStockUpdated={vi.fn()} onShowToast={toast} />);
    });
    fireEvent.click(screen.getByRole('button', { name: /^นำเข้าคลังยา$/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ยืนยันนำเข้าคลังยา/ }));
    });
    expect(screen.getByText('รับเข้าซ้ำไม่ได้')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    expect(screen.getByText('ตรวจรับและนำเข้าคลังยา')).toBeInTheDocument();
  });

  it('preserves loose units when editing an older order with mixed packaging', async () => {
    const update = vi.fn().mockReturnValue({ eq: () => ({ eq: () => ({ select: async () => ({ data: [{ id: 'po-1' }], error: null }) }) }) });
    mockFrom.mockReturnValue({
      select: () => ({ order: async () => ({ data: [{ ...mockProcurements[0], total_units: 1007 }], error: null }) }), update,
    });
    await act(async () => {
      render(<ProcurementsTab medications={mockMedications} canManage isAdminOrStaff={false}
        onRefresh={vi.fn()} onStockUpdated={vi.fn()} onShowToast={vi.fn()} />);
    });
    fireEvent.click(screen.getByRole('button', { name: /^แก้ไข$/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^บันทึกการแก้ไข$/ })); });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ total_units: 1007, package_breakdown: expect.objectContaining({ units: 7 }) }));
  });
});
