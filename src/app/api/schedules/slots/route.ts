import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, isResponse, parseDate, parsePositiveInt, parseUuid, readJson } from '../../_lib/http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

type SlotInput = {
  doctorId?: string; doctor_id?: string; serviceId?: string; service_id?: string;
  slotDate?: string; slot_date?: string; startTime?: string; start_time?: string;
  endTime?: string; end_time?: string; maxCapacity?: number; max_capacity?: number;
  dates?: string[]; timeBlocks?: Array<{ startTime?: string; start_time?: string; endTime?: string; end_time?: string; maxCapacity?: number; max_capacity?: number }>;
};

type EffectiveSlotRow = {
  id: string;
  doctor_id: string;
  daily_service_offering_id: string;
  service_id?: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  booked_count: number;
  status: string;
};

type SlotDetailRow = {
  id: string;
  offering?: {
    service_id?: string;
    offering_date?: string;
    is_active?: boolean;
    service?: { id?: string; code?: string; name?: string; is_active?: boolean } | null;
  } | Array<{
    service_id?: string;
    offering_date?: string;
    is_active?: boolean;
    service?: { id?: string; code?: string; name?: string; is_active?: boolean } | null;
  }> | null;
  doctor?: unknown;
};

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
  if (startTime >= endTime) return 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด';
  if (startTime < '08:30' || endTime > '16:30') return 'รอบตรวจต้องอยู่ระหว่าง 08:30–16:30 น.';
  if (startTime < '13:00' && endTime > '12:00') return 'ไม่สามารถสร้างรอบทับช่วงพัก 12:00–13:00 น.';
  return null;
}

async function validateDoctorAndService(supabase: SupabaseClient, doctorId: string, serviceId: string): Promise<Response | null> {
  const [{ data: doctor, error: doctorError }, { data: profile, error: profileError }, { data: service, error: serviceError }] = await Promise.all([
    supabase.from('doctors').select('id').eq('id', doctorId).maybeSingle(),
    supabase.from('profiles').select('id, role, is_active').eq('id', doctorId).maybeSingle(),
    supabase.from('services').select('id, is_active').eq('id', serviceId).maybeSingle(),
  ]);
  if (doctorError) return errorResponse(doctorError, 'ตรวจสอบแพทย์ไม่สำเร็จ');
  if (profileError) return errorResponse(profileError, 'ตรวจสอบบัญชีแพทย์ไม่สำเร็จ');
  if (serviceError) return errorResponse(serviceError, 'ตรวจสอบบริการไม่สำเร็จ');
  if (!doctor || !profile || profile.role !== 'medical' || profile.is_active !== true) return Response.json({ error: 'แพทย์ต้องเปิดใช้งานก่อนสร้างรอบ' }, { status: 400 });
  if (!service || service.is_active !== true) return Response.json({ error: 'เลือกบริการที่เปิดใช้งาน' }, { status: 400 });
  return null;
}

export async function GET(request: Request) {
  let supabase;
  try { supabase = await createClient(); } catch (error) { return errorResponse(error, 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Supabase'); }
  const url = new URL(request.url);
  const doctorId = url.searchParams.get('doctorId');
  const date = url.searchParams.get('date');
  const serviceId = url.searchParams.get('serviceId');
  if (doctorId && !parseUuid(doctorId)) return Response.json({ error: 'รหัสแพทย์ไม่ถูกต้อง' }, { status: 400 });
  if (serviceId && !parseUuid(serviceId)) return Response.json({ error: 'รหัสบริการไม่ถูกต้อง' }, { status: 400 });
  if (date && !parseDate(date)) return Response.json({ error: 'วันที่ไม่ถูกต้อง' }, { status: 400 });
  const [effectiveSlots, details] = await Promise.all([
    supabase.rpc('get_schedule_slots'),
    supabase.from('appointment_slots').select('id, doctor_id, daily_service_offering_id, slot_date, start_time, end_time, max_capacity, status, offering:daily_service_offerings(service_id, offering_date, is_active, service:services(id, code, name, is_active)), doctor:doctors(id, profile:profiles(id, title, first_name, last_name), department:departments(id, name))'),
  ]);
  if (effectiveSlots.error) return errorResponse(effectiveSlots.error, 'โหลดรอบตรวจไม่สำเร็จ');
  if (details.error) return errorResponse(details.error, 'โหลดข้อมูลแพทย์และบริการของรอบตรวจไม่สำเร็จ');
  const detailRows = (details.data ?? []) as SlotDetailRow[];
  const effectiveRows = (effectiveSlots.data ?? []) as EffectiveSlotRow[];
  const detailById = new Map(detailRows.map((row) => [row.id, row]));
  const data = effectiveRows
    .map((row) => {
      const detail = detailById.get(row.id);
      const offering = Array.isArray(detail?.offering) ? detail.offering[0] : detail?.offering;
      const service = Array.isArray(offering?.service) ? offering.service[0] : offering?.service;
      return {
        ...row,
        service_id: row.service_id ?? offering?.service_id,
        offering: { service_id: offering?.service_id ?? row.service_id, offering_date: offering?.offering_date ?? row.slot_date, is_active: offering?.is_active ?? true, service },
        doctor: detail?.doctor ?? null,
      };
    })
    .filter((row) => (!doctorId || row.doctor_id === doctorId) && (!date || row.slot_date === date) && (!serviceId || row.service_id === serviceId));
  return Response.json(data);
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(['medical', 'staff_admin']);
  if (!auth.ok) return auth.response;
  const body = await readJson<SlotInput>(request);
  if (isResponse(body)) return body;
  const doctorId = parseUuid(body.doctorId ?? body.doctor_id);
  const serviceId = parseUuid(body.serviceId ?? body.service_id);
  if (!doctorId || !serviceId) return Response.json({ error: 'ต้องระบุแพทย์และบริการ' }, { status: 400 });
  if (auth.actor.role === 'medical' && doctorId !== auth.actor.id) return Response.json({ error: 'แพทย์จัดการได้เฉพาะรอบตรวจของตนเอง' }, { status: 403 });

  if (Array.isArray(body.dates) || Array.isArray(body.timeBlocks)) {
    if (!Array.isArray(body.dates) || !Array.isArray(body.timeBlocks) || body.dates.length === 0 || body.timeBlocks.length === 0) {
      return Response.json({ error: 'ข้อมูลสร้างรอบตรวจแบบชุดไม่ครบถ้วน' }, { status: 400 });
    }
    const parsedDates = body.dates.map(parseDate);
    if (parsedDates.some((date) => !date)) return Response.json({ error: 'วันที่สร้างรอบตรวจไม่ถูกต้อง' }, { status: 400 });
    const dates = parsedDates as string[];
    if (dates.some((date) => date < clinicToday())) return Response.json({ error: 'ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้' }, { status: 400 });
    if (dates.some((date) => !isWeekday(date))) return Response.json({ error: 'คลินิกเปิดรอบตรวจเฉพาะวันจันทร์ถึงศุกร์' }, { status: 400 });
    const timeBlocks = body.timeBlocks.map((block) => ({
      start_time: time(block.startTime ?? block.start_time),
      end_time: time(block.endTime ?? block.end_time),
      max_capacity: parsePositiveInt(block.maxCapacity ?? block.max_capacity),
    }));
    if (timeBlocks.some((block) => !block.start_time || !block.end_time || !block.max_capacity)) {
      return Response.json({ error: 'ช่วงเวลาและจำนวนผู้รับบริการไม่ถูกต้อง' }, { status: 400 });
    }
    const normalizedBlocks = timeBlocks as Array<{ start_time: string; end_time: string; max_capacity: number }>;
    for (const block of normalizedBlocks) {
      const windowError = validateWindow(block.start_time, block.end_time);
      if (windowError) return Response.json({ error: windowError }, { status: 400 });
    }
    const orderedBlocks = [...normalizedBlocks].sort((left, right) => left.start_time.localeCompare(right.start_time));
    if (orderedBlocks.some((block, index) => index > 0 && block.start_time < orderedBlocks[index - 1].end_time)) return Response.json({ error: 'ช่วงเวลาที่เลือกทับซ้อนกัน' }, { status: 400 });
    const ownerError = await validateDoctorAndService(auth.supabase, doctorId, serviceId);
    if (ownerError) return ownerError;
    const { data, error } = await auth.supabase.rpc('create_appointment_slot_batch', {
      p_doctor_id: doctorId,
      p_service_id: serviceId,
      p_dates: dates,
      p_time_blocks: normalizedBlocks,
    });
    if (error) return errorResponse(error, 'สร้างรอบตรวจแบบชุดไม่สำเร็จ');
    return Response.json({ count: typeof data === 'number' ? data : Number(data) || 0 }, { status: 201 });
  }

  const slotDate = parseDate(body.slotDate ?? body.slot_date);
  const startTime = time(body.startTime ?? body.start_time);
  const endTime = time(body.endTime ?? body.end_time);
  const maxCapacity = parsePositiveInt(body.maxCapacity ?? body.max_capacity);
  if (!slotDate || !startTime || !endTime || !maxCapacity || startTime >= endTime) return Response.json({ error: 'ข้อมูลรอบตรวจไม่ถูกต้อง' }, { status: 400 });
  if (slotDate < clinicToday()) return Response.json({ error: 'ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้' }, { status: 400 });
  if (!isWeekday(slotDate)) return Response.json({ error: 'คลินิกเปิดรอบตรวจเฉพาะวันจันทร์ถึงศุกร์' }, { status: 400 });
  const windowError = validateWindow(startTime, endTime);
  if (windowError) return Response.json({ error: windowError }, { status: 400 });
  const ownerError = await validateDoctorAndService(auth.supabase, doctorId, serviceId);
  if (ownerError) return ownerError;
  const [{ data: leaves, error: leaveError }, { data: existingSlots, error: slotError }] = await Promise.all([
    auth.supabase.from('doctor_leaves').select('start_date, end_date').eq('doctor_id', doctorId).lte('start_date', slotDate).gte('end_date', slotDate),
    auth.supabase.from('appointment_slots').select('start_time, end_time').eq('doctor_id', doctorId).eq('slot_date', slotDate),
  ]);
  if (leaveError) return errorResponse(leaveError, 'ตรวจสอบวันลาแพทย์ไม่สำเร็จ');
  if (slotError) return errorResponse(slotError, 'ตรวจสอบรอบตรวจเดิมไม่สำเร็จ');
  if ((leaves ?? []).length) return Response.json({ error: 'แพทย์มีวันลาในวันที่เลือก ไม่สามารถสร้างรอบตรวจใหม่ได้' }, { status: 400 });
  if ((existingSlots ?? []).some((slot) => startTime < slot.end_time && endTime > slot.start_time)) return Response.json({ error: 'แพทย์มีรอบเวลาทับซ้อนกับรายการเดิม' }, { status: 409 });

  const { data: offering, error: offeringError } = await auth.supabase.from('daily_service_offerings').upsert({
    service_id: serviceId, doctor_id: doctorId, offering_date: slotDate, is_active: true, created_by: auth.actor.id,
  }, { onConflict: 'service_id,doctor_id,offering_date' }).select('id').single();
  if (offeringError || !offering) return errorResponse(offeringError, 'เตรียมบริการประจำวันไม่สำเร็จ');
  const { data, error } = await auth.supabase.from('appointment_slots').insert({
    doctor_id: doctorId, daily_service_offering_id: offering.id, slot_date: slotDate, start_time: startTime, end_time: endTime, max_capacity: maxCapacity, booked_count: 0, status: 'available',
  }).select().single();
  if (error) return errorResponse(error, 'สร้างรอบตรวจไม่สำเร็จ');
  return Response.json(data, { status: 201 });
}
