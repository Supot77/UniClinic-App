import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, isResponse, parseDate, parseUuid, readJson } from '../../_lib/http';

type ReminderInput = { reminderTimes?: string[]; reminder_times?: string[]; startDate?: string; start_date?: string; endDate?: string | null; end_date?: string | null; status?: string };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['patient', 'medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสรายการเตือนยาไม่ถูกต้อง' }, { status: 400 });
  let query = auth.supabase.from('medication_reminders').select('*, medication:medications(*)').eq('id', id);
  if (auth.actor.role === 'patient') {
    query = query.eq('user_id', auth.actor.id);
  }
  const { data, error } = await query.single();
  if (error) return errorResponse(error, 'โหลดรายการเตือนยาไม่สำเร็จ');
  return Response.json(data);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['patient', 'medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสรายการเตือนยาไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<ReminderInput>(request);
  if (isResponse(body)) return body;
  const updates: Record<string, unknown> = {};
  if (body.reminderTimes !== undefined || body.reminder_times !== undefined) {
    const times = body.reminderTimes ?? body.reminder_times;
    if (!Array.isArray(times) || !times.length || times.some((time) => typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time))) return Response.json({ error: 'เวลาเตือนยาไม่ถูกต้อง' }, { status: 400 });
    updates.reminder_times = times;
  }
  if (body.startDate !== undefined || body.start_date !== undefined) {
    const date = parseDate(body.startDate ?? body.start_date);
    if (!date) return Response.json({ error: 'วันที่เริ่มเตือนไม่ถูกต้อง' }, { status: 400 });
    updates.start_date = date;
  }
  if (body.endDate !== undefined || body.end_date !== undefined) {
    const date = body.endDate ?? body.end_date;
    if (date !== null && !parseDate(date)) return Response.json({ error: 'วันที่สิ้นสุดไม่ถูกต้อง' }, { status: 400 });
    updates.end_date = date;
  }
  if (body.status !== undefined) {
    if (!['pending_confirmation', 'active', 'completed', 'cancelled', 'paused'].includes(body.status)) return Response.json({ error: 'สถานะการเตือนไม่ถูกต้อง' }, { status: 400 });
    updates.status = body.status;
  }
  if (!Object.keys(updates).length) return Response.json({ error: 'ไม่มีข้อมูลสำหรับแก้ไข' }, { status: 400 });
  let query = auth.supabase.from('medication_reminders').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
  if (auth.actor.role === 'patient') {
    query = query.eq('user_id', auth.actor.id);
  }
  const { data, error } = await query.select('*, medication:medications(*)').single();
  if (error) return errorResponse(error, 'แก้ไขรายการเตือนยาไม่สำเร็จ');
  return Response.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['patient', 'medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสรายการเตือนยาไม่ถูกต้อง' }, { status: 400 });
  let query = auth.supabase.from('medication_reminders').delete().eq('id', id);
  if (auth.actor.role === 'patient') {
    query = query.eq('user_id', auth.actor.id);
  }
  const { error } = await query;
  if (error) return errorResponse(error, 'ลบรายการเตือนยาไม่สำเร็จ');
  return new Response(null, { status: 204 });
}
