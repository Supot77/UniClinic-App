import { requireApiAuth } from '../../../_lib/auth';
import { errorResponse, isResponse, parseUuid, readJson } from '../../../_lib/http';

type LogInput = { scheduledDatetime?: string; scheduled_datetime?: string; status?: 'taken' | 'missed' };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['patient']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสรายการเตือนยาไม่ถูกต้อง' }, { status: 400 });
  const { data: reminder } = await auth.supabase.from('medication_reminders').select('id').eq('id', id).eq('user_id', auth.actor.id).maybeSingle();
  if (!reminder) return Response.json({ error: 'ไม่พบรายการเตือนยา' }, { status: 404 });
  const { data, error } = await auth.supabase.from('medication_logs').select('*').eq('reminder_id', id).order('scheduled_datetime', { ascending: false });
  if (error) return errorResponse(error, 'โหลดประวัติการกินยาไม่สำเร็จ');
  return Response.json(data ?? []);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['patient']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสรายการเตือนยาไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<LogInput>(request);
  if (isResponse(body)) return body;
  const scheduled = body.scheduledDatetime ?? body.scheduled_datetime;
  if (!scheduled || !body.status || !['taken', 'missed'].includes(body.status)) return Response.json({ error: 'ข้อมูลการกินยาไม่ถูกต้อง' }, { status: 400 });
  const { data: reminder } = await auth.supabase.from('medication_reminders').select('id').eq('id', id).eq('user_id', auth.actor.id).maybeSingle();
  if (!reminder) return Response.json({ error: 'ไม่พบรายการเตือนยา' }, { status: 404 });
  const { data, error } = await auth.supabase.from('medication_logs').upsert({ reminder_id: id, scheduled_datetime: scheduled, actual_datetime: body.status === 'taken' ? new Date().toISOString() : null, status: body.status }, { onConflict: 'reminder_id,scheduled_datetime' }).select().single();
  if (error) return errorResponse(error, 'บันทึกประวัติการกินยาไม่สำเร็จ');
  return Response.json(data, { status: 201 });
}
