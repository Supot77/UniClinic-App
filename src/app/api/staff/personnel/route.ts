import { createClient as createAdminClient } from '@supabase/supabase-js';
import { normalizePersonnelInput, validatePersonnelInput, type PersonnelRegistrationInput } from '@/features/personnel-registration';
import { createClient } from '@/utils/supabase/server';

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
    return Response.json({ error: 'เฉพาะเจ้าหน้าที่ที่เปิดใช้งานเท่านั้นที่สร้างบัญชีบุคลากรได้' }, { status: 403 });
  }

  let rawInput: PersonnelRegistrationInput;
  try {
    rawInput = (await request.json()) as PersonnelRegistrationInput;
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }
  const input = normalizePersonnelInput(rawInput);
  const validationError = validatePersonnelInput(input);
  if (validationError) return Response.json({ error: validationError }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return Response.json({ error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase().includes('already')
      ? 'อีเมลนี้มีบัญชีอยู่แล้ว'
      : createError?.message ?? 'สร้างบัญชีไม่สำเร็จ';
    return Response.json({ error: message }, { status: 400 });
  }

  const profileId = created.user.id;
  const { error: profileError } = await admin.from('profiles').insert({
    id: profileId,
    full_name: `${input.firstName} ${input.lastName}`,
    title: input.title,
    first_name: input.firstName,
    last_name: input.lastName,
    employee_id: input.employeeId,
    phone: input.phone || null,
    organization: input.organization,
    staff_position: input.position,
    role: input.kind === 'doctor' ? 'medical' : 'staff_admin',
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(profileId);
    const message = profileError.message.toLowerCase().includes('employee_id')
      ? 'รหัสบุคลากรนี้ถูกใช้งานแล้ว'
      : profileError.message;
    return Response.json({ error: message }, { status: 400 });
  }

  if (input.kind === 'doctor') {
    const { error: doctorError } = await admin.from('doctors').insert({
      id: profileId,
      license_number: input.licenseNumber,
      specialty: input.specialty,
      department_id: input.departmentId,
    });
    if (doctorError) {
      await admin.from('profiles').delete().eq('id', profileId);
      await admin.auth.admin.deleteUser(profileId);
      const message = doctorError.message.toLowerCase().includes('license_number')
        ? 'เลขใบประกอบวิชาชีพนี้ถูกใช้งานแล้ว'
        : doctorError.message;
      return Response.json({ error: message }, { status: 400 });
    }
  }

  return Response.json({ id: profileId }, { status: 201 });
}
