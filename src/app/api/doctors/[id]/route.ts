import { requireApiAuth } from '../../_lib/auth';
import { errorResponse, isResponse, parseUuid, readJson } from '../../_lib/http';

type DoctorInput = { specialty?: string; departmentId?: string; department_id?: string; is_active?: boolean };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสแพทย์ไม่ถูกต้อง' }, { status: 400 });
  const body = await readJson<DoctorInput>(request);
  if (isResponse(body)) return body;
  const doctorUpdates: Record<string, unknown> = {};
  if (body.specialty !== undefined) {
    if (!body.specialty.trim()) return Response.json({ error: 'ความเชี่ยวชาญห้ามว่าง' }, { status: 400 });
    doctorUpdates.specialty = body.specialty.trim();
  }
  if (body.departmentId !== undefined || body.department_id !== undefined) {
    const departmentId = parseUuid(body.departmentId ?? body.department_id);
    if (!departmentId) return Response.json({ error: 'รหัสแผนกไม่ถูกต้อง' }, { status: 400 });
    doctorUpdates.department_id = departmentId;
  }
  if (!Object.keys(doctorUpdates).length && body.is_active === undefined) return Response.json({ error: 'ไม่มีข้อมูลสำหรับแก้ไข' }, { status: 400 });
  let doctor = null;
  if (Object.keys(doctorUpdates).length) {
    const result = await auth.supabase.from('doctors').update({ ...doctorUpdates, updated_at: new Date().toISOString() }).eq('id', id).select('id, specialty, department_id, created_at, updated_at').single();
    if (result.error) return errorResponse(result.error, 'แก้ไขข้อมูลแพทย์ไม่สำเร็จ');
    doctor = result.data;
  }
  if (body.is_active !== undefined) {
    const result = await auth.supabase.from('profiles').update({ is_active: body.is_active, updated_at: new Date().toISOString() }).eq('id', id).select('id, is_active').single();
    if (result.error) return errorResponse(result.error, 'แก้ไขสถานะแพทย์ไม่สำเร็จ');
  }
  return Response.json(doctor ?? { id, is_active: body.is_active });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(['staff_admin']);
  if (!auth.ok) return auth.response;
  const id = parseUuid((await context.params).id);
  if (!id) return Response.json({ error: 'รหัสแพทย์ไม่ถูกต้อง' }, { status: 400 });
  const { data, error } = await auth.supabase.from('profiles').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id).select('id, is_active').single();
  if (error) return errorResponse(error, 'ปิดใช้งานแพทย์ไม่สำเร็จ');
  return Response.json(data);
}
