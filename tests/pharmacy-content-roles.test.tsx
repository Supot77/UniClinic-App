import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PharmacyContent from '@/components/pharmacy/PharmacyContent';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
const mockRouter = { replace: mockReplace, push: mockPush, refresh: mockRefresh };

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
    name: 'Paracetamol',
    dosage: '500mg',
    brand_name: 'Sara',
    manufacturer: 'องค์การเภสัชกรรม (GPO)',
    coverage_type: 'covered' as const,
    type: 'เม็ด',
    category: 'ยาแก้ปวดลดไข้',
    unit: 'เม็ด',
    description: 'ยาบรรเทาอาการปวดศีรษะ เป็นไข้',
    stock: 50,
    min_stock: 20,
    mfg_date: '2026-01-01',
    expiry_date: '2027-12-31',
    is_active: true,
  },
  {
    id: 'med-2',
    name: 'Amoxicillin',
    dosage: '1000mg',
    brand_name: 'Amoxil',
    manufacturer: 'GlaxoSmithKline',
    coverage_type: 'non_covered' as const,
    type: 'แคปซูล',
    unit: 'แคปซูล',
    category: 'ยาปฏิชีวนะ',
    stock: 10,
    min_stock: 15,
    mfg_date: '2026-02-01',
    expiry_date: '2027-06-30',
    is_active: true,
  },
];

const mockMedicalRecords = [
  {
    id: 'rec-1',
    appointment_id: 'apt-1',
    patient_id: 'pat-1',
    doctor_id: 'doc-1',
    diagnosis: 'ไข้หวัดทั่วไป มีไข้สูง',
    treatment_notes: 'พักผ่อน ดื่มน้ำมากๆ',
    prescribed_medications: [
      {
        medication_id: 'med-1',
        name: 'Paracetamol 500mg',
        dosage: '1 เม็ด',
        frequency: 'หลังอาหาร เช้า-เย็น',
        duration_days: 3,
        quantity: 6,
      },
    ],
    created_at: '2026-09-13T10:00:00Z',
  },
  {
    id: 'rec-2',
    appointment_id: 'apt-2',
    patient_id: 'pat-2',
    doctor_id: 'doc-1',
    diagnosis: 'ปวดท้องโรคกระเพาะ',
    treatment_notes: 'รับประทานยาตรงเวลา',
    prescribed_medications: [
      {
        medication_id: 'med-2',
        name: 'Amoxicillin 500mg',
        dosage: '1 เม็ด',
        frequency: 'ก่อนอาหาร เช้า-เย็น',
        duration_days: 5,
        quantity: 10,
        dispensed: true,
        dispensed_at: '2026-09-13T11:00:00Z',
        dispensed_by: 'doc-1',
      },
    ],
    created_at: '2026-09-13T09:00:00Z',
  },
];

const mockProfiles = [
  {
    id: 'pat-1',
    title: 'นาย',
    first_name: 'สมศักดิ์',
    last_name: 'รักเรียน',
    student_id: '65123456',
    phone: '0812345678',
    role: 'patient',
  },
  {
    id: 'pat-2',
    title: 'นางสาว',
    first_name: 'อารียา',
    last_name: 'สุขใจ',
    student_id: '65123999',
    phone: '0898765432',
    role: 'patient',
  },
  {
    id: 'doc-1',
    title: null,
    first_name: 'นพ.',
    last_name: 'วิชัย เก่งการุณ',
    role: 'medical',
  },
];

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-med-1' } }, error: null }),
    },
    from: (table: string) => ({
      select: () => {
        const queryObj = {
          order: () => {
            if (table === 'medications') {
              return Promise.resolve({ data: mockMedications, error: null });
            }
            if (table === 'medical_records') {
              return Promise.resolve({ data: mockMedicalRecords, error: null });
            }
            return Promise.resolve({ data: [], error: null });
          },
          in: (_col: string, ids: string[]) => {
            if (table === 'profiles') {
              const matched = mockProfiles.filter((p) => ids.includes(p.id));
              return Promise.resolve({ data: matched, error: null });
            }
            return Promise.resolve({ data: [], error: null });
          },
          eq: () => Promise.resolve({ data: [], error: null }),
        };
        return queryObj;
      },
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
}));

describe('PharmacyContent Role Permissions & Lock Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/pharmacy');
    }
  });

  it('shows locked add button and read-only status for admin role', async () => {
    render(<PharmacyContent currentRole="admin" userName="แอดมิน สมบัติ" />);

    expect(screen.queryByText('WU CLINIC / PHARMACY')).not.toBeInTheDocument();
    expect(screen.queryByText(/สิทธิ์: ผู้ดูแลระบบ · ดูอย่างเดียว/)).not.toBeInTheDocument();

    // Check read-only banner
    expect(screen.getByText(/โหมดดูอย่างเดียว/)).toBeInTheDocument();

    // Check locked add button
    const lockedAddButton = screen.getByText('เพิ่มรายการยา (ดูอย่างเดียว)');
    expect(lockedAddButton).toBeInTheDocument();
    expect(lockedAddButton.parentElement).toHaveClass('bg-brand-surface', 'text-brand-muted');

    // Check table row has read-only lock
    const lockedRows = await screen.findAllByText('ดูอย่างเดียว');
    expect(lockedRows.length).toBeGreaterThan(0);
  });

  it('shows locked add button and read-only status for staff_admin role', async () => {
    render(<PharmacyContent currentRole="staff_admin" userName="เจ้าหน้าที่ สมใจ" />);

    expect(screen.queryByText(/สิทธิ์: เจ้าหน้าที่คลินิก · ดูอย่างเดียว/)).not.toBeInTheDocument();
    expect(screen.getByText('เพิ่มรายการยา (ดูอย่างเดียว)')).toBeInTheDocument();
    const lockedRows = await screen.findAllByText('ดูอย่างเดียว');
    expect(lockedRows.length).toBeGreaterThan(0);
  });

  it('shows active add button and manage actions for medical role', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    expect(screen.queryByText(/สิทธิ์: บุคลากรทางการแพทย์ · จัดการยาได้/)).not.toBeInTheDocument();
    const addMedicationButton = screen.getByRole('button', { name: 'เพิ่มรายการยา' });
    expect(addMedicationButton).toHaveClass('bg-brand-strong', 'hover:bg-brand-hover');
    expect(screen.queryByText('เพิ่มรายการยา (ดูอย่างเดียว)')).not.toBeInTheDocument();

    // Active edit and delete buttons should exist
    const editButtons = await screen.findAllByTitle('แก้ไขข้อมูล');
    expect(editButtons.length).toBeGreaterThan(0);
    expect(editButtons[0]).toHaveClass('hover:bg-brand-soft', 'hover:text-brand-strong');
    const deleteButtons = screen.getAllByTitle('ลบหรือพักใช้งานรายการนี้');
    expect(deleteButtons.length).toBeGreaterThan(0);
    expect(deleteButtons[0]).toHaveClass('hover:bg-status-critical-bg', 'hover:text-status-critical');
  });

  it('switches to prescriptions tab and displays prescription details', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    // Click on prescriptions tab
    const prescriptionsTab = screen.getByRole('button', {
      name: /ใบสั่งยาและการตัดจ่าย/,
    });
    expect(prescriptionsTab).toBeInTheDocument();
    fireEvent.click(prescriptionsTab);

    // Verify patient name and doctor name are shown
    expect(await screen.findByText('นาย สมศักดิ์ รักเรียน')).toBeInTheDocument();
    expect(screen.getByText('65123456')).toBeInTheDocument();
    expect(screen.getAllByText('นพ. วิชัย เก่งการุณ').length).toBeGreaterThan(0);
    expect(screen.queryByText(/ผลวินิจฉัย:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/คำแนะนำ:/)).not.toBeInTheDocument();
    // Verify medication details and stock status
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.getAllByText('พร้อมจ่าย').length).toBeGreaterThan(0);

    // Role medical should see active dispense button
    expect(screen.getByRole('button', { name: /จ่ายยาและตัดสต็อก/ })).toBeInTheDocument();
  });

  it('shows locked dispense button in prescriptions tab for admin role', async () => {
    render(<PharmacyContent currentRole="admin" userName="แอดมิน สมบัติ" />);

    const prescriptionsTab = screen.getByRole('button', {
      name: /ใบสั่งยาและการตัดจ่าย/,
    });
    fireEvent.click(prescriptionsTab);

    expect(await screen.findByText('นาย สมศักดิ์ รักเรียน')).toBeInTheDocument();

    // Role admin should see locked dispense indicator
    expect(screen.getByText('ดูอย่างเดียว')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'จ่ายยาและตัดสต็อก' })).not.toBeInTheDocument();
  });

  it('shows locked dispense button in prescriptions tab for staff_admin role', async () => {
    render(<PharmacyContent currentRole="staff_admin" userName="เจ้าหน้าที่ สมใจ" />);

    const prescriptionsTab = screen.getByRole('button', {
      name: /ใบสั่งยาและการตัดจ่าย/,
    });
    fireEvent.click(prescriptionsTab);

    expect(await screen.findByText('นาย สมศักดิ์ รักเรียน')).toBeInTheDocument();

    // Role staff_admin should see locked dispense indicator
    expect(screen.getByText('ดูอย่างเดียว')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'จ่ายยาและตัดสต็อก' })).not.toBeInTheDocument();
  });

  it('displays dispensed badge and disabled action for already dispensed prescriptions', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    const prescriptionsTab = screen.getByRole('button', {
      name: /ใบสั่งยาและการตัดจ่าย/,
    });
    fireEvent.click(prescriptionsTab);

    // Wait for prescriptions to load
    expect(await screen.findByText('Amoxicillin 500mg')).toBeInTheDocument();

    // The dispensed prescription (rec-2) should show "จ่ายยาครบถ้วนแล้ว"
    expect(screen.getByText('จ่ายยาครบถ้วนแล้ว')).toBeInTheDocument();
    expect(screen.getAllByText('ตัดสต็อกแล้ว').length).toBeGreaterThan(0);
  });

  it('opens confirmation modal when clicking dispense and handles confirm', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    const prescriptionsTab = screen.getByRole('button', {
      name: /ใบสั่งยาและการตัดจ่าย/,
    });
    fireEvent.click(prescriptionsTab);

    expect(await screen.findByText('Paracetamol 500mg')).toBeInTheDocument();

    const dispenseBtn = screen.getByRole('button', { name: /จ่ายยาและตัดสต็อก/ });
    fireEvent.click(dispenseBtn);

    // Confirmation modal should open
    expect(screen.getByRole('heading', { name: 'ยืนยันการจ่ายยา' })).toBeInTheDocument();
    expect(screen.getByText('รายการยาที่จะจ่าย')).toBeInTheDocument();
    expect(screen.getByText('คงเหลือหลังจ่าย')).toBeInTheDocument();

    // Checkbox to skip stock deduction should be present
    const skipCheckbox = screen.getByLabelText(/บันทึกว่าจ่ายแล้วโดยไม่ตัดสต็อกซ้ำ/);
    expect(skipCheckbox).toBeInTheDocument();
    expect(skipCheckbox).not.toBeChecked();
    fireEvent.click(skipCheckbox);
    expect(skipCheckbox).toBeChecked();

    // Click confirm button
    // Click confirm button directly without checkbox
    const confirmBtn = screen.getByRole('button', { name: /ยืนยันการจ่ายยา/ });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });
  });

  it('displays concise medication attributes (name, dosage, coverage, description) in inventory table without clutter', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    // Check dosage badges
    expect(await screen.findByText('500mg')).toBeInTheDocument();
    expect(screen.getByText('1000mg')).toBeInTheDocument();

    // Description is displayed in table
    expect(screen.getByText(/ยาบรรเทาอาการปวดศีรษะ/)).toBeInTheDocument();

    // Brand and manufacturer are NOT shown directly in table row (clean display)
    expect(screen.queryByText('Sara')).not.toBeInTheDocument();
    expect(screen.queryByText(/ผลิตโดย: องค์การเภสัชกรรม/)).not.toBeInTheDocument();

    // Check coverage badges
    expect(screen.getByText('ยาในสิทธิ์ (เบิกได้)')).toBeInTheDocument();
    expect(screen.getByText('ยานอกสิทธิ์ (จ่ายนอก)')).toBeInTheDocument();
  });

  it('filters medications by coverage type (covered vs non_covered)', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    // Wait for medications to load
    expect(await screen.findByText('Paracetamol')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument();

    // Find coverage select dropdown
    const coverageSelect = screen.getByDisplayValue('ทุกสิทธิ์การเบิกจ่าย');
    expect(coverageSelect).toBeInTheDocument();

    // Filter by "covered" (ยาในสิทธิ์)
    fireEvent.change(coverageSelect, { target: { value: 'covered' } });
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    expect(screen.queryByText('Amoxicillin')).not.toBeInTheDocument();

    // Filter by "non_covered" (ยานอกสิทธิ์)
    fireEvent.change(coverageSelect, { target: { value: 'non_covered' } });
    expect(screen.queryByText('Paracetamol')).not.toBeInTheDocument();
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
  });

  it('opens add medication modal with dosage, brand, form dropdown, coverage options and manufacturer fields', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    const addBtn = await screen.findByText('เพิ่มรายการยา');
    fireEvent.click(addBtn);

    // Modal title
    expect(screen.getByRole('heading', { name: 'เพิ่มรายการยา' })).toBeInTheDocument();

    // Fields should exist
    expect(screen.getByPlaceholderText(/เช่น 1000mg, 250mg/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/เช่น Sara, Tylenol/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/เช่น องค์การเภสัชกรรม/)).toBeInTheDocument();

    // Coverage radio options
    expect(screen.getByLabelText(/ยาตามสิทธิ์การรักษา หรืออยู่ในบัญชียาหลักแห่งชาติ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ยานอกบัญชียาหลัก หรือยานำเข้า\/ยาทางเลือกพิเศษ/)).toBeInTheDocument();
  });

  it('opens medication details popup modal when clicking medication card/row and closes properly', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    // Click on Paracetamol row / card
    const medText = await screen.findByText('Paracetamol');
    const medRow = medText.closest('tr');
    expect(medRow).not.toBeNull();
    fireEvent.click(medRow!);

    // Should navigate to dynamic route
    // Modal should be visible with title and details (brand, manufacturer, dosage, ingredients, stock)
    expect(screen.getByText('รายละเอียดยาและเวชภัณฑ์')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Paracetamol' })).toBeInTheDocument();
    expect(screen.getByText('Sara')).toBeInTheDocument();
    expect(screen.getAllByText('500mg').length).toBeGreaterThan(0);
    expect(screen.getByText('องค์การเภสัชกรรม (GPO)')).toBeInTheDocument();
    expect(screen.getAllByText('สต็อกคงเหลือ').length).toBeGreaterThan(0);

    // Check full page button navigates to dynamic route
    const fullPageBtn = screen.getByRole('button', { name: /ดูรายละเอียดเต็มหน้า/i });
    fireEvent.click(fullPageBtn);
    expect(mockPush).toHaveBeenCalledWith('/pharmacy/medications/med-1');

    // Close the modal
    const closeBtn = screen.getAllByRole('button', { name: 'ปิดหน้าต่าง' })[0];
    fireEvent.click(closeBtn);

    // Modal should be closed
    expect(screen.queryByText('รายละเอียดยาและเวชภัณฑ์')).not.toBeInTheDocument();
  });

  it('closes medication details popup modal when clicking outside (on backdrop) or pressing Escape', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    const medText = await screen.findByText('Paracetamol');
    const medRow = medText.closest('tr');
    expect(medRow).not.toBeNull();

    // Open popup via keyboard Enter
    fireEvent.keyDown(medRow!, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('รายละเอียดยาและเวชภัณฑ์')).toBeInTheDocument();

    // Close on backdrop click
    const backdrop = screen.getByTestId('medication-details-backdrop');
    fireEvent.click(backdrop);
    expect(screen.queryByText('รายละเอียดยาและเวชภัณฑ์')).not.toBeInTheDocument();

    // Clicking view button in the same row opens popup
    const viewButton = medRow!.querySelector('button[title="ดูรายละเอียดรายการนี้"]');
    expect(viewButton).not.toBeNull();
    fireEvent.click(viewButton!);
    expect(screen.getByText('รายละเอียดยาและเวชภัณฑ์')).toBeInTheDocument();

    // Close with Escape key
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByText('รายละเอียดยาและเวชภัณฑ์')).not.toBeInTheDocument();
  });

  it('calculates stock from packaging (packages x items) and applies it to stock input', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    const addBtn = await screen.findByText('เพิ่มรายการยา');
    fireEvent.click(addBtn);

    // Open packaging calculator
    const calcToggle = screen.getByRole('button', { name: /เปิดตัวช่วยคำนวณ/i });
    fireEvent.click(calcToggle);

    // Inputs for packaging
    const packCountInput = screen.getByPlaceholderText('เช่น 5');
    const itemsPerPackInput = screen.getByPlaceholderText(/เช่น 100 หรือ 1000/);

    fireEvent.change(packCountInput, { target: { value: '5' } });
    fireEvent.change(itemsPerPackInput, { target: { value: '100' } });

    // Result should show 500
    // Click apply button
    const applyBtn = screen.getByRole('button', { name: 'ใช้เป็นสต็อกปัจจุบัน' });
    fireEvent.click(applyBtn);

    // Stock input should now have 500
    const stockInput = screen.getByDisplayValue('500');
    expect(stockInput).toBeInTheDocument();
  });

  it('highlights selected status filter card and dims unselected cards', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    // By default "รายการทั้งหมด" is selected
    const allBtn = screen.getByRole('button', { name: /รายการทั้งหมด/i });
    expect(allBtn).toHaveAttribute('aria-pressed', 'true');
    expect(allBtn.className).toContain('opacity-100');

    // Click "มีเพียงพอ"
    const sufficientBtn = screen.getByRole('button', { name: /มีเพียงพอ/i });
    await act(async () => {
      fireEvent.click(sufficientBtn);
    });

    expect(sufficientBtn).toHaveAttribute('aria-pressed', 'true');
    expect(sufficientBtn.className).toContain('opacity-100');
    expect(sufficientBtn.className).toContain('border-brand-strong');

    // "รายการทั้งหมด" is now unselected and dimmed
    expect(allBtn).toHaveAttribute('aria-pressed', 'false');
    expect(allBtn.className).toContain('opacity-40');
  });

  it('restores draft in Add Medication modal from localStorage and allows clearing', async () => {
    // Pre-populate draft in localStorage
    const savedDraft = {
      name: 'Ibuprofen 400mg',
      dosage: '400mg',
      category: 'ยาแก้ปวดลดการอักเสบ',
      type: 'เม็ด',
      unit: 'เม็ด',
      coverage_type: 'covered',
    };
    localStorage.setItem('clinic_pharmacy_add_draft', JSON.stringify(savedDraft));

    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    const addBtn = await screen.findByText('เพิ่มรายการยา');
    await act(async () => {
      fireEvent.click(addBtn);
    });

    // Modal should display restored banner and restored values
    expect(screen.getByText(/กู้คืนแบบร่างที่บันทึกไว้แล้ว/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ibuprofen 400mg')).toBeInTheDocument();

    // Click clear draft
    const clearBtn = screen.getByText('ล้างแบบร่าง');
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    expect(screen.queryByText(/กู้คืนแบบร่างที่บันทึกไว้แล้ว/)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Ibuprofen 400mg')).not.toBeInTheDocument();

    localStorage.removeItem('clinic_pharmacy_add_draft');
  });

  it('persists viewing modal in localStorage and restores on page reload', async () => {
    // Simulate active modal saved in localStorage prior to page refresh
    localStorage.setItem('clinic_pharmacy_active_med_id', 'med-1');

    const { unmount } = render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    // Details modal should automatically restore and show medication details
    expect(await screen.findByText('รายละเอียดยาและเวชภัณฑ์')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Paracetamol' })).toBeInTheDocument();

    // Close the modal
    const closeBtn = screen.getAllByRole('button', { name: 'ปิดหน้าต่าง' })[0];
    fireEvent.click(closeBtn);

    expect(screen.queryByText('รายละเอียดยาและเวชภัณฑ์')).not.toBeInTheDocument();
    expect(localStorage.getItem('clinic_pharmacy_active_med_id')).toBeNull();

    unmount();
  });

  it('highlights selected prescription summary stat card and dims unselected cards', async () => {
    render(<PharmacyContent currentRole="medical" userName="นพ. สมชาย" />);

    // Switch to Prescriptions tab
    const prescriptionsTab = screen.getByRole('button', {
      name: /ใบสั่งยาและการตัดจ่าย/,
    });
    fireEvent.click(prescriptionsTab);

    // Initial state: "ใบสั่งยาทั้งหมด" is selected
    const allBtn = await screen.findByRole('button', { name: /ใบสั่งยาทั้งหมด/i });
    expect(allBtn).toHaveAttribute('aria-pressed', 'true');
    expect(allBtn.className).toContain('opacity-100');

    // Click "รอตัดจ่ายยา"
    const pendingBtn = screen.getByRole('button', { name: /รอตัดจ่ายยา/i });
    await act(async () => {
      fireEvent.click(pendingBtn);
    });

    expect(pendingBtn).toHaveAttribute('aria-pressed', 'true');
    expect(pendingBtn.className).toContain('opacity-100');
    expect(pendingBtn.className).toContain('border-brand-strong');

    // "ใบสั่งยาทั้งหมด" is now unselected and dimmed
    expect(allBtn).toHaveAttribute('aria-pressed', 'false');
    expect(allBtn.className).toContain('opacity-40');
  });

  it('respects initialStatus and initialSort and preserves them in sessionStorage and URL on dispense', async () => {
    render(
      <PharmacyContent
        currentRole="medical"
        userName="นพ. สมชาย"
        initialTab="prescriptions"
        initialStatus="pending"
        initialSort="oldest"
      />
    );

    // "รอตัดจ่ายยา" should be selected initially
    const pendingBtn = await screen.findByRole('button', { name: /รอตัดจ่ายยา/i });
    expect(pendingBtn).toHaveAttribute('aria-pressed', 'true');

    // Wait for prescription order data to load
    expect(await screen.findByText('นาย สมศักดิ์ รักเรียน')).toBeInTheDocument();

    // Click dispense button on pending order
    const dispenseBtn = screen.getByRole('button', { name: /จ่ายยาและตัดสต็อก/ });
    fireEvent.click(dispenseBtn);

    // Confirm dispense modal
    const confirmBtn = await screen.findByRole('button', { name: /ยืนยันการจ่ายยา/ });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // Verify sessionStorage retains active filter and sort
    expect(sessionStorage.getItem('clinic_prescription_status_filter')).toBe('pending');
    expect(sessionStorage.getItem('clinic_prescription_sort_by')).toBe('oldest');
    expect(window.location.search).toContain('status=pending');
    expect(window.location.search).toContain('sort=oldest');
  });

  it('shows revoke button for dispensed prescription and handles confirmation modal for medical role', async () => {
    render(
      <PharmacyContent
        currentRole="medical"
        userName="นพ. สมชาย"
        initialTab="prescriptions"
        initialStatus="dispensed"
      />
    );

    // Verify dispensed patient is visible
    expect(await screen.findByText('นางสาว อารียา สุขใจ')).toBeInTheDocument();
    expect(screen.getByText('จ่ายยาครบถ้วนแล้ว')).toBeInTheDocument();

    // Revoke button should exist for medical role
    const revokeBtn = screen.getByRole('button', { name: /ยกเลิก\/คืนสต็อก/i });
    expect(revokeBtn).toBeInTheDocument();
    fireEvent.click(revokeBtn);

    // Revoke confirmation modal should open
    expect(screen.getByText('ยืนยันยกเลิกการตัดจ่ายยา (คืนสต็อก)')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();

    // Confirm revoke
    const confirmRevokeBtn = screen.getByRole('button', { name: /ยืนยันยกเลิกและคืนสต็อก/i });
    await act(async () => {
      fireEvent.click(confirmRevokeBtn);
    });

    // Modal should close
    expect(screen.queryByText('ยืนยันยกเลิกการตัดจ่ายยา (คืนสต็อก)')).not.toBeInTheDocument();
  });

  it('does not show revoke button for dispensed prescription for admin role', async () => {
    render(
      <PharmacyContent
        currentRole="admin"
        userName="แอดมิน สมบัติ"
        initialTab="prescriptions"
        initialStatus="dispensed"
      />
    );

    // Verify dispensed patient is visible
    expect(await screen.findByText('นางสาว อารียา สุขใจ')).toBeInTheDocument();
    expect(screen.getByText('จ่ายยาครบถ้วนแล้ว')).toBeInTheDocument();

    // Revoke button should NOT exist for admin role (read-only)
    expect(screen.queryByRole('button', { name: /ยกเลิก\/คืนสต็อก/i })).not.toBeInTheDocument();
  });
});



