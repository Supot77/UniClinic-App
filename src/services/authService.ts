// 👤 รับผิดชอบโดย: ฟีม
// ระบบยืนยันตัวตนและโปรไฟล์

import { createClient } from '@/utils/supabase/client';
import { apiClient } from '@/lib/api-client';
import type {
  Profile,
  ProfileGender,
  ProfileTitle,
} from '@/types/database';

const supabase = createClient();

export interface PersonalProfileUpdates {
  title: ProfileTitle | null;
  first_name: string;
  last_name: string;
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
  title: ProfileTitle | null;
  first_name: string;
  last_name: string;
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

export type AccountGroup = 'patient' | 'personnel';

export interface PatientRegistrationDetails {
  title: ProfileTitle;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: ProfileGender;
  patientType: 'student' | 'employee';
  studentId?: string;
  employeeId?: string;
  phone: string;

  allergyStatus?: 'yes' | 'no' | 'unknown';
  allergies?: string | null;
  chronicDiseaseStatus?: 'yes' | 'no' | 'unknown';
  chronicDiseases?: string | null;

  emergencyContactTitle?: ProfileTitle;
  emergencyContactFirstName?: string;
  emergencyContactLastName?: string;
  emergencyContactRelationship?: string;
  emergencyPhone?: string;
}
const personNamePattern =
  /^[A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]+(?:[ '-][A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]+)*$/;

export async function signUp(
  email: string,
  password: string,
  details: PatientRegistrationDetails,
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const normalizedFirstName =
    details.firstName.trim();

  const normalizedLastName =
    details.lastName.trim();

  const normalizedStudentId = details.studentId?.trim() ?? '';
  const normalizedEmployeeId = details.employeeId?.trim() ?? '';

  const normalizedPhone =
    details.phone.trim();

  const normalizedEmergencyPhone =
    details.emergencyPhone?.trim() ?? '';

  const normalizedEmergencyFirstName =
    details.emergencyContactFirstName?.trim() ?? '';

  const normalizedEmergencyLastName =
    details.emergencyContactLastName?.trim() ?? '';

  const normalizedEmergencyRelationship =
    details.emergencyContactRelationship?.trim() ?? '';

  const allergyStatus =
    details.allergyStatus ?? 'unknown';

  const chronicDiseaseStatus =
    details.chronicDiseaseStatus ?? 'unknown';

  const normalizedAllergies =
    details.allergies?.trim() || null;

  const normalizedChronicDiseases =
    details.chronicDiseases?.trim() || null;

  const validTitles: ProfileTitle[] = [
    'นาย',
    'นาง',
    'นางสาว',
    'อื่น ๆ',
  ];

  if (!validTitles.includes(details.title)) {
    throw new Error('กรุณาเลือกคำนำหน้า');
  }

  if (!personNamePattern.test(normalizedFirstName)) {
    throw new Error(
      'ชื่อใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ',
    );
  }

  if (!personNamePattern.test(normalizedLastName)) {
    throw new Error(
      'นามสกุลใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ',
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      details.dateOfBirth,
    ) ||
    Number.isNaN(
      Date.parse(`${details.dateOfBirth}T00:00:00Z`),
    ) ||
    details.dateOfBirth >
      new Date().toISOString().slice(0, 10)
  ) {
    throw new Error('กรุณาระบุวันเกิดที่ถูกต้อง');
  }

  if (
    !['male', 'female', 'unspecified'].includes(
      details.gender,
    )
  ) {
    throw new Error('กรุณาเลือกเพศ');
  }

  if (!['student', 'employee'].includes(details.patientType)) {
    throw new Error('กรุณาเลือกประเภทผู้ป่วย');
  }

  if (
    details.patientType === 'student' &&
    !/^\d{8}$/.test(normalizedStudentId)
  ) {
    throw new Error(
      'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก',
    );
  }

  if (
    details.patientType === 'employee' &&
    !/^\d{8}$/.test(normalizedEmployeeId)
  ) {
    throw new Error('รหัสบุคลากรต้องเป็นตัวเลข 8 หลัก');
  }

  if (
    !/^[^\s@]+@mail\.wu\.ac\.th$/i.test(
      normalizedEmail,
    )
  ) {
    throw new Error(
      'กรุณาใช้อีเมล @mail.wu.ac.th เท่านั้น',
    );
  }

  if (!/^0[689]\d{8}$/.test(normalizedPhone)) {
    throw new Error(
      'เบอร์โทรศัพท์ต้องเป็นเบอร์มือถือไทย 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09',
    );
  }

  if (
    !details.emergencyContactTitle ||
    !validTitles.includes(
      details.emergencyContactTitle,
    )
  ) {
    throw new Error(
      'กรุณาเลือกคำนำหน้าผู้ติดต่อฉุกเฉิน',
    );
  }

  if (
    !personNamePattern.test(
      normalizedEmergencyFirstName,
    )
  ) {
    throw new Error(
      'ชื่อผู้ติดต่อฉุกเฉินใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ',
    );
  }

  if (
    !personNamePattern.test(
      normalizedEmergencyLastName,
    )
  ) {
    throw new Error(
      'นามสกุลผู้ติดต่อฉุกเฉินใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ',
    );
  }

  if (
    `${normalizedFirstName} ${normalizedLastName}`.toLocaleLowerCase() ===
    `${normalizedEmergencyFirstName} ${normalizedEmergencyLastName}`.toLocaleLowerCase()
  ) {
    throw new Error('ชื่อผู้ติดต่อฉุกเฉินต้องไม่ซ้ำกับชื่อผู้ป่วย');
  }

  if (!normalizedEmergencyRelationship) {
    throw new Error(
      'กรุณาระบุความสัมพันธ์ของผู้ติดต่อฉุกเฉิน',
    );
  }

  if (!/^0[689]\d{8}$/.test(normalizedEmergencyPhone)) {
    throw new Error(
      'เบอร์โทรฉุกเฉินต้องเป็นเบอร์มือถือไทย 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09',
    );
  }

  if (normalizedEmergencyPhone === normalizedPhone) {
    throw new Error('เบอร์โทรฉุกเฉินต้องไม่ซ้ำกับเบอร์โทรศัพท์หลัก');
  }

  if (
    !['yes', 'no', 'unknown'].includes(
      allergyStatus,
    )
  ) {
    throw new Error(
      'กรุณาเลือกข้อมูลประวัติแพ้ยา',
    );
  }

  if (
    allergyStatus === 'yes' &&
    !normalizedAllergies
  ) {
    throw new Error(
      'กรุณาระบุรายละเอียดการแพ้ยา',
    );
  }

  if (
    !['yes', 'no', 'unknown'].includes(
      chronicDiseaseStatus,
    )
  ) {
    throw new Error(
      'กรุณาเลือกข้อมูลโรคประจำตัว',
    );
  }

  if (
    chronicDiseaseStatus === 'yes' &&
    !normalizedChronicDiseases
  ) {
    throw new Error(
      'กรุณาระบุรายละเอียดโรคประจำตัว',
    );
  }

  if (!/^(?=\S{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/.test(password)) {
    throw new Error(
      'รหัสผ่านต้องมีอย่างน้อย 8 ตัว และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข',
    );
  }

  return apiClient<{ id: string; emailConfirmationRequired: boolean }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: normalizedEmail,
      password,
      details: {
        ...details,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        studentId: normalizedStudentId,
        employeeId: normalizedEmployeeId,
        phone: normalizedPhone,
        emergencyContactFirstName: normalizedEmergencyFirstName,
        emergencyContactLastName: normalizedEmergencyLastName,
        emergencyContactRelationship: normalizedEmergencyRelationship,
        emergencyPhone: normalizedEmergencyPhone,
        allergies: normalizedAllergies,
        chronicDiseases: normalizedChronicDiseases,
        allergyStatus,
        chronicDiseaseStatus,
      },
    }),
  });
}



export async function signIn(
  email: string,
  password: string,
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail,
    )
  ) {
    throw new Error(
      'กรุณากรอกอีเมลให้ถูกต้อง',
    );
  }

  if (!password) {
    throw new Error('กรุณากรอกรหัสผ่าน');
  }

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (error) {
    throw error;
  }

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('login_welcome_toast', 'true');
    localStorage.setItem(`uniclinic_login_at:${data.user.id}`, String(Date.now()));
  }

  return data;
}

export async function requestPasswordReset(
  email: string,
  redirectTo: string,
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('กรุณากรอกอีเมลให้ถูกต้อง');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizedEmail,
    {
      redirectTo,
    },
  );

  if (error) {
    throw error;
  }
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    throw new Error('กรุณาเข้าสู่ระบบใหม่');
  }

  const { error: verifyError } =
    await supabase.auth.signInWithPassword({
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

  if (error) {
    throw error;
  }
}

export async function getProfile(
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

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
  updates: PersonalProfileUpdates,
): Promise<Profile> {
  const userId = await getCurrentUserId();

  const firstName = updates.first_name.trim();
  const lastName = updates.last_name.trim();
  const phone = updates.phone.trim();

  if (!firstName || !lastName) {
    throw new Error('กรุณากรอกชื่อและนามสกุล');
  }

  if (!phone) {
    throw new Error('กรุณากรอกเบอร์โทรศัพท์');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      title: updates.title,
      first_name: firstName,
      last_name: lastName,
      phone,
      emergency_phone: updates.emergency_phone?.trim() || null,
      address: updates.address?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMyProfileAvatar(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    throw new Error('รูปโปรไฟล์ต้องเป็นไฟล์ PNG, JPG หรือ JPEG');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('ไม่สามารถประมวลผลรูปโปรไฟล์ได้');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('ไม่สามารถประมวลผลรูปโปรไฟล์ได้');

  const userId = await getCurrentUserId();
  const avatarPath = `${userId}/avatar.png`;
  const { error: uploadError } = await supabase.storage
    .from('profile-avatars')
    .upload(avatarPath, blob, { contentType: 'image/png', upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from('profile-avatars')
    .getPublicUrl(avatarPath);
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileError) throw profileError;
  return avatarUrl;
}

export async function updateMyHealthProfile(
  updates: HealthProfileUpdates,
): Promise<Profile> {
  const userId = await getCurrentUserId();

  const allergies =
    updates.allergy_status === 'yes'
      ? updates.allergies?.trim() || null
      : null;

  const chronicDiseases =
    updates.chronic_disease_status === 'yes'
      ? updates.chronic_diseases?.trim() || null
      : null;

  if (updates.allergy_status === 'yes' && !allergies) {
    throw new Error('กรุณาระบุข้อมูลการแพ้ยา');
  }

  if (
    updates.chronic_disease_status === 'yes' &&
    !chronicDiseases
  ) {
    throw new Error('กรุณาระบุข้อมูลโรคประจำตัว');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      allergy_status: updates.allergy_status,
      allergies,
      chronic_disease_status: updates.chronic_disease_status,
      chronic_diseases: chronicDiseases,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePatientByStaff(
  patientId: string,
  updates: StaffAdminPatientUpdates,
): Promise<Profile> {
  const firstName = updates.first_name.trim();
  const lastName = updates.last_name.trim();
  const phone = updates.phone.trim();
  const studentId = updates.student_id?.trim() || null;
  const employeeId = updates.employee_id?.trim() || null;
  const organization = updates.organization?.trim() || null;

  if (!patientId) {
    throw new Error('ไม่พบรหัสผู้ป่วย');
  }

  if (!firstName || !lastName) {
    throw new Error('กรุณากรอกชื่อและนามสกุล');
  }

  if (!phone) {
    throw new Error('กรุณากรอกเบอร์โทรศัพท์');
  }

  if (updates.patient_type === 'student' && !studentId) {
    throw new Error('กรุณากรอกรหัสนักศึกษา');
  }

  if (updates.patient_type === 'employee' && !employeeId) {
    throw new Error('กรุณากรอกรหัสบุคลากร');
  }

  const allergies =
    updates.allergy_status === 'yes'
      ? updates.allergies?.trim() || null
      : null;

  const chronicDiseases =
    updates.chronic_disease_status === 'yes'
      ? updates.chronic_diseases?.trim() || null
      : null;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      title: updates.title,
      first_name: firstName,
      last_name: lastName,
      phone,
      emergency_phone: updates.emergency_phone?.trim() || null,
      address: updates.address?.trim() || null,
      patient_type: updates.patient_type,
      student_id:
        updates.patient_type === 'student' ? studentId : null,
      employee_id:
        updates.patient_type === 'employee' ? employeeId : null,
      organization,
      allergy_status: updates.allergy_status,
      allergies,
      chronic_disease_status: updates.chronic_disease_status,
      chronic_diseases: chronicDiseases,
      updated_at: new Date().toISOString(),
    })
    .eq('id', patientId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccounts(
  group: AccountGroup = 'patient',
): Promise<Profile[]> {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true });

  if (group === 'patient') {
    query = query.eq('role', 'patient');
  } else {
    query = query.in('role', ['medical', 'staff_admin']);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPatients(): Promise<Profile[]> {
  return getAccounts('patient');
}

export async function getPatientById(
  patientId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', patientId)
    .eq('role', 'patient')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function suspendAccount(
  accountId: string,
): Promise<Profile> {
  if (!accountId) {
    throw new Error('ไม่พบรหัสบัญชี');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function restoreAccount(
  accountId: string,
): Promise<Profile> {
  if (!accountId) {
    throw new Error('ไม่พบรหัสบัญชี');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_suspended: false,
      suspended_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteAccountPermanently(
  accountId: string,
): Promise<void> {
  if (!accountId) {
    throw new Error('ไม่พบรหัสบัญชี');
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', accountId);

  if (error) {
    throw error;
  }
}

async function requireStaffAdmin(): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('กรุณาเข้าสู่ระบบใหม่');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('ไม่พบข้อมูลบัญชีผู้ใช้งาน');
  }

  if (profile.role !== 'staff_admin') {
    throw new Error(
      'เฉพาะเจ้าหน้าที่เท่านั้นที่แก้ข้อมูลผู้ป่วยได้',
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

  const { data: profile, error: profileError } = await supabase
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
  patientId: string,
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
  updates: StaffAdminPatientUpdates,
): Promise<Profile> {
  await requireStaffAdmin();

  return updatePatientByStaff(patientId, updates);
}

export interface SearchProfilesResult {
  profiles: Profile[];
  hasMore: boolean;
  totalCount: number;
}

function escapeProfileSearchTerm(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/[%,_*]/g, '')
    .replace(/[(),.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function searchProfilesByGroup(
  group: AccountGroup,
  query: string = '',
  page: number = 0,
  pageSize: number = 10,
): Promise<SearchProfilesResult> {
  const actorRole = await requirePatientDirectoryAccess();

  if (
    group === 'personnel' &&
    actorRole !== 'staff_admin'
  ) {
    throw new Error(
      'เฉพาะเจ้าหน้าที่เท่านั้นที่ดูข้อมูลบุคลากรได้',
    );
  }

  const normalizedQuery = query.trim();
  const safeSearchTerm = escapeProfileSearchTerm(normalizedQuery);
  const phoneSearchTerm = normalizedQuery.replace(/\D/g, '');
  const from = page * pageSize;
  const to = from + pageSize - 1;

  if (normalizedQuery && !safeSearchTerm && phoneSearchTerm.length === 0) {
    return { profiles: [], totalCount: 0, hasMore: false };
  }

  const selectedFields = [
    'id',
    'title',
    'first_name',
    'last_name',
    'student_id',
    'employee_id',
    'patient_type',
    'phone',
    'role',
    'is_active',
    ...(actorRole === 'medical' && group === 'patient'
      ? [
          'allergy_status',
          'allergies',
          'chronic_disease_status',
          'chronic_diseases',
        ]
      : []),
  ].join(',');

  let request = supabase
    .from('profiles')
    .select(selectedFields, { count: 'exact' })
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true })
    .range(from, to);

  if (group === 'patient') {
    request = request.eq('role', 'patient');
  } else {
    request = request.in('role', [
      'medical',
      'staff_admin',
    ]);
  }

  if (normalizedQuery) {
    const filters = [
      `first_name.ilike.%${safeSearchTerm}%`,
      `last_name.ilike.%${safeSearchTerm}%`,
      `student_id.ilike.%${safeSearchTerm}%`,
      `employee_id.ilike.%${safeSearchTerm}%`,
      `phone.ilike.%${safeSearchTerm}%`,
    ];

    if (phoneSearchTerm && phoneSearchTerm !== safeSearchTerm) {
      filters.push(`phone.ilike.%${phoneSearchTerm}%`);
    }

    request = request.or(filters.join(','));
  }

  const { data, count, error } = await request;

  if (error) {
    throw new Error(error.message);
  }

  const profiles = (data ?? []) as unknown as Profile[];
  const totalCount = count ?? 0;

  return {
    profiles,
    totalCount,
    hasMore: from + profiles.length < totalCount,
  };
}
