import type { SupabaseClient, User } from '@supabase/supabase-js';
import { canonicalRole } from '@/lib/requireRole';
import type { UserRole } from '@/types/database';
import { createClient } from '@/utils/supabase/server';
import { jsonError } from './http';

export interface ApiActor {
  user: User;
  id: string;
  role: UserRole;
  rawRole: string;
}

export type ApiAuthResult =
  | { ok: true; supabase: SupabaseClient; actor: ApiActor }
  | { ok: false; response: Response };

export async function requireApiAuth(allowedRoles?: readonly UserRole[]): Promise<ApiAuthResult> {
  let supabase: SupabaseClient;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, response: jsonError('เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Supabase', 500) };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, response: jsonError('กรุณาเข้าสู่ระบบใหม่', 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile || profile.is_active === false) {
    return { ok: false, response: jsonError('บัญชีถูกระงับการใช้งานหรือไม่พบข้อมูลผู้ใช้', 403) };
  }

  const role = canonicalRole(profile.role);
  if (allowedRoles && !allowedRoles.includes(role) && !allowedRoles.includes(profile.role as UserRole)) {
    return { ok: false, response: jsonError('ไม่มีสิทธิ์ทำรายการนี้', 403) };
  }

  return {
    ok: true,
    supabase,
    actor: { user: authData.user, id: authData.user.id, role, rawRole: profile.role },
  };
}

export function respondAuthFailure(result: ApiAuthResult): Response | null {
  return result.ok ? null : result.response;
}
