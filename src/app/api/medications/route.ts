import { requireApiAuth } from '../_lib/auth';
import { errorResponse, isResponse, readJson } from '../_lib/http';

type MedicationInput = {
  name?: string; dosage?: string | null; brand_name?: string | null; type?: string; unit?: string | null; pack_unit?: string | null; pack_size?: number | null;
  category?: string; coverage_type?: 'covered' | 'non_covered' | null; manufacturer?: string | null; mfg_date?: string | null;
  stock?: number; min_stock?: number; expiry_date?: string | null; description?: string | null; ingredients?: string | null; is_active?: boolean;
};

function medicationPayload(body: MedicationInput, partial = false): Record<string, unknown> | Response {
  const output: Record<string, unknown> = {};
  const textFields = ['name', 'dosage', 'brand_name', 'type', 'unit', 'pack_unit', 'category', 'coverage_type', 'manufacturer', 'mfg_date', 'expiry_date', 'description', 'ingredients', 'is_active'] as const;
  for (const key of textFields) {
    if (!partial || body[key] !== undefined) output[key] = typeof body[key] === 'string' ? body[key].trim() || null : body[key];
  }
  if (!partial || body.pack_size !== undefined) output.pack_size = body.pack_size ?? null;
  if (!partial || body.stock !== undefined) output.stock = body.stock;
  if (!partial || body.min_stock !== undefined) output.min_stock = body.min_stock;
  if (typeof output.name === 'string' && !output.name) return Response.json({ error: 'กรุณาระบุชื่อยา' }, { status: 400 });
  if (typeof output.type === 'string' && !output.type) return Response.json({ error: 'กรุณาระบุรูปแบบยา' }, { status: 400 });
  if (typeof output.category === 'string' && !output.category) return Response.json({ error: 'กรุณาระบุหมวดยา' }, { status: 400 });
  for (const key of ['stock', 'min_stock'] as const) {
    const value = output[key];
    if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) return Response.json({ error: 'จำนวนสต็อกต้องเป็นจำนวนเต็มไม่ติดลบ' }, { status: 400 });
  }
  const packSize = output.pack_size;
  if (packSize !== undefined && packSize !== null && (typeof packSize !== 'number' || !Number.isInteger(packSize) || packSize <= 0)) return Response.json({ error: 'ขนาดบรรจุต้องเป็นจำนวนเต็มบวก' }, { status: 400 });
  if (output.coverage_type !== undefined && output.coverage_type !== null && !['covered', 'non_covered'].includes(String(output.coverage_type))) return Response.json({ error: 'ประเภทสิทธิ์ยาไม่ถูกต้อง' }, { status: 400 });
  return output;
}

export async function GET(request: Request) {
  const auth = await requireApiAuth(['patient', 'medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get('activeOnly') !== 'false';
  let query = auth.supabase.from('medications').select('*').order('name', { ascending: true });
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) return errorResponse(error, 'โหลดรายการยาไม่สำเร็จ');
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const body = await readJson<MedicationInput>(request);
  if (isResponse(body)) return body;
  const payload = medicationPayload(body);
  if (payload instanceof Response) return payload;
  const { data, error } = await auth.supabase.from('medications').insert(payload).select().single();
  if (error) return errorResponse(error, 'เพิ่มรายการยาไม่สำเร็จ');
  return Response.json(data, { status: 201 });
}
