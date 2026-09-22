import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, parseUuid } from '../../_lib/http';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสนัดหมายไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await auth.supabase
    .from('appointments')
    .select('id, patient_id, slot_id, queue_number, reason, status, cancel_requested_at, rejection_reason, created_at, updated_at, slot:appointment_slots(id, doctor_id, slot_date, start_time, end_time, max_capacity, booked_count, status, doctor:doctors(id, specialty, department_id, profile:profiles(id, title, first_name, last_name), department:departments(id, name))), patient:profiles(id, title, first_name, last_name, phone)')
    .eq('id', id)
    .single();
  if (error) return errorResponse(error, 'โหลดรายละเอียดนัดหมายไม่สำเร็จ');
  return Response.json(data);
}
