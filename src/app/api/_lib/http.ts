import type { PostgrestError } from '@supabase/supabase-js';

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function readJson<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return jsonError('รูปแบบข้อมูลไม่ถูกต้อง', 400);
  }
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

export function errorResponse(error: unknown, fallback = 'เกิดข้อผิดพลาดภายในระบบ'): Response {
  const candidate = error as Partial<PostgrestError> & { message?: string; code?: string } | null;
  const code = candidate?.code;
  const status = code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === '23505' ? 409 : code === '23514' ? 400 : code === 'P0001' ? 400 : 500;
  const message = code === 'PGRST116'
    ? 'ไม่พบข้อมูลที่ต้องการ'
    : code === '23505'
      ? 'ข้อมูลนี้มีอยู่แล้วในระบบ'
      : code === '42501'
        ? 'ไม่มีสิทธิ์ทำรายการนี้'
        : code === 'P0001' || code === '23514'
          ? candidate?.message || fallback
          : fallback;
  return jsonError(message, status);
}

export function parseUuid(value: string | null | undefined): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

export function parsePositiveInt(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
