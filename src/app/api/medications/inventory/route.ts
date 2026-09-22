import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, isResponse, parsePositiveInt, parseUuid, readJson } from '../../_lib/http';

type InventoryInput = { medicationId?: string; medication_id?: string; action?: string; quantity?: number; reason?: string | null };

export async function GET(request: Request) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const medicationId = new URL(request.url).searchParams.get('medicationId');
  if (medicationId && !parseUuid(medicationId)) return Response.json({ error: 'รหัสยาไม่ถูกต้อง' }, { status: 400 });
  let query = auth.supabase.from('inventory_logs').select('*, medication:medications(name), pharmacist:profiles(title, first_name, last_name)').order('created_at', { ascending: false });
  if (medicationId) query = query.eq('medication_id', medicationId);
  const { data, error } = await query;
  if (error) return errorResponse(error, 'โหลดประวัติคลังยาไม่สำเร็จ');
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const body = await readJson<InventoryInput>(request);
  if (isResponse(body)) return body;
  const medicationId = parseUuid(body.medicationId ?? body.medication_id);
  const quantity = parsePositiveInt(body.quantity);
  if (!medicationId || !quantity || !['add', 'dispense', 'adjust', 'damage'].includes(body.action ?? '')) return Response.json({ error: 'ข้อมูลรายการคลังยาไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await auth.supabase.from('inventory_logs').insert({ medication_id: medicationId, pharmacist_id: auth.actor.id, action: body.action, quantity, reason: body.reason?.trim() || null, performed_by: auth.actor.id }).select().single();
  if (error) return errorResponse(error, 'บันทึกรายการคลังยาไม่สำเร็จ');
  return Response.json(data, { status: 201 });
}
