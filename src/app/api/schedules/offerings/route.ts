import { errorResponse } from '../../_lib/http';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  let supabase;
  try { supabase = await createClient(); } catch (error) { return errorResponse(error, 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Supabase'); }
  const { data: userData } = await supabase.auth.getUser();
  const select = userData.user
    ? 'id, service_id, doctor_id, offering_date, is_active, created_by'
    : 'id, service_id, doctor_id, offering_date, is_active';
  const { data, error } = await supabase.from('daily_service_offerings').select(select).order('offering_date', { ascending: true });
  if (error) return errorResponse(error, 'โหลดบริการประจำวันไม่สำเร็จ');
  return Response.json(data ?? []);
}
