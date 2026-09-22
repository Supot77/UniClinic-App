import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, isResponse, parseUuid, readJson } from '../../_lib/http';

type ServiceInput = { code?: string; name?: string; description?: string | null; is_active?: boolean };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสบริการไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<ServiceInput>(request);
  if (isResponse(body)) return body;
  const updates: ServiceInput = {};
  if (body.code !== undefined) updates.code = body.code.trim();
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (updates.code === '') return Response.json({ error: 'รหัสบริการห้ามว่าง' }, { status: 400 });
  if (updates.name === '') return Response.json({ error: 'ชื่อบริการห้ามว่าง' }, { status: 400 });
  if (!Object.keys(updates).length) return Response.json({ error: 'ไม่มีข้อมูลสำหรับแก้ไข' }, { status: 400 });
  const { data, error } = await auth.supabase.from('services').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return errorResponse(error, 'แก้ไขบริการไม่สำเร็จ');
  return Response.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสบริการไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await auth.supabase.from('services').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return errorResponse(error, 'ปิดบริการไม่สำเร็จ');
  return Response.json(data);
}
