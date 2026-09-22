import { requireApiAuth } from '../../_lib/auth';
import { errorResponse } from '../../_lib/http';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  try {
    const { count: unreadNotifications, error: notificationError } = await auth.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.actor.id)
      .is('deleted_at', null)
      .is('read_at', null);
    if (notificationError) return errorResponse(notificationError, 'โหลดจำนวนแจ้งเตือนไม่สำเร็จ');

    let appointmentCount = 0;
    let activeAppointmentCount = 0;
    let completedAppointmentCount = 0;
    if (auth.actor.role === 'patient') {
      const result = await auth.supabase.from('appointments').select('status').eq('patient_id', auth.actor.id);
      if (result.error) return errorResponse(result.error, 'โหลดสถิตินัดหมายไม่สำเร็จ');
      const rows = result.data ?? [];
      appointmentCount = rows.length;
      activeAppointmentCount = rows.filter((row) => ['pending', 'confirmed', 'in_progress'].includes(row.status)).length;
      completedAppointmentCount = rows.filter((row) => row.status === 'completed').length;
    } else if (auth.actor.role === 'medical') {
      const slots = await auth.supabase.from('appointment_slots').select('id').eq('doctor_id', auth.actor.id);
      if (slots.error) return errorResponse(slots.error, 'โหลดสถิติรอบตรวจไม่สำเร็จ');
      const ids = (slots.data ?? []).map((row) => row.id);
      if (ids.length) {
        const result = await auth.supabase.from('appointments').select('status').in('slot_id', ids);
        if (result.error) return errorResponse(result.error, 'โหลดสถิตินัดหมายไม่สำเร็จ');
        const rows = result.data ?? [];
        appointmentCount = rows.length;
        activeAppointmentCount = rows.filter((row) => ['pending', 'confirmed', 'in_progress'].includes(row.status)).length;
        completedAppointmentCount = rows.filter((row) => row.status === 'completed').length;
      }
    } else {
      const result = await auth.supabase.from('appointments').select('status');
      if (result.error) return errorResponse(result.error, 'โหลดสถิตินัดหมายไม่สำเร็จ');
      const rows = result.data ?? [];
      appointmentCount = rows.length;
      activeAppointmentCount = rows.filter((row) => ['pending', 'confirmed', 'in_progress'].includes(row.status)).length;
      completedAppointmentCount = rows.filter((row) => row.status === 'completed').length;
    }

    const result: Record<string, unknown> = {
      role: auth.actor.role,
      unreadNotifications: unreadNotifications ?? 0,
      appointments: { total: appointmentCount, active: activeAppointmentCount, completed: completedAppointmentCount },
    };
    if (auth.actor.role === 'patient') {
      const reminders = await auth.supabase.from('medication_reminders').select('id, status').eq('user_id', auth.actor.id);
      if (reminders.error) return errorResponse(reminders.error, 'โหลดสถิติรายการเตือนไม่สำเร็จ');
      result.reminders = { total: reminders.data?.length ?? 0, active: (reminders.data ?? []).filter((row) => row.status === 'active').length };
    } else {
      const medications = await auth.supabase.from('medications').select('stock, min_stock').eq('is_active', true);
      if (medications.error) return errorResponse(medications.error, 'โหลดสถิติคลังยาไม่สำเร็จ');
      result.medications = { lowStock: (medications.data ?? []).filter((row) => row.stock <= row.min_stock).length };
    }
    return Response.json(result);
  } catch (error) {
    return errorResponse(error, 'โหลดสถิติ Dashboard ไม่สำเร็จ');
  }
}
