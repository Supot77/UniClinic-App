import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DepartmentWorkspace from '@/components/schedules/DepartmentWorkspace';
import type { DoctorLeave, ScheduleDepartment, ScheduleDoctor, ScheduleSlot } from '@/types/schedule';

const scheduling = vi.hoisted(() => ({
  departments: [] as ScheduleDepartment[],
  doctors: [] as ScheduleDoctor[],
  slots: [] as ScheduleSlot[],
  doctorLeaves: [] as DoctorLeave[],
  doctorAccounts: [] as { profileId: string; fullName: string; email: string; initials: string }[],
  isLoading: false,
  saveDepartment: vi.fn(),
  toggleDepartment: vi.fn(),
  saveDoctor: vi.fn(),
  toggleDoctor: vi.fn(),
  deleteDoctorLeave: vi.fn(),
}));

vi.mock('@/features/scheduling/context/SchedulingProvider', () => ({ useScheduling: () => scheduling }));

describe('Department and doctor workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scheduling.isLoading = false;
    scheduling.slots = [];
    scheduling.doctorLeaves = [];
    scheduling.departments = [
      { id: 'general', name: 'เวชปฏิบัติทั่วไป', description: 'ตรวจอาการทั่วไป', isActive: true },
      { id: 'physio', name: 'กายภาพบำบัด', description: '', isActive: true },
      { id: 'inactive', name: 'แผนกที่ปิด', description: '', isActive: false },
    ];
    scheduling.doctors = [
      { id: 'doctor-1', profileId: 'profile-1', fullName: 'นพ. สมชาย ใจดี', email: 'doctor1@example.test', initials: 'SJ', specialty: 'เวชศาสตร์ครอบครัว', departmentId: 'general', availability: 'active', hasHistory: true },
      { id: 'doctor-2', profileId: 'profile-2', fullName: 'พญ. สมใจ ใจดี', email: 'doctor2@example.test', initials: 'SI', specialty: 'เวชศาสตร์ฟื้นฟู', departmentId: 'physio', availability: 'on_leave', hasHistory: true },
      { id: 'doctor-3', profileId: 'profile-3', fullName: 'นพ. หยุดตรวจ', email: '', initials: 'HT', specialty: '', departmentId: 'general', availability: 'inactive', hasHistory: true },
    ];
    scheduling.doctorAccounts = [
      { profileId: 'profile-1', fullName: 'นพ. สมชาย ใจดี', email: 'doctor1@example.test', initials: 'SJ' },
      { profileId: 'new-profile', fullName: 'พญ. แพทย์ใหม่', email: 'new@example.test', initials: 'PN' },
    ];
  });

  afterEach(() => vi.restoreAllMocks());

  it('searches departments and includes inactive entries only when requested', () => {
    render(<DepartmentWorkspace />);
    expect(screen.queryByRole('heading', { name: 'แผนกที่ปิด' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'ค้นหาแผนก' }), { target: { value: 'อาการทั่วไป' } });
    expect(screen.getByRole('heading', { name: 'เวชปฏิบัติทั่วไป' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'กายภาพบำบัด' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'ค้นหาแผนก' }), { target: { value: 'แผนกที่ปิด' } });
    expect(screen.getByRole('heading', { name: 'ไม่พบแผนก' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'แสดงรายการที่ปิดใช้งาน' }));
    expect(screen.getByRole('heading', { name: 'แผนกที่ปิด' })).toBeInTheDocument();
  });

  it('switches tabs by keyboard and filters doctors by department and specialty', () => {
    render(<DepartmentWorkspace />);
    const departmentsTab = screen.getByRole('tab', { name: /^แผนก/ });
    departmentsTab.focus();
    fireEvent.keyDown(departmentsTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /^แพทย์/ })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /^แพทย์/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.change(screen.getByRole('combobox', { name: 'แผนก' }), { target: { value: 'physio' } });
    expect(screen.getByRole('heading', { name: 'พญ. สมใจ ใจดี' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'นพ. สมชาย ใจดี' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'ค้นหาแพทย์' }), { target: { value: 'เวชศาสตร์ฟื้นฟู' } });
    expect(screen.getByText('ลาตรวจ')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'ค้นหาแพทย์' }), { target: { value: 'ไม่ตรงกับแพทย์' } });
    expect(screen.getByRole('heading', { name: 'ไม่พบแพทย์' })).toBeInTheDocument();
  });

  it('includes a patient management tab in the departments workspace', () => {
    render(<DepartmentWorkspace />);

    const patientsTab = screen.getByRole('tab', { name: 'ผู้ป่วย' });
    expect(patientsTab).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(patientsTab);

    expect(patientsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'รายชื่อผู้ป่วย' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'เพิ่มแพทย์' })).not.toBeInTheDocument();
  });

  it('saves a department through the existing contract and closes the drawer', async () => {
    scheduling.saveDepartment.mockResolvedValueOnce({ ok: true, value: { id: 'new' } });
    render(<DepartmentWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มแผนก' }));
    fireEvent.change(screen.getByRole('textbox', { name: /ชื่อแผนก/ }), { target: { value: 'อายุรกรรม' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'คำอธิบายแผนก' }), { target: { value: 'โรคของผู้ใหญ่' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกข้อมูลแผนก' }));
    expect(await screen.findByText('เพิ่มแผนกแล้ว')).toBeInTheDocument();
    expect(scheduling.saveDepartment).toHaveBeenCalledWith({ name: 'อายุรกรรม', description: 'โรคของผู้ใหญ่' }, undefined);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('preserves the edited department draft when validation fails', async () => {
    scheduling.saveDepartment.mockResolvedValueOnce({ ok: false, error: 'ชื่อแผนกซ้ำ' });
    const before = structuredClone(scheduling.departments);
    render(<DepartmentWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข เวชปฏิบัติทั่วไป' }));
    fireEvent.change(screen.getByRole('textbox', { name: /ชื่อแผนก/ }), { target: { value: 'กายภาพบำบัด' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกข้อมูลแผนก' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ชื่อแผนกซ้ำ');
    expect(screen.getByRole('textbox', { name: /ชื่อแผนก/ })).toHaveValue('กายภาพบำบัด');
    expect(scheduling.departments).toEqual(before);
  });

  it('preselects the department when adding a doctor from an empty roster', async () => {
    scheduling.doctors = scheduling.doctors.filter((doctor) => doctor.departmentId !== 'physio');
    scheduling.saveDoctor.mockResolvedValueOnce({ ok: true, value: { id: 'new-doctor' } });
    render(<DepartmentWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มแพทย์' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('combobox', { name: /แผนกสังกัด/ })).toHaveValue('physio');
    expect(within(dialog).queryByRole('option', { name: /นพ\. สมชาย/ })).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('combobox', { name: /เลือกบัญชีแพทย์/ }), { target: { value: 'new-profile' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'บันทึกข้อมูลแพทย์' }));
    expect(await screen.findByText('เพิ่มแพทย์ในแผนกแล้ว')).toBeInTheDocument();
    expect(scheduling.saveDoctor).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'new-profile', departmentId: 'physio', fullName: 'พญ. แพทย์ใหม่' }), undefined);
  });

  it('preserves doctor data on a failed save and does not mutate the list', async () => {
    scheduling.saveDoctor.mockResolvedValueOnce({ ok: false, error: 'ไม่สามารถบันทึกแพทย์ได้' });
    const before = structuredClone(scheduling.doctors);
    render(<DepartmentWorkspace />);
    fireEvent.click(screen.getByRole('tab', { name: /^แพทย์/ }));
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไข นพ. สมชาย ใจดี' }));
    expect(screen.getByRole('combobox', { name: /เลือกบัญชีแพทย์/ })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'ความเชี่ยวชาญ' }), { target: { value: 'เวชปฏิบัติทั่วไป' } });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกข้อมูลแพทย์' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ไม่สามารถบันทึกแพทย์ได้');
    expect(screen.getByRole('textbox', { name: 'ความเชี่ยวชาญ' })).toHaveValue('เวชปฏิบัติทั่วไป');
    expect(scheduling.doctors).toEqual(before);
  });

  it('keeps focus in the drawer and returns it to the trigger after Escape', () => {
    render(<DepartmentWorkspace />);
    const trigger = screen.getByRole('button', { name: 'เพิ่มแผนก' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('textbox', { name: /ชื่อแผนก/ })).toHaveFocus();
    const save = screen.getByRole('button', { name: 'บันทึกข้อมูลแผนก' });
    save.focus();
    fireEvent.keyDown(save, { key: 'Tab' });
    const close = screen.getByRole('button', { name: 'ปิดแผงแก้ไข' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();
    fireEvent.keyDown(save, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('shows loading states and disables creation until loading completes', () => {
    scheduling.isLoading = true;
    render(<DepartmentWorkspace />);
    expect(screen.getByRole('status', { name: 'กำลังโหลดรายการแผนก' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'เพิ่มแผนก' })).toBeDisabled();
    fireEvent.click(screen.getByRole('tab', { name: /^แพทย์/ }));
    expect(screen.getByRole('status', { name: 'กำลังโหลดรายการแพทย์' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'เพิ่มแพทย์' })).toBeDisabled();
  });

  it('does not change a department or doctor when the confirmation modal is cancelled', () => {
    render(<DepartmentWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'ปิดใช้งาน เวชปฏิบัติทั่วไป' }));
    expect(screen.getByRole('dialog', { name: 'ยืนยันการปิดใช้งานแผนก' })).toBeInTheDocument();
    expect(scheduling.toggleDepartment).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(screen.queryByRole('dialog', { name: 'ยืนยันการปิดใช้งานแผนก' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^แพทย์/ }));
    fireEvent.click(screen.getByRole('button', { name: 'ปิดใช้งาน นพ. สมชาย ใจดี' }));
    expect(screen.getByRole('dialog', { name: 'ปิดใช้งานแพทย์' })).toBeInTheDocument();
    expect(scheduling.toggleDoctor).not.toHaveBeenCalled();
  });

  it('shows the latest leave range and lets staff cancel it without touching slots', async () => {
    const leave: DoctorLeave = { id: 'leave-2', doctorId: 'doctor-2', startDate: '2026-09-15', endDate: '2026-09-17', reason: 'ประชุมวิชาการ' };
    scheduling.doctorLeaves = [leave];
    scheduling.deleteDoctorLeave.mockResolvedValueOnce({ ok: true, value: leave });
    render(<DepartmentWorkspace />);
    fireEvent.click(screen.getByRole('tab', { name: /^แพทย์/ }));

    expect(screen.getByText('ลาตรวจ (15 ก.ย. 2569–17 ก.ย. 2569)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกวันลา พญ. สมใจ ใจดี' }));
    expect(screen.getByRole('dialog', { name: 'ยืนยันการยกเลิกวันลา' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกวันลา' }));
    expect(await screen.findByText('ยกเลิกวันลาของ พญ. สมใจ ใจดี แล้ว')).toBeInTheDocument();
    expect(scheduling.deleteDoctorLeave).toHaveBeenCalledWith('leave-2');
    expect(scheduling.slots).toEqual([]);
  });
});
