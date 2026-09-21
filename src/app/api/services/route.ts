import { requireApiAuth } from '../_lib/auth';
import { errorResponse, isResponse, readJson } from '../_lib/http';
import { createClient } from '@/utils/supabase/server';

type ServiceInput = { code?: string; name?: string; description?: string | null; is_active?: boolean };

export async function GET() {
  let supabase;
  try { supabase = await createClient(); } catch (error) { return errorResponse(error, 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Supabase'); }
  const { data: userData } = await supabase.auth.getUser();
  const { data: profile } = userData.user
    ? await supabase.from('profiles').select('role, is_active').eq('id', userData.user.id).maybeSingle()
    : { data: null };
  const query = supabase.from('services').select('*').order('name', { ascending: true });
  const { data, error } = profile?.role === 'staff_admin' || profile?.role === 'medical'
    ? await query
    : await query.eq('is_active', true);
  if (error) return errorResponse(error, 'โหลดบริการไม่สำเร็จ');
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const body = await readJson<ServiceInput>(request);
  if (isResponse(body)) return body;
  const code = body.code?.trim() ?? '';
  const name = body.name?.trim() ?? '';
  if (!code || !name) return Response.json({ error: 'กรุณาระบุรหัสและชื่อบริการ' }, { status: 400 });
  const { data, error } = await auth.supabase.from('services').insert({
    code, name, description: body.description?.trim() || null, is_active: body.is_active ?? true, created_by: auth.actor.id,
  }).select().single();
  if (error) return errorResponse(error, 'เพิ่มบริการไม่สำเร็จ');
  return Response.json(data, { status: 201 });
}
