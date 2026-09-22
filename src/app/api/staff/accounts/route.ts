import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

type Details = {
  title: 'นาย' | 'นาง' | 'นางสาว' | 'อื่น ๆ';
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'unspecified';
  patientType: 'student' | 'employee';
  studentId?: string;
  employeeId?: string;
  phone: string;
  allergyStatus: 'yes' | 'no' | 'unknown';
  allergies: string | null;
  chronicDiseaseStatus: 'yes' | 'no' | 'unknown';
  chronicDiseases: string | null;
  emergencyContactTitle: 'นาย' | 'นาง' | 'นางสาว' | 'อื่น ๆ';
  emergencyContactFirstName: string;
  emergencyContactLastName: string;
  emergencyContactRelationship: string;
  emergencyPhone: string;
};

const namePattern = /^[A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]+(?:[ '-][A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]+)*$/;

function validate(email: string, password: string, details: Details): string | null {
  if (!/^[^\s@]+@mail\.wu\.ac\.th$/i.test(email)) return 'กรุณาใช้อีเมล @mail.wu.ac.th เท่านั้น';
  if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (!namePattern.test(details.firstName.trim()) || !namePattern.test(details.lastName.trim())) return 'ชื่อและนามสกุลต้องเป็นตัวอักษรไทยหรืออังกฤษ';
  if (details.patientType === 'student' && !/^\d{8}$/.test(details.studentId ?? '')) return 'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก';
  if (details.patientType === 'employee' && !/^\d{8}$/.test(details.employeeId ?? '')) return 'รหัสบุคลากรต้องเป็นตัวเลข 8 หลัก';
  if (!/^0[689]\d{8}$/.test(details.phone) || !/^0[689]\d{8}$/.test(details.emergencyPhone)) return 'เบอร์โทรศัพท์ต้องเป็นเบอร์มือถือไทย 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09';
  if (details.phone === details.emergencyPhone) return 'เบอร์โทรฉุกเฉินต้องไม่ซ้ำกับเบอร์โทรศัพท์หลัก';
  if (
    `${details.firstName.trim()} ${details.lastName.trim()}`.toLocaleLowerCase() ===
    `${details.emergencyContactFirstName.trim()} ${details.emergencyContactLastName.trim()}`.toLocaleLowerCase()
  ) return 'ชื่อผู้ติดต่อฉุกเฉินต้องไม่ซ้ำกับชื่อผู้ป่วย';
  if (!details.emergencyContactRelationship.trim()) return 'กรุณาระบุความสัมพันธ์ของผู้ติดต่อฉุกเฉิน';
  if (details.allergyStatus === 'yes' && !details.allergies?.trim()) return 'กรุณาระบุรายละเอียดการแพ้ยา';
  if (details.chronicDiseaseStatus === 'yes' && !details.chronicDiseases?.trim()) return 'กรุณาระบุรายละเอียดโรคประจำตัว';
  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'กรุณาเข้าสู่ระบบใหม่' }, { status: 401 });

  const { data: actor } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();
  if (!actor || actor.role !== 'staff_admin' || actor.is_active === false) {
    return Response.json({ error: 'เฉพาะเจ้าหน้าที่เท่านั้นที่สร้างบัญชีผู้ป่วยได้' }, { status: 403 });
  }

  const body = (await request.json()) as { email?: string; password?: string; details?: Details };
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  if (!body.details) return Response.json({ error: 'ข้อมูลผู้ป่วยไม่ครบถ้วน' }, { status: 400 });
  const errorMessage = validate(email, password, body.details);
  if (errorMessage) return Response.json({ error: errorMessage }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return Response.json({ error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return Response.json({ error: createError?.message ?? 'สร้างบัญชีไม่สำเร็จ' }, { status: 400 });
  }

  const d = body.details;
  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    title: d.title,
    first_name: d.firstName.trim(),
    last_name: d.lastName.trim(),
    date_of_birth: d.dateOfBirth,
    gender: d.gender,
    patient_type: d.patientType,
    student_id: d.patientType === 'student' ? d.studentId : null,
    employee_id: d.patientType === 'employee' ? d.employeeId : null,
    phone: d.phone,
    allergy_status: d.allergyStatus,
    allergies: d.allergyStatus === 'yes' ? d.allergies?.trim() || null : null,
    chronic_disease_status: d.chronicDiseaseStatus,
    chronic_diseases: d.chronicDiseaseStatus === 'yes' ? d.chronicDiseases?.trim() || null : null,
    emergency_contact_title: d.emergencyContactTitle,
    emergency_contact_first_name: d.emergencyContactFirstName.trim(),
    emergency_contact_last_name: d.emergencyContactLastName.trim(),
    emergency_contact_relationship: d.emergencyContactRelationship.trim(),
    emergency_phone: d.emergencyPhone,
    role: 'patient',
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: profileError.message }, { status: 400 });
  }

  return Response.json({ id: created.user.id }, { status: 201 });
}
