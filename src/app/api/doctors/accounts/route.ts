import { requireApiAuth } from '../../_lib/auth';
import { errorResponse } from '../../_lib/http';
import { formatProfileName } from '@/lib/profileName';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.actor.role === 'patient') return Response.json([]);

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('id, title, first_name, last_name, role, is_active')
    .eq('role', 'medical')
    .eq('is_active', true)
    .order('first_name', { ascending: true })
    .order('last_name', { ascending: true });
  if (error) return errorResponse(error, 'โหลดบัญชีแพทย์ไม่สำเร็จ');

  return Response.json((data ?? []).map((profile) => ({
    profileId: profile.id,
    fullName: formatProfileName(profile),
    email: '',
  })));
}
