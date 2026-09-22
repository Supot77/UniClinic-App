import { requireApiAuth } from '../../_lib/auth';
import { errorResponse } from '../../_lib/http';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  const { data, error } = await auth.supabase.from('daily_service_offerings').select('id, service_id, doctor_id, offering_date, is_active, created_by').order('offering_date', { ascending: true });
  if (error) return errorResponse(error, 'โหลดบริการประจำวันไม่สำเร็จ');
  return Response.json(data ?? []);
}
