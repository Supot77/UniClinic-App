import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, isResponse, parseUuid, readJson } from '../../_lib/http';

type DepartmentInput = { name?: string; description?: string | null; is_active?: boolean };

async function getId(context: { params: Promise<{ id: string }> }) {
  return parseUuid((await context.params).id);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  const id = await getId(context);
  if (!id) return Response.json({ error: 'รหัสแผนกไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await auth.supabase.from('departments').select('*').eq('id', id).single();
  if (error) return errorResponse(error, 'โหลดแผนกไม่สำเร็จ');
  return Response.json(data);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['staff_admin']);
  if (!auth.ok) return auth.response;
  const id = await getId(context);
  if (!id) return Response.json({ error: 'รหัสแผนกไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<DepartmentInput>(request);
  if (isResponse(body)) return body;
  const updates: DepartmentInput = {};
  if (body.name !== undefined) {
    updates.name = body.name.trim();
    if (!updates.name) return Response.json({ error: 'ชื่อแผนกห้ามว่าง' }, { status: 400 });
  }
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (!Object.keys(updates).length) return Response.json({ error: 'ไม่มีข้อมูลสำหรับแก้ไข' }, { status: 400 });

  const { data, error } = await auth.supabase.from('departments').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return errorResponse(error, 'แก้ไขแผนกไม่สำเร็จ');
  return Response.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['staff_admin']);
  if (!auth.ok) return auth.response;
  const id = await getId(context);
  if (!id) return Response.json({ error: 'รหัสแผนกไม่ถูกต้อง' }, { status: 400 });
  const { error } = await auth.supabase.from('departments').delete().eq('id', id);
  if (error) return errorResponse(error, 'ลบแผนกไม่สำเร็จ');
  return new Response(null, { status: 204 });
}
