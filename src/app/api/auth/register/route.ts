import { createClient } from '@/utils/supabase/server';
import { errorResponse, isResponse, readJson } from '../../_lib/http';

type RegistrationDetails = {
  title?: string; firstName?: string; lastName?: string; dateOfBirth?: string; gender?: string; patientType?: string;
  studentId?: string; employeeId?: string; phone?: string; allergyStatus?: string; allergies?: string | null;
  chronicDiseaseStatus?: string; chronicDiseases?: string | null; emergencyContactTitle?: string;
  emergencyContactFirstName?: string; emergencyContactLastName?: string; emergencyContactRelationship?: string; emergencyPhone?: string;
};
type RegistrationInput = { email?: string; password?: string; details?: RegistrationDetails };
const namePattern = /^[A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]+(?:[ '-][A-Za-z\u0E01-\u0E4E]+)*$/;
const titles = ['นาย', 'นาง', 'นางสาว', 'อื่น ๆ'];

function validate(email: string, password: string, details: RegistrationDetails): string | null {
  if (!titles.includes(details.title ?? '')) return 'กรุณาเลือกคำนำหน้า';
  if (!namePattern.test(details.firstName?.trim() ?? '') || !namePattern.test(details.lastName?.trim() ?? '')) return 'ชื่อและนามสกุลต้องเป็นตัวอักษรไทยหรืออังกฤษ';
  if (!details.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(details.dateOfBirth) || details.dateOfBirth < '1900-01-01' || details.dateOfBirth > new Date().toISOString().slice(0, 10)) return 'กรุณาระบุวันเกิดที่ถูกต้อง';
  if (!['male', 'female', 'unspecified'].includes(details.gender ?? '')) return 'กรุณาเลือกเพศ';
  if (!['student', 'employee'].includes(details.patientType ?? '')) return 'กรุณาเลือกประเภทผู้ป่วย';
  if (details.patientType === 'student' && !/^\d{8}$/.test(details.studentId ?? '')) return 'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก';
  if (details.patientType === 'employee' && !/^\d{8}$/.test(details.employeeId ?? '')) return 'รหัสบุคลากรต้องเป็นตัวเลข 8 หลัก';
  if (!/^[^\s@]+@mail\.wu\.ac\.th$/i.test(email)) return 'กรุณาใช้อีเมล @mail.wu.ac.th เท่านั้น';
  if (!/^(?=\S{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/.test(password)) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข';
  if (!/^0[689]\d{8}$/.test(details.phone ?? '') || !/^0[689]\d{8}$/.test(details.emergencyPhone ?? '')) return 'เบอร์โทรศัพท์ต้องเป็นเบอร์มือถือไทย 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09';
  if (!titles.includes(details.emergencyContactTitle ?? '') || !namePattern.test(details.emergencyContactFirstName?.trim() ?? '') || !namePattern.test(details.emergencyContactLastName?.trim() ?? '')) return 'ข้อมูลผู้ติดต่อฉุกเฉินไม่ถูกต้อง';
  if (`${details.firstName?.trim()} ${details.lastName?.trim()}`.toLocaleLowerCase() === `${details.emergencyContactFirstName?.trim()} ${details.emergencyContactLastName?.trim()}`.toLocaleLowerCase()) return 'ชื่อผู้ติดต่อฉุกเฉินต้องไม่ซ้ำกับชื่อผู้ป่วย';
  if (!details.emergencyContactRelationship?.trim()) return 'กรุณาระบุความสัมพันธ์ของผู้ติดต่อฉุกเฉิน';
  if (details.phone === details.emergencyPhone) return 'เบอร์โทรฉุกเฉินต้องไม่ซ้ำกับเบอร์โทรศัพท์หลัก';
  const allergyStatus = details.allergyStatus ?? 'unknown';
  const chronicStatus = details.chronicDiseaseStatus ?? 'unknown';
  if (!['yes', 'no', 'unknown'].includes(allergyStatus) || (allergyStatus === 'yes' && !details.allergies?.trim())) return 'ข้อมูลประวัติแพ้ยาไม่ถูกต้อง';
  if (!['yes', 'no', 'unknown'].includes(chronicStatus) || (chronicStatus === 'yes' && !details.chronicDiseases?.trim())) return 'ข้อมูลโรคประจำตัวไม่ถูกต้อง';
  return null;
}

export async function POST(request: Request) {
  const body = await readJson<RegistrationInput>(request);
  if (isResponse(body)) return body;
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const details = body.details;
  if (!details) return Response.json({ error: 'ข้อมูลผู้สมัครไม่ครบถ้วน' }, { status: 400 });
  const validationError = validate(email, password, details);
  if (validationError) return Response.json({ error: validationError }, { status: 400 });

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    return errorResponse(error, 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Supabase');
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return errorResponse(error, 'ลงทะเบียนไม่สำเร็จ');
  const allergyStatus = details.allergyStatus ?? 'unknown';
  const chronicStatus = details.chronicDiseaseStatus ?? 'unknown';
  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    title: details.title,
    first_name: details.firstName!.trim(),
    last_name: details.lastName!.trim(),
    date_of_birth: details.dateOfBirth,
    gender: details.gender,
    patient_type: details.patientType,
    student_id: details.patientType === 'student' ? details.studentId?.trim() : null,
    employee_id: details.patientType === 'employee' ? details.employeeId?.trim() : null,
    phone: details.phone!.trim(),
    allergy_status: allergyStatus,
    allergies: allergyStatus === 'yes' ? details.allergies?.trim() || null : null,
    chronic_disease_status: chronicStatus,
    chronic_diseases: chronicStatus === 'yes' ? details.chronicDiseases?.trim() || null : null,
    emergency_contact_title: details.emergencyContactTitle,
    emergency_contact_first_name: details.emergencyContactFirstName!.trim(),
    emergency_contact_last_name: details.emergencyContactLastName!.trim(),
    emergency_contact_relationship: details.emergencyContactRelationship!.trim(),
    emergency_phone: details.emergencyPhone!.trim(),
    role: 'patient',
  });
  if (profileError) return errorResponse(profileError, 'สร้างข้อมูลผู้สมัครไม่สำเร็จ');
  return Response.json({ id: data.user.id, emailConfirmationRequired: !data.session }, { status: 201 });
}
