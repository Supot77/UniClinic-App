import type { ProfileTitle } from '@/types/database';

export type PersonnelKind = 'doctor' | 'staff';

export interface PersonnelRegistrationInput {
  kind: PersonnelKind;
  title: ProfileTitle;
  firstName: string;
  lastName: string;
  employeeId: string;
  email: string;
  phone: string;
  password: string;
  position: string;
  organization: string;
  licenseNumber?: string;
  specialty?: string;
  departmentId?: string;
}

const namePattern = /^[A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]+(?:[ '-][A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]+)*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const medicalCouncilLicensePattern = /^ว\.\d{5,6}$/;
const strongPasswordPattern = /^(?=\S{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/;

export function normalizePersonnelInput(input: PersonnelRegistrationInput): PersonnelRegistrationInput {
  return {
    ...input,
    title: input.kind === 'staff' ? 'อื่น ๆ' : input.title,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    employeeId: input.employeeId.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    position: input.kind === 'staff' ? 'เจ้าหน้าที่คลินิก' : input.position.trim(),
    organization: input.kind === 'staff' ? 'WU Clinic' : input.organization.trim(),
    licenseNumber: input.licenseNumber?.trim() ?? '',
    specialty: input.specialty?.trim() ?? '',
    departmentId: input.departmentId?.trim() ?? '',
  };
}

export function validatePersonnelInput(input: PersonnelRegistrationInput): string | null {
  if (!['doctor', 'staff'].includes(input.kind)) return 'ประเภทบัญชีไม่ถูกต้อง';
  if (input.kind === 'doctor' && !['นายแพทย์', 'แพทย์หญิง', 'ดร.'].includes(input.title)) return 'กรุณาเลือกคำนำหน้าแพทย์';
  if (!namePattern.test(input.firstName) || !namePattern.test(input.lastName)) {
    return 'ชื่อและนามสกุลต้องเป็นตัวอักษรไทยหรืออังกฤษ';
  }
  if (!/^\d{8}$/.test(input.employeeId)) return 'รหัสบุคลากรต้องเป็นตัวเลข 8 หลัก';
  if (!emailPattern.test(input.email)) return 'กรุณากรอกอีเมลให้ถูกต้อง';
  if (!/^0[689]\d{8}$/.test(input.phone)) {
    return 'เบอร์โทรศัพท์ต้องเป็นเบอร์มือถือไทย 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09';
  }
  if (!strongPasswordPattern.test(input.password)) {
    return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข';
  }
  if (input.kind === 'doctor' && !input.position) return 'กรุณาระบุตำแหน่ง';
  if (input.kind === 'doctor' && !input.organization) return 'กรุณาระบุหน่วยงาน';
  if (input.kind === 'doctor') {
    if (!medicalCouncilLicensePattern.test(input.licenseNumber ?? '')) {
      return 'เลขใบประกอบวิชาชีพต้องอยู่ในรูปแบบ ว. ตามด้วยตัวเลข 5–6 หลัก';
    }
    if (!input.specialty) return 'กรุณาระบุความเชี่ยวชาญ';
    if (!input.departmentId) return 'กรุณาเลือกแผนก';
  }
  return null;
}
