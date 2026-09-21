import { requireApiAuth } from '../../../_lib/auth';
import { errorResponse, isResponse, parseDate, parseUuid, readJson } from '../../../_lib/http';

type LeaveInput = { doctorId?: string; doctor_id?: string; startDate?: string; start_date?: string; endDate?: string; end_date?: string; reason?: string | null };

function clinicToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสวันลาไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<LeaveInput>(request);
  if (isResponse(body)) return body;
  const { data: existing, error: existingError } = await auth.supabase.from('doctor_leaves').select('id, doctor_id, start_date, end_date').eq('id', id).maybeSingle();
  if (existingError) return errorResponse(existingError, 'โหลดวันลาเดิมไม่สำเร็จ');
  if (!existing) return Response.json({ error: 'ไม่พบวันลาที่ต้องการแก้ไข' }, { status: 404 });
  if (auth.actor.role === 'medical' && existing.doctor_id !== auth.actor.id) return Response.json({ error: 'แพทย์จัดการได้เฉพาะวันลาของตนเอง' }, { status: 403 });
  const updates: Record<string, unknown> = {};
  if (body.doctorId !== undefined || body.doctor_id !== undefined) {
    const doctorId = parseUuid(body.doctorId ?? body.doctor_id);
    if (!doctorId) return Response.json({ error: 'รหัสแพทย์ไม่ถูกต้อง' }, { status: 400 });
    if (auth.actor.role === 'medical' && doctorId !== auth.actor.id) return Response.json({ error: 'แพทย์จัดการได้เฉพาะวันลาของตนเอง' }, { status: 403 });
    updates.doctor_id = doctorId;
  }
  if (body.startDate !== undefined || body.start_date !== undefined) {
    const date = parseDate(body.startDate ?? body.start_date);
    if (!date) return Response.json({ error: 'วันที่เริ่มไม่ถูกต้อง' }, { status: 400 });
    updates.start_date = date;
  }
  if (body.endDate !== undefined || body.end_date !== undefined) {
    const date = parseDate(body.endDate ?? body.end_date);
    if (!date) return Response.json({ error: 'วันที่สิ้นสุดไม่ถูกต้อง' }, { status: 400 });
    updates.end_date = date;
  }
  if (body.reason !== undefined) updates.reason = body.reason?.trim() || null;
  if (!Object.keys(updates).length) return Response.json({ error: 'ไม่มีข้อมูลสำหรับแก้ไข' }, { status: 400 });
  if (typeof updates.reason === 'string' && updates.reason.length > 1000) return Response.json({ error: 'เหตุผลวันลายาวเกินกำหนด' }, { status: 400 });
  const doctorId = typeof updates.doctor_id === 'string' ? updates.doctor_id : existing.doctor_id;
  const startDate = typeof updates.start_date === 'string' ? updates.start_date : existing.start_date;
  const endDate = typeof updates.end_date === 'string' ? updates.end_date : existing.end_date;
  if (startDate > endDate) return Response.json({ error: 'วันเริ่มลาต้องไม่เกินวันสิ้นสุด' }, { status: 400 });
  if (startDate < clinicToday()) return Response.json({ error: 'ไม่สามารถบันทึกวันลาในอดีตได้' }, { status: 400 });
  const [{ data: doctor, error: doctorError }, { data: overlaps, error: overlapError }] = await Promise.all([
    auth.supabase.from('doctors').select('id').eq('id', doctorId).maybeSingle(),
    auth.supabase.from('doctor_leaves').select('id').eq('doctor_id', doctorId).neq('id', id).lte('start_date', endDate).gte('end_date', startDate),
  ]);
  if (doctorError) return errorResponse(doctorError, 'ตรวจสอบแพทย์ไม่สำเร็จ');
  if (overlapError) return errorResponse(overlapError, 'ตรวจสอบวันลาเดิมไม่สำเร็จ');
  if (!doctor) return Response.json({ error: 'ไม่พบแพทย์ที่ต้องการบันทึกวันลา' }, { status: 404 });
  if ((overlaps ?? []).length) return Response.json({ error: 'ช่วงวันลาซ้ำซ้อนกับวันลาเดิมของแพทย์' }, { status: 409 });
  const query = auth.supabase.from('doctor_leaves').update({ ...updates, doctor_id: doctorId, start_date: startDate, end_date: endDate }).eq('id', id);
  const { data, error } = await (auth.actor.role === 'medical' ? query.eq('doctor_id', auth.actor.id) : query).select().single();
  if (error) return errorResponse(error, 'แก้ไขวันลาไม่สำเร็จ');
  return Response.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสวันลาไม่ถูกต้อง' }, { status: 400 });
  const query = auth.supabase.from('doctor_leaves').delete().eq('id', id);
  const { error } = auth.actor.role === 'medical' ? await query.eq('doctor_id', auth.actor.id) : await query;
  if (error) return errorResponse(error, 'ยกเลิกวันลาไม่สำเร็จ');
  return new Response(null, { status: 204 });
}
