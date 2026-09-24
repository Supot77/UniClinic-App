import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, isResponse, parsePositiveInt, parseUuid, readJson } from '../../_lib/http';

type Prescription = { medication_id?: string; name?: string; dosage?: string; frequency?: string; duration_days?: number; quantity?: number };
type RecordUpdateInput = {
  diagnosis?: string;
  advice?: string;
  treatment_notes?: string;
  prescriptions?: Prescription[];
  prescribed_medications?: Prescription[];
  height_cm?: number | null;
  weight_kg?: number | null;
  blood_pressure?: string | null;
  pulse_bpm?: number | null;
};

function validPhysicalExam(body: RecordUpdateInput): string | null {
  if (body.height_cm !== undefined && body.height_cm !== null && (body.height_cm < 30 || body.height_cm > 250)) return 'ส่วนสูงต้องอยู่ระหว่าง 30–250 ซม.';
  if (body.weight_kg !== undefined && body.weight_kg !== null && (body.weight_kg < 1 || body.weight_kg > 300)) return 'น้ำหนักต้องอยู่ระหว่าง 1–300 กก.';
  if (body.blood_pressure !== undefined && body.blood_pressure !== null && !/^\d{2,3}\/\d{2,3}$/.test(body.blood_pressure.trim())) return 'ความดันโลหิตต้องอยู่ในรูปแบบ systolic/diastolic เช่น 120/80';
  if (body.pulse_bpm !== undefined && body.pulse_bpm !== null && (body.pulse_bpm < 20 || body.pulse_bpm > 250 || !Number.isInteger(body.pulse_bpm))) return 'ชีพจรต้องอยู่ระหว่าง 20–250 ครั้ง/นาที';
  return null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['patient', 'medical']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสเวชระเบียนไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await auth.supabase.from('medical_records').select('*, appointment:appointments(id, patient_id, slot_id, status), patient:profiles!medical_records_patient_id_fkey(id, title, first_name, last_name), doctor:doctors!medical_records_doctor_id_fkey(id, profile:profiles(id, title, first_name, last_name))').eq('id', id).single();
  if (error) return errorResponse(error, 'โหลดเวชระเบียนไม่สำเร็จ');
  return Response.json(data);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['medical']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสเวชระเบียนไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<RecordUpdateInput>(request);
  if (isResponse(body)) return body;
  const diagnosis = body.diagnosis?.trim() ?? '';
  const advice = (body.advice ?? body.treatment_notes ?? '').trim();
  const prescriptions = body.prescriptions ?? body.prescribed_medications ?? [];
  if (!diagnosis || diagnosis.length > 5000 || advice.length > 5000 || !Array.isArray(prescriptions) || prescriptions.length > 50) {
    return Response.json({ error: 'ข้อมูลผลตรวจไม่ครบถ้วนหรือยาวเกินกำหนด' }, { status: 400 });
  }
  const physicalError = validPhysicalExam(body);
  if (physicalError) return Response.json({ error: physicalError }, { status: 400 });
  const seen = new Set<string>();
  for (const item of prescriptions) {
    const medicationId = parseUuid(item.medication_id);
    if (!medicationId || !item.dosage?.trim() || !item.frequency?.trim() || !parsePositiveInt(item.quantity) || !parsePositiveInt(item.duration_days) || seen.has(medicationId)) {
      return Response.json({ error: 'รายการยาไม่ถูกต้องหรือซ้ำกัน' }, { status: 400 });
    }
    seen.add(medicationId);
  }
  const { data, error } = await auth.supabase.rpc('update_medical_record', {
    p_record_id: id,
    p_diagnosis: diagnosis,
    p_advice: advice,
    p_prescriptions: prescriptions,
    p_height_cm: body.height_cm ?? null,
    p_weight_kg: body.weight_kg ?? null,
    p_blood_pressure: body.blood_pressure?.trim() || null,
    p_pulse_bpm: body.pulse_bpm ?? null,
  });
  if (error) return errorResponse(error, 'แก้ไขผลตรวจไม่สำเร็จ');
  return Response.json({ id: data });
}
