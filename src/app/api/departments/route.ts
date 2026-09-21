import { requireApiAuth } from '../_lib/auth';
import { errorResponse, isResponse, readJson } from '../_lib/http';
import { createClient } from '@/utils/supabase/server';

type DepartmentInput = { name?: string; description?: string | null; is_active?: boolean };

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = userData.user
      ? await supabase.from('profiles').select('role, is_active').eq('id', userData.user.id).maybeSingle()
      : { data: null };
    const query = supabase.from('departments').select('*').order('name', { ascending: true });
    const { data, error } = profile?.role === 'staff_admin' && profile.is_active !== false
      ? await query
      : await query.eq('is_active', true);
    if (error) return errorResponse(error, 'โหลดแผนกไม่สำเร็จ');
    return Response.json(data ?? []);
  } catch (error) {
    return errorResponse(error, 'โหลดแผนกไม่สำเร็จ');
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(['staff_admin']);
  if (!auth.ok) return auth.response;
  const body = await readJson<DepartmentInput>(request);
  if (isResponse(body)) return body;
  const name = body.name?.trim() ?? '';
  if (!name) return Response.json({ error: 'กรุณาระบุชื่อแผนก' }, { status: 400 });

  const { data, error } = await auth.supabase
    .from('departments')
    .insert({ name, description: body.description?.trim() || null, is_active: body.is_active ?? true })
    .select()
    .single();
  if (error) return errorResponse(error, 'เพิ่มแผนกไม่สำเร็จ');
  return Response.json(data, { status: 201 });
}
