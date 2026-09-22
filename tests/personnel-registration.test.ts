import { describe, expect, it } from 'vitest';
import { normalizePersonnelInput, validatePersonnelInput, type PersonnelRegistrationInput } from '@/features/personnel-registration';

const validDoctor: PersonnelRegistrationInput = {
  kind: 'doctor', title: 'แพทย์หญิง', firstName: 'ธัญญพร', lastName: 'ทุ่มทอง', employeeId: '12345678',
  email: 'doctor@example.com', phone: '0891234567', password: 'Password123', position: 'แพทย์',
  organization: 'WU Clinic', licenseNumber: 'ว.12345', specialty: 'เวชปฏิบัติทั่วไป', departmentId: 'dept-1',
};

describe('personnel registration validation', () => {
  it('accepts a doctor email from any valid domain', () => {
    expect(validatePersonnelInput(validDoctor)).toBeNull();
    expect(validatePersonnelInput({ ...validDoctor, email: 'doctor@gmail.com' })).toBeNull();
  });

  it('requires doctor professional information', () => {
    expect(validatePersonnelInput({ ...validDoctor, licenseNumber: '' })).toMatch(/ใบประกอบวิชาชีพ/);
    expect(validatePersonnelInput({ ...validDoctor, departmentId: '' })).toMatch(/แผนก/);
  });

  it('accepts the Medical Council license format', () => {
    expect(validatePersonnelInput({ ...validDoctor, licenseNumber: 'ว12345' })).toMatch(/ว\./);
    expect(validatePersonnelInput({ ...validDoctor, licenseNumber: 'ว.12345' })).toBeNull();
  });

  it('does not require doctor fields for staff', () => {
    const staff = normalizePersonnelInput({ ...validDoctor, kind: 'staff', title: 'นางสาว', position: '', organization: '', licenseNumber: '', specialty: '', departmentId: '' });
    expect(validatePersonnelInput(staff)).toBeNull();
    expect(staff.title).toBe('นางสาว');
    expect(staff.position).toBe('เจ้าหน้าที่คลินิก');
    expect(staff.organization).toBe('WU Clinic');
  });

  it('requires a valid Thai mobile number for staff', () => {
    const staff = normalizePersonnelInput({ ...validDoctor, kind: 'staff', title: 'นางสาว', phone: '' });
    expect(validatePersonnelInput(staff)).toMatch(/เบอร์โทรศัพท์/);
  });

  it('normalizes email and text before validation', () => {
    const normalized = normalizePersonnelInput({ ...validDoctor, email: ' Doctor@Example.COM ', firstName: ' ธัญญพร ' });
    expect(normalized.email).toBe('doctor@example.com');
    expect(normalized.firstName).toBe('ธัญญพร');
  });
});
