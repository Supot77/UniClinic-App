import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, isResponse, parseUuid, readJson } from '../../_lib/http';

type MedicationInput = {
  name?: string; dosage?: string | null; brand_name?: string | null; type?: string; unit?: string | null; pack_unit?: string | null; pack_size?: number | null;
  category?: string; coverage_type?: 'covered' | 'non_covered' | null; manufacturer?: string | null; mfg_date?: string | null;
  stock?: number; min_stock?: number; expiry_date?: string | null; description?: string | null; ingredients?: string | null; is_active?: boolean;
};

function patchPayload(body: MedicationInput): Record<string, unknown> | Response {
  const output: Record<string, unknown> = {};
  for (const key of ['name', 'dosage', 'brand_name', 'type', 'unit', 'pack_unit', 'category', 'coverage_type', 'manufacturer', 'mfg_date', 'expiry_date', 'description', 'ingredients', 'is_active'] as const) {
    if (body[key] !== undefined) output[key] = typeof body[key] === 'string' ? body[key].trim() || null : body[key];
  }
  for (const key of ['stock', 'min_stock'] as const) {
    if (body[key] !== undefined) {
      if (!Number.isInteger(body[key]) || (body[key] as number) < 0) return Response.json({ error: 'จำนวนสต็อกต้องเป็นจำนวนเต็มไม่ติดลบ' }, { status: 400 });
      output[key] = body[key];
    }
  }
  if (body.pack_size !== undefined) {
    if (body.pack_size !== null && (!Number.isInteger(body.pack_size) || body.pack_size <= 0)) return Response.json({ error: 'ขนาดบรรจุต้องเป็นจำนวนเต็มบวก' }, { status: 400 });
    output.pack_size = body.pack_size;
  }
  if (body.coverage_type !== undefined && body.coverage_type !== null && !['covered', 'non_covered'].includes(body.coverage_type)) return Response.json({ error: 'ประเภทสิทธิ์ยาไม่ถูกต้อง' }, { status: 400 });
  return output;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสยาไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await auth.supabase.from('medications').select('*').eq('id', id).single();
  if (error) return errorResponse(error, 'โหลดรายละเอียดยาไม่สำเร็จ');
  return Response.json(data);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสยาไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<MedicationInput>(request);
  if (isResponse(body)) return body;
  const payload = patchPayload(body);
  if (payload instanceof Response) return payload;
  if (!Object.keys(payload).length) return Response.json({ error: 'ไม่มีข้อมูลสำหรับแก้ไข' }, { status: 400 });
  const { data, error } = await auth.supabase.from('medications').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return errorResponse(error, 'แก้ไขรายการยาไม่สำเร็จ');
  return Response.json(data);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสยาไม่ถูกต้อง' }, { status: 400 });

  const urlObj = new URL(request.url);
  const isPermanent = urlObj.searchParams.get('permanent') === 'true';

  if (isPermanent) {
    if (auth.actor.role !== 'medical') return Response.json({ error: 'ไม่มีสิทธิ์ลบยา' }, { status: 403 });
    const { error } = await auth.supabase.rpc('delete_unused_medication', { p_medication_id: id });
    if (error) return errorResponse(error, 'ลบยาไม่สำเร็จ');
    return Response.json({ success: true });
  }

  // Soft delete (default)
  const { data, error } = await auth.supabase
    .from('medications')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return errorResponse(error, 'ปิดใช้งานยาไม่สำเร็จ');
  return Response.json(data);
}
