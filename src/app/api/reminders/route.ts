import { requireApiAuth } from '../_lib/auth';
import { errorResponse, isResponse, parseDate, parseUuid, readJson } from '../_lib/http';

type ReminderInput = { id?: string; medicationId?: string; medication_id?: string; reminderTimes?: string[]; reminder_times?: string[]; startDate?: string; start_date?: string; endDate?: string | null; end_date?: string | null; status?: string };

function payload(body: ReminderInput, userId: string, partial = false): Record<string, unknown> | Response {
  const output: Record<string, unknown> = {};
  if (!partial || body.medicationId !== undefined || body.medication_id !== undefined) {
    const medicationId = parseUuid(body.medicationId ?? body.medication_id);
    if (!medicationId) return Response.json({ error: 'รหัสยาไม่ถูกต้อง' }, { status: 400 });
    output.medication_id = medicationId;
  }
  if (!partial || body.reminderTimes !== undefined || body.reminder_times !== undefined) {
    const times = body.reminderTimes ?? body.reminder_times;
    if (!Array.isArray(times) || times.length === 0 || times.some((time) => typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time))) return Response.json({ error: 'เวลาเตือนยาไม่ถูกต้อง' }, { status: 400 });
    output.reminder_times = times;
  }
  if (!partial || body.startDate !== undefined || body.start_date !== undefined) {
    const date = parseDate(body.startDate ?? body.start_date);
    if (!date) return Response.json({ error: 'วันที่เริ่มเตือนไม่ถูกต้อง' }, { status: 400 });
    output.start_date = date;
  }
  if (body.endDate !== undefined || body.end_date !== undefined) {
    const date = body.endDate ?? body.end_date;
    if (date !== null && !parseDate(date)) return Response.json({ error: 'วันที่สิ้นสุดไม่ถูกต้อง' }, { status: 400 });
    output.end_date = date;
  }
  if (body.status !== undefined) {
    if (!['pending_confirmation', 'active', 'completed', 'cancelled', 'paused'].includes(body.status)) return Response.json({ error: 'สถานะการเตือนไม่ถูกต้อง' }, { status: 400 });
    output.status = body.status;
  }
  return output;
}

export async function GET() {
  const auth = await requireApiAuth(['patient']);
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase.from('medication_reminders').select('*, medication:medications(*)').eq('user_id', auth.actor.id).order('created_at', { ascending: false });
  if (error) return errorResponse(error, 'โหลดรายการเตือนยาไม่สำเร็จ');
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(['patient']);
  if (!auth.ok) return auth.response;
  const body = await readJson<ReminderInput>(request);
  if (isResponse(body)) return body;
  const values = payload(body, auth.actor.id);
  if (values instanceof Response) return values;
  const { data, error } = await auth.supabase.from('medication_reminders').insert({ ...values, user_id: auth.actor.id, created_by: auth.actor.id, status: body.status ?? 'active' }).select('*, medication:medications(*)').single();
  if (error) return errorResponse(error, 'สร้างรายการเตือนยาไม่สำเร็จ');
  return Response.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireApiAuth(['patient']);
  if (!auth.ok) return auth.response;
  const body = await readJson<ReminderInput>(request);
  if (isResponse(body)) return body;
  const id = parseUuid(body.id);
  if (!id) return Response.json({ error: 'ต้องระบุรหัสรายการเตือนยา' }, { status: 400 });
  const values = payload(body, auth.actor.id, true);
  if (values instanceof Response) return values;
  if (!Object.keys(values).length) return Response.json({ error: 'ไม่มีข้อมูลสำหรับแก้ไข' }, { status: 400 });
  const { data, error } = await auth.supabase.from('medication_reminders').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', auth.actor.id).select('*, medication:medications(*)').single();
  if (error) return errorResponse(error, 'แก้ไขรายการเตือนยาไม่สำเร็จ');
  return Response.json(data);
}
