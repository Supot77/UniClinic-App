import { requireApiAuth } from '../_lib/auth';
import { errorResponse, isResponse, parseUuid, readJson } from '../_lib/http';

type AppointmentInput = { slotId?: string; slot_id?: string; reason?: string };

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  const select = 'id, patient_id, slot_id, queue_number, reason, status, cancel_requested_at, rejection_reason, created_at, updated_at, slot:appointment_slots(id, doctor_id, slot_date, start_time, end_time, max_capacity, booked_count, status, doctor:doctors(id, specialty, department_id, profile:profiles(id, full_name), department:departments(id, name))), patient:profiles(id, full_name, phone)';
  let query = auth.supabase.from('appointments').select(select).order('created_at', { ascending: false });
  if (auth.actor.role === 'patient') query = query.eq('patient_id', auth.actor.id);
  const { data, error } = await query;
  if (error) return errorResponse(error, 'โหลดนัดหมายไม่สำเร็จ');
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(['patient']);
  if (!auth.ok) return auth.response;
  const body = await readJson<AppointmentInput>(request);
  if (isResponse(body)) return body;
  const slotId = parseUuid(body.slotId ?? body.slot_id);
  const reason = body.reason?.trim() ?? '';
  if (!slotId || !reason || reason.length > 2000) return Response.json({ error: 'กรุณาระบุรอบตรวจและอาการหรือเหตุผลไม่เกิน 2000 ตัวอักษร' }, { status: 400 });
  const { data, error } = await auth.supabase.rpc('pai_book_appointment', { p_slot_id: slotId, p_reason: reason });
  if (error) return errorResponse(error, 'ส่งคำขอจองคิวไม่สำเร็จ');
  return Response.json({ id: data }, { status: 201 });
}
