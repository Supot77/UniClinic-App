import { requireApiAuth } from '../../../_lib/auth';
import { errorResponse, isResponse, parseUuid, readJson } from '../../../_lib/http';

type StatusInput = { status?: string; action?: string; reason?: string | null };
const allowedActions = ['confirm', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected', 'request_cancel'] as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['patient', 'medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสนัดหมายไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<StatusInput>(request);
  if (isResponse(body)) return body;
  const rawAction = body.action ?? body.status;
  const action = rawAction === 'confirm' ? 'confirmed' : rawAction;
  if (!action || !allowedActions.includes(action as (typeof allowedActions)[number])) return Response.json({ error: 'สถานะนัดหมายไม่ถูกต้อง' }, { status: 400 });
  const reason = action === 'rejected' ? body.reason?.trim() ?? '' : null;
  if (action === 'rejected' && (!reason || reason.length > 2000)) return Response.json({ error: 'กรุณาระบุเหตุผลการปฏิเสธไม่เกิน 2000 ตัวอักษร' }, { status: 400 });
  const { error } = await auth.supabase.rpc('pai_transition_appointment', { p_appointment_id: id, p_action: action, p_reason: reason });
  if (error) return errorResponse(error, 'เปลี่ยนสถานะนัดหมายไม่สำเร็จ');
  return Response.json({ id, status: action });
}
