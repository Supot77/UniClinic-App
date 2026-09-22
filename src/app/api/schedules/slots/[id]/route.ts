import { requireApiAuth } from '../../../_lib/auth';
import { errorResponse, isResponse, parseDate, parsePositiveInt, parseUuid, readJson } from '../../../_lib/http';

type SlotPatch = { status?: 'available' | 'full' | 'closed'; slotDate?: string; slot_date?: string; startTime?: string; start_time?: string; endTime?: string; end_time?: string; maxCapacity?: number; max_capacity?: number };

function time(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour <= 23 && minute <= 59 ? value : null;
}

function clinicToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

function isWeekday(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

function validateWindow(startTime: string, endTime: string): string | null {
  if (startTime >= endTime) return 'เวลาเริ่มต้องน้อยกว่าสิ้นสุด';
  if (startTime < '08:30' || endTime > '16:30') return 'รอบตรวจต้องอยู่ระหว่าง 08:30–16:30 น.';
  if (startTime < '13:00' && endTime > '12:00') return 'ไม่สามารถสร้างรอบทับช่วงพัก 12:00–13:00 น.';
  return null;
}

async function idOf(context: { params: Promise<{ id: string }> }) {
  return parseUuid((await context.params).id);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  const id = await idOf(context);
  if (!id) return Response.json({ error: 'รหัสรอบตรวจไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await auth.supabase.from('appointment_slots').select('*, offering:daily_service_offerings(service_id, offering_date, is_active), doctor:doctors(id, profile:profiles(id, title, first_name, last_name), department:departments(id, name))').eq('id', id).single();
  if (error) return errorResponse(error, 'โหลดรอบตรวจไม่สำเร็จ');
  return Response.json(data);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = await idOf(context);
  if (!id) return Response.json({ error: 'รหัสรอบตรวจไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<SlotPatch>(request);
  if (isResponse(body)) return body;
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!['available', 'full', 'closed'].includes(body.status)) return Response.json({ error: 'สถานะรอบตรวจไม่ถูกต้อง' }, { status: 400 });
    updates.status = body.status;
  }
  if (body.slotDate !== undefined || body.slot_date !== undefined) {
    const value = parseDate(body.slotDate ?? body.slot_date);
    if (!value) return Response.json({ error: 'วันที่ไม่ถูกต้อง' }, { status: 400 });
    updates.slot_date = value;
  }
  if (body.startTime !== undefined || body.start_time !== undefined) {
    const value = time(body.startTime ?? body.start_time);
    if (!value) return Response.json({ error: 'เวลาเริ่มไม่ถูกต้อง' }, { status: 400 });
    updates.start_time = value;
  }
  if (body.endTime !== undefined || body.end_time !== undefined) {
    const value = time(body.endTime ?? body.end_time);
    if (!value) return Response.json({ error: 'เวลาสิ้นสุดไม่ถูกต้อง' }, { status: 400 });
    updates.end_time = value;
  }
  if (body.maxCapacity !== undefined || body.max_capacity !== undefined) {
    const value = parsePositiveInt(body.maxCapacity ?? body.max_capacity);
    if (!value) return Response.json({ error: 'จำนวนผู้รับบริการไม่ถูกต้อง' }, { status: 400 });
    updates.max_capacity = value;
  }
  if (!Object.keys(updates).length) return Response.json({ error: 'ไม่มีข้อมูลสำหรับแก้ไข' }, { status: 400 });
  const { data: existing, error: existingError } = await auth.supabase
    .from('appointment_slots')
    .select('id, doctor_id, daily_service_offering_id, slot_date, start_time, end_time, max_capacity, booked_count, status')
    .eq('id', id)
    .maybeSingle();
  if (existingError) return errorResponse(existingError, 'โหลดรอบตรวจเดิมไม่สำเร็จ');
  if (!existing) return Response.json({ error: 'ไม่พบรอบตรวจที่ต้องการแก้ไข' }, { status: 404 });
  if (auth.actor.role === 'medical' && existing.doctor_id !== auth.actor.id) return Response.json({ error: 'ไม่มีสิทธิ์จัดการรอบตรวจของแพทย์ท่านอื่น' }, { status: 403 });
  if (typeof updates.max_capacity === 'number' && updates.max_capacity < existing.booked_count) return Response.json({ error: 'จำนวนผู้รับบริการห้ามน้อยกว่าจำนวนที่จองแล้ว' }, { status: 400 });

  const targetDate = typeof updates.slot_date === 'string' ? updates.slot_date : existing.slot_date;
  const targetStart = typeof updates.start_time === 'string' ? updates.start_time : existing.start_time;
  const targetEnd = typeof updates.end_time === 'string' ? updates.end_time : existing.end_time;
  const targetCapacity = typeof updates.max_capacity === 'number' ? updates.max_capacity : existing.max_capacity;
  const hasSlotDetailsUpdate = Object.keys(updates).some((key) => key !== 'status');
  if (hasSlotDetailsUpdate) {
    const currentDate = clinicToday();
    const currentTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
    if (targetDate < currentDate || (targetDate === currentDate && targetStart <= currentTime)) {
      return Response.json({ error: 'แก้ไขไม่ได้ เพราะรอบตรวจเริ่มไปแล้ว' }, { status: 400 });
    }
  }
  if (!isWeekday(targetDate)) return Response.json({ error: 'คลินิกเปิดรอบตรวจเฉพาะวันจันทร์ถึงศุกร์' }, { status: 400 });
  if (targetDate < clinicToday() && targetDate !== existing.slot_date) return Response.json({ error: 'ไม่สามารถย้ายรอบตรวจไปวันในอดีตได้' }, { status: 400 });
  const windowError = validateWindow(targetStart, targetEnd);
  if (windowError) return Response.json({ error: windowError }, { status: 400 });

  const { data: offering, error: offeringError } = await auth.supabase
    .from('daily_service_offerings')
    .select('service_id')
    .eq('id', existing.daily_service_offering_id)
    .maybeSingle();
  if (offeringError) return errorResponse(offeringError, 'ตรวจสอบบริการของรอบตรวจไม่สำเร็จ');
  if (!offering) return Response.json({ error: 'ไม่พบบริการของรอบตรวจ' }, { status: 404 });
  const ownerError = await auth.supabase
    .from('doctors')
    .select('id')
    .eq('id', existing.doctor_id)
    .maybeSingle();
  if (ownerError.error) return errorResponse(ownerError.error, 'ตรวจสอบแพทย์ไม่สำเร็จ');
  const [{ data: profile, error: profileError }, { data: service, error: serviceError }] = await Promise.all([
    auth.supabase.from('profiles').select('role, is_active').eq('id', existing.doctor_id).maybeSingle(),
    auth.supabase.from('services').select('is_active').eq('id', offering.service_id).maybeSingle(),
  ]);
  if (profileError) return errorResponse(profileError, 'ตรวจสอบบัญชีแพทย์ไม่สำเร็จ');
  if (serviceError) return errorResponse(serviceError, 'ตรวจสอบบริการไม่สำเร็จ');
  if (!ownerError.data || !profile || profile.role !== 'medical' || profile.is_active !== true) return Response.json({ error: 'แพทย์ต้องเปิดใช้งานก่อนแก้ไขรอบ' }, { status: 400 });
  if (!service || service.is_active !== true) return Response.json({ error: 'บริการของรอบนี้ถูกปิดใช้งาน' }, { status: 400 });

  if (updates.status === 'available' && existing.status === 'closed') {
    const now = new Date();
    const currentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now);
    const currentTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    if (targetDate < currentDate || (targetDate === currentDate && targetStart <= currentTime)) return Response.json({ error: 'ไม่สามารถเปิดรอบตรวจที่เลยเวลาเริ่มแล้ว' }, { status: 400 });
    if (existing.booked_count >= targetCapacity) return Response.json({ error: 'ไม่สามารถเปิดรอบตรวจที่คนเต็มแล้ว' }, { status: 400 });
  }
  if (updates.slot_date !== undefined || updates.start_time !== undefined || updates.end_time !== undefined) {
    const { data: leaves, error: leaveError } = await auth.supabase.from('doctor_leaves').select('start_date, end_date').eq('doctor_id', existing.doctor_id).lte('start_date', targetDate).gte('end_date', targetDate);
    if (leaveError) return errorResponse(leaveError, 'ตรวจสอบวันลาแพทย์ไม่สำเร็จ');
    if ((leaves ?? []).length && targetDate !== existing.slot_date) return Response.json({ error: 'แพทย์มีวันลาในวันที่เลือก ไม่สามารถย้ายรอบตรวจได้' }, { status: 400 });
    const { data: conflicts, error: conflictError } = await auth.supabase.from('appointment_slots').select('start_time, end_time').eq('doctor_id', existing.doctor_id).eq('slot_date', targetDate).neq('id', id);
    if (conflictError) return errorResponse(conflictError, 'ตรวจสอบรอบตรวจซ้ำไม่สำเร็จ');
    if ((conflicts ?? []).some((slot) => targetStart < slot.end_time && targetEnd > slot.start_time)) return Response.json({ error: 'แพทย์มีรอบเวลาทับซ้อนกับรายการเดิม' }, { status: 409 });
  }
  if (updates.slot_date !== undefined) {
    const { data: nextOffering, error: nextOfferingError } = await auth.supabase.from('daily_service_offerings').upsert({ service_id: offering.service_id, doctor_id: existing.doctor_id, offering_date: targetDate, is_active: true, created_by: auth.actor.id }, { onConflict: 'service_id,doctor_id,offering_date' }).select('id').single();
    if (nextOfferingError || !nextOffering) return errorResponse(nextOfferingError, 'เตรียมบริการประจำวันไม่สำเร็จ');
    updates.daily_service_offering_id = nextOffering.id;
  }
  const nextStatus = updates.status ?? (existing.status === 'closed' ? 'closed' : existing.booked_count >= targetCapacity ? 'full' : 'available');
  const { data, error } = await auth.supabase.from('appointment_slots').update({ ...updates, status: nextStatus, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return errorResponse(error, 'แก้ไขรอบตรวจไม่สำเร็จ');
  return Response.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const id = await idOf(context);
  if (!id) return Response.json({ error: 'รหัสรอบตรวจไม่ถูกต้อง' }, { status: 400 });
  const { data: existing } = await auth.supabase.from('appointment_slots').select('doctor_id, booked_count').eq('id', id).maybeSingle();
  if (auth.actor.role === 'medical' && existing?.doctor_id !== auth.actor.id) return Response.json({ error: 'ไม่มีสิทธิ์จัดการรอบตรวจของแพทย์ท่านอื่น' }, { status: 403 });
  if (existing && existing.booked_count > 0) return Response.json({ error: 'ไม่สามารถลบรอบตรวจที่มีผู้จองแล้ว' }, { status: 409 });
  const { error } = await auth.supabase.from('appointment_slots').delete().eq('id', id);
  if (error) return errorResponse(error, 'ลบรอบตรวจไม่สำเร็จ');
  return new Response(null, { status: 204 });
}
