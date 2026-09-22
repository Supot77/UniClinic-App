import { requireApiAuth } from '../_lib/auth';
import { errorResponse, isResponse, parseUuid, readJson } from '../_lib/http';

type DoctorInput = { profileId?: string; profile_id?: string; specialty?: string; departmentId?: string; department_id?: string };

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { data: doctors, error: doctorError } = await auth.supabase
    .from('doctors')
    .select('id, specialty, department_id, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (doctorError) return errorResponse(doctorError, 'โหลดรายชื่อแพทย์ไม่สำเร็จ');

  const rows = doctors ?? [];
  const ids = rows.map((doctor) => doctor.id);
  const departmentIds = rows.map((doctor) => doctor.department_id).filter((id): id is string => Boolean(id));
  const [{ data: profiles, error: profileError }, { data: departments, error: departmentError }] = await Promise.all([
    ids.length ? auth.supabase.from('profiles').select('id, title, first_name, last_name, role, is_active').in('id', ids) : Promise.resolve({ data: [], error: null }),
    departmentIds.length ? auth.supabase.from('departments').select('id, name').in('id', departmentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileError) return errorResponse(profileError, 'โหลดข้อมูลแพทย์ไม่สำเร็จ');
  if (departmentError) return errorResponse(departmentError, 'โหลดแผนกของแพทย์ไม่สำเร็จ');

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const departmentById = new Map((departments ?? []).map((department) => [department.id, department]));
  return Response.json(rows.map((doctor) => ({
    ...doctor,
    profile: profileById.get(doctor.id) ?? null,
    department: doctor.department_id ? departmentById.get(doctor.department_id) ?? null : null,
  })));
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(['staff_admin']);
  if (!auth.ok) return auth.response;
  const body = await readJson<DoctorInput>(request);
  if (isResponse(body)) return body;
  const profileId = parseUuid(body.profileId ?? body.profile_id);
  const departmentId = parseUuid(body.departmentId ?? body.department_id);
  const specialty = body.specialty?.trim() ?? '';
  if (!profileId || !departmentId || !specialty) return Response.json({ error: 'ต้องเลือกบัญชีแพทย์ แผนก และความเชี่ยวชาญ' }, { status: 400 });
  const { data: profile, error: profileError } = await auth.supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', profileId)
    .maybeSingle();
  if (profileError) return errorResponse(profileError, 'ตรวจสอบบัญชีแพทย์ไม่สำเร็จ');
  if (!profile || profile.role !== 'medical' || profile.is_active !== true) return Response.json({ error: 'ต้องเลือกบัญชีแพทย์ที่เปิดใช้งานอยู่' }, { status: 400 });
  const { data: department, error: departmentError } = await auth.supabase
    .from('departments')
    .select('id, is_active')
    .eq('id', departmentId)
    .maybeSingle();
  if (departmentError) return errorResponse(departmentError, 'ตรวจสอบแผนกไม่สำเร็จ');
  if (!department || department.is_active !== true) return Response.json({ error: 'ต้องเลือกแผนกที่เปิดใช้งานอยู่' }, { status: 400 });
  const { data, error } = await auth.supabase.from('doctors').insert({ id: profileId, specialty, department_id: departmentId }).select('id, specialty, department_id, created_at, updated_at').single();
  if (error) return errorResponse(error, 'เพิ่มข้อมูลแพทย์ไม่สำเร็จ');
  return Response.json(data, { status: 201 });
}
