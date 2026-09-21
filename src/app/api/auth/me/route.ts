import { requireApiAuth } from '../../_lib/auth';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { data: profile, error } = await auth.supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.actor.id)
    .single();
  if (error || !profile) return Response.json({ error: 'ไม่พบข้อมูลโปรไฟล์' }, { status: 404 });

  return Response.json({ user: { id: auth.actor.id, email: auth.actor.user.email }, profile, role: auth.actor.role });
}
