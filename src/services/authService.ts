// 👤 รับผิดชอบโดย: ฟีม
// ระบบยืนยันตัวตนและโปรไฟล์

import { createClient } from '@/utils/supabase/client';
import type { Profile, UserRole } from '@/types/database';

const supabase = createClient(); 

export interface PersonalProfileUpdates {
  full_name: string;
  phone: string;
  emergency_phone: string | null;
  address: string | null;
}

export interface HealthProfileUpdates {
  allergy_status: 'yes' | 'no' | 'unknown';
  allergies: string | null;
  chronic_disease_status: 'yes' | 'no' | 'unknown';
  chronic_diseases: string | null;
}

export interface StaffAdminPatientUpdates {
  full_name: string;
  phone: string;
  emergency_phone: string | null;
  address: string | null;

  patient_type: 'student' | 'employee';
  student_id: string | null;
  employee_id: string | null;
  organization: string | null;

  allergy_status: 'yes' | 'no' | 'unknown';
  allergies: string | null;

  chronic_disease_status: 'yes' | 'no' | 'unknown';
  chronic_diseases: string | null;
}

export type AccountGroup =
  | 'patient'
  | 'personnel';

export async function signUp(email: string, password: string, fullName: string, studentId?: string, phone?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = fullName.trim();
  const normalizedStudentId = studentId?.trim() ?? '';
  const normalizedPhone = phone?.trim() ?? '';

  if (!/^[A-Za-z\u0E00-\u0E7F]+(?:[ -][A-Za-z\u0E00-\u0E7F]+)*$/.test(normalizedName)) {
    throw new Error('ชื่อ-นามสกุลใช้ได้เฉพาะตัวอักษรไทย อังกฤษ และช่องว่าง');
  }
  if (!/^\d{8}$/.test(normalizedStudentId)) {
    throw new Error('รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก');
  }
  if (!/^[^\s@]+@mail\.wu\.ac\.th$/i.test(normalizedEmail)) {
    throw new Error('กรุณาใช้อีเมล @mail.wu.ac.th เท่านั้น');
  }
  if (!/^0\d{9}$/.test(normalizedPhone)) {
    throw new Error('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0');
  }
  if (password.length < 8) {
    throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
  }

  const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: normalizedName,
      student_id: normalizedStudentId,
      phone: normalizedPhone,
      role: 'patient' as UserRole,
    });
    if (profileError) throw profileError;
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('กรุณากรอกอีเมล');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    throw new Error('กรุณาเข้าสู่ระบบใหม่');
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
  }

  await updatePassword(newPassword);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}


async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('กรุณาเข้าสู่ระบบใหม่');
  }

  return user.id;
}

export async function updateMyPersonalProfile(
  updates: PersonalProfileUpdates
): Promise<Profile> {
  const userId = await getCurrentUserId();

  const fullName = updates.full_name.trim();
  const phone = updates.phone.trim();

  if (!fullName) {
    throw new Error('กรุณากรอกชื่อ-นามสกุล');
  }

  if (!phone) {
    throw new Error('กรุณากรอกเบอร์โทรศัพท์');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      emergency_phone:
        updates.emergency_phone?.trim() || null,
      address: updates.address?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateMyHealthProfile(
  updates: HealthProfileUpdates
): Promise<Profile> {
  const userId = await getCurrentUserId();

  const allergyDetail = updates.allergies?.trim() || null;
  const chronicDetail =
    updates.chronic_diseases?.trim() || null;

  if (
    updates.allergy_status === 'yes' &&
    !allergyDetail
  ) {
    throw new Error(
      'กรุณากรอกรายละเอียดประวัติแพ้ยา'
    );
  }

  if (
    updates.chronic_disease_status === 'yes' &&
    !chronicDetail
  ) {
    throw new Error(
      'กรุณากรอกรายละเอียดโรคประจำตัว'
    );
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      allergy_status: updates.allergy_status,
      allergies:
        updates.allergy_status === 'yes'
          ? allergyDetail
          : null,
      chronic_disease_status:
        updates.chronic_disease_status,
      chronic_diseases:
        updates.chronic_disease_status === 'yes'
          ? chronicDetail
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
async function requireStaffAdmin(): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('กรุณาเข้าสู่ระบบใหม่');
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

  if (profileError || !profile) {
    throw new Error('ไม่พบข้อมูลบัญชีผู้ใช้งาน');
  }

  if (profile.role !== 'staff_admin') {
    throw new Error(
      'เฉพาะสตาฟแอดมินเท่านั้นที่แก้ข้อมูลผู้ป่วยได้'
    );
  }

  if (profile.is_active === false) {
    throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
  }

  return user.id;
}

async function requirePatientDirectoryAccess(): Promise<
  'medical' | 'staff_admin'
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('กรุณาเข้าสู่ระบบใหม่');
  }

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

  if (profileError || !profile) {
    throw new Error('ไม่พบข้อมูลบัญชีผู้ใช้งาน');
  }

  if (profile.is_active === false) {
    throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
  }

  if (
    profile.role !== 'medical' &&
    profile.role !== 'staff_admin'
  ) {
    throw new Error('คุณไม่มีสิทธิ์ค้นหาผู้ป่วย');
  }

  return profile.role;
}

export async function getPatientForStaffAdmin(
  patientId: string
): Promise<Profile> {
  await requireStaffAdmin();

  const normalizedPatientId = patientId.trim();

  if (!normalizedPatientId) {
    throw new Error('ไม่พบรหัสบัญชีผู้ป่วย');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', normalizedPatientId)
    .eq('role', 'patient')
    .single();

  if (error || !data) {
    throw new Error('ไม่พบข้อมูลผู้ป่วย');
  }

  return data;
}

export async function staffAdminUpdatePatient(
  patientId: string,
  updates: StaffAdminPatientUpdates
): Promise<Profile> {
  await requireStaffAdmin();

  const fullName = updates.full_name.trim();
  const phone = updates.phone.trim();

  if (!patientId) {
    throw new Error('ไม่พบรหัสบัญชีผู้ป่วย');
  }

  if (!fullName) {
    throw new Error('กรุณากรอกชื่อ-นามสกุล');
  }

  if (!phone) {
    throw new Error('กรุณากรอกเบอร์โทรศัพท์');
  }

  if (
    updates.patient_type !== 'student' &&
    updates.patient_type !== 'employee'
  ) {
    throw new Error('ประเภทผู้ป่วยไม่ถูกต้อง');
  }

  const studentId = updates.student_id?.trim() || null;
  const employeeId = updates.employee_id?.trim() || null;
  const organization =
    updates.organization?.trim() || null;

  if (
    updates.patient_type === 'student' &&
    !studentId
  ) {
    throw new Error('กรุณากรอกรหัสนักศึกษา');
  }

  if (
    updates.patient_type === 'employee' &&
    !employeeId
  ) {
    throw new Error('กรุณากรอกรหัสบุคลากร');
  }

  if (
    updates.patient_type === 'employee' &&
    !organization
  ) {
    throw new Error('กรุณากรอกหน่วยงาน');
  }

  const allergies = updates.allergies?.trim() || null;
  const chronicDiseases =
    updates.chronic_diseases?.trim() || null;

  if (
    updates.allergy_status === 'yes' &&
    !allergies
  ) {
    throw new Error(
      'กรุณากรอกรายละเอียดประวัติแพ้ยา'
    );
  }

  if (
    updates.chronic_disease_status === 'yes' &&
    !chronicDiseases
  ) {
    throw new Error(
      'กรุณากรอกรายละเอียดโรคประจำตัว'
    );
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      emergency_phone:
        updates.emergency_phone?.trim() || null,
      address: updates.address?.trim() || null,

      patient_type: updates.patient_type,

      student_id:
        updates.patient_type === 'student'
          ? studentId
          : null,

      employee_id:
        updates.patient_type === 'employee'
          ? employeeId
          : null,

      organization:
        updates.patient_type === 'employee'
          ? organization
          : null,

      allergy_status: updates.allergy_status,

      allergies:
        updates.allergy_status === 'yes'
          ? allergies
          : null,

      chronic_disease_status:
        updates.chronic_disease_status,

      chronic_diseases:
        updates.chronic_disease_status === 'yes'
          ? chronicDiseases
          : null,

      updated_at: new Date().toISOString(),
    })
    .eq('id', patientId)
    .eq('role', 'patient')
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'รหัสนักศึกษาหรือรหัสบุคลากรนี้ถูกใช้งานแล้ว'
      );
    }

    throw new Error(error.message);
  }

  return data;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export interface SearchPatientsResult {
  patients: Profile[];
  hasMore: boolean;
  totalCount: number;
}

export interface SearchProfilesResult {
  profiles: Profile[];
  hasMore: boolean;
  totalCount: number;
}

export async function searchPatients(
  query: string = '',
  page: number = 0,
  pageSize: number = 10
): Promise<SearchPatientsResult> {
  const trimmed = query.trim();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let req = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'patient')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (trimmed) {
    req = req.or(`full_name.ilike.%${trimmed}%,student_id.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`);
  }

  const { data, count, error } = await req;
  if (error) throw error;

  const total = count ?? 0;
  const patients = data ?? [];
  const hasMore = from + patients.length < total;

  return {
    patients,
    hasMore,
    totalCount: total,
  };
}

export async function searchProfilesByGroup(
  group: AccountGroup,
  query: string = '',
  page: number = 0,
  pageSize: number = 10
): Promise<SearchProfilesResult> {
  const actorRole =
  await requirePatientDirectoryAccess();

if (
  group === 'personnel' &&
  actorRole !== 'staff_admin'
) {
  throw new Error(
    'เฉพาะสตาฟแอดมินเท่านั้นที่ดูข้อมูลบุคลากรได้'
  );
}

  const normalizedQuery = query.trim();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let request = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('full_name', { ascending: true })
    .range(from, to);

  if (group === 'patient') {
    request = request.eq('role', 'patient');
  } else {
    request = request.in(
      'role',
      ['medical', 'staff_admin']
    );
  }

  if (normalizedQuery) {
    request = request.or(
      [
        `full_name.ilike.%${normalizedQuery}%`,
        `student_id.ilike.%${normalizedQuery}%`,
        `employee_id.ilike.%${normalizedQuery}%`,
        `phone.ilike.%${normalizedQuery}%`,
      ].join(',')
    );
  }

  const { data, count, error } = await request;

  if (error) {
    throw new Error(error.message);
  }

  const profiles = data ?? [];
  const totalCount = count ?? 0;

  return {
    profiles,
    totalCount,
    hasMore:
      from + profiles.length < totalCount,
  };
}

export async function getPatients(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'patient')
    .order('full_name', { ascending: true });

  if (error) {
    console.warn('Error fetching patients from Supabase profiles:', error);
    return [];
  }
  return data ?? [];
}
