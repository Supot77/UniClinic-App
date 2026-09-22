import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, parseUuid } from '../../_lib/http';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['patient', 'medical']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสเวชระเบียนไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await auth.supabase.from('medical_records').select('*, appointment:appointments(id, patient_id, slot_id, status), patient:profiles!medical_records_patient_id_fkey(id, title, first_name, last_name), doctor:doctors!medical_records_doctor_id_fkey(id, profile:profiles(id, title, first_name, last_name))').eq('id', id).single();
  if (error) return errorResponse(error, 'โหลดเวชระเบียนไม่สำเร็จ');
  return Response.json(data);
}
