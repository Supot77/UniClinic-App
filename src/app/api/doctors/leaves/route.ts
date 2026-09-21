import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, isResponse, parseDate, parseUuid, readJson } from '../../_lib/http';

type LeaveInput = { doctorId?: string; doctor_id?: string; startDate?: string; start_date?: string; endDate?: string; end_date?: string; reason?: string | null };

function clinicToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

export async function GET(request: Request) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const doctorId = url.searchParams.get('doctorId');
  const query = auth.supabase.from('doctor_leaves').select('*').order('start_date', { ascending: true });
  const scoped = auth.actor.role === 'medical' ? query.eq('doctor_id', auth.actor.id) : doctorId ? query.eq('doctor_id', doctorId) : query;
  const { data, error } = await scoped;
  if (error) return errorResponse(error, 'โหลดวันลาไม่สำเร็จ');
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const body = await readJson<LeaveInput>(request);
  if (isResponse(body)) return body;
  const doctorId = parseUuid(body.doctorId ?? body.doctor_id);
  const startDate = parseDate(body.startDate ?? body.start_date);
  const endDate = parseDate(body.endDate ?? body.end_date);
  if (!doctorId || !startDate || !endDate || startDate > endDate) return Response.json({ error: 'ข้อมูลช่วงวันลาไม่ถูกต้อง' }, { status: 400 });
  if (startDate < clinicToday()) return Response.json({ error: 'ไม่สามารถบันทึกวันลาในอดีตได้' }, { status: 400 });
  if (auth.actor.role === 'medical' && doctorId !== auth.actor.id) return Response.json({ error: 'แพทย์จัดการได้เฉพาะวันลาของตนเอง' }, { status: 403 });
  if (body.reason && body.reason.trim().length > 1000) return Response.json({ error: 'เหตุผลวันลายาวเกินกำหนด' }, { status: 400 });
  const [{ data: doctor, error: doctorError }, { data: overlaps, error: overlapError }] = await Promise.all([
    auth.supabase.from('doctors').select('id').eq('id', doctorId).maybeSingle(),
    auth.supabase.from('doctor_leaves').select('id').eq('doctor_id', doctorId).lte('start_date', endDate).gte('end_date', startDate),
  ]);
  if (doctorError) return errorResponse(doctorError, 'ตรวจสอบแพทย์ไม่สำเร็จ');
  if (overlapError) return errorResponse(overlapError, 'ตรวจสอบวันลาเดิมไม่สำเร็จ');
  if (!doctor) return Response.json({ error: 'ไม่พบแพทย์ที่ต้องการบันทึกวันลา' }, { status: 404 });
  if ((overlaps ?? []).length) return Response.json({ error: 'ช่วงวันลาซ้ำซ้อนกับวันลาเดิมของแพทย์' }, { status: 409 });
  const { data, error } = await auth.supabase.from('doctor_leaves').insert({ doctor_id: doctorId, start_date: startDate, end_date: endDate, reason: body.reason?.trim() || null, created_by: auth.actor.id }).select().single();
  if (error) return errorResponse(error, 'บันทึกวันลาไม่สำเร็จ');
  return Response.json(data, { status: 201 });
}
