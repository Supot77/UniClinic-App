import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, rpc } = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }));
vi.mock('@/app/api/_lib/auth', () => ({ requireApiAuth: auth }));
import { DELETE } from '@/app/api/medications/[id]/route';
const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const request = () => new Request(`http://localhost/api/medications/${id}?permanent=true`, { method: 'DELETE' });

describe('permanent medication deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ ok: true, actor: { role: 'medical' }, supabase: { rpc } });
    rpc.mockResolvedValue({ error: null });
  });
  it('uses the authenticated session RPC instead of deleting history with an admin client', async () => {
    expect((await DELETE(request(), { params: Promise.resolve({ id }) })).status).toBe(200);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('delete_unused_medication', { p_medication_id: id });
  });
  it('denies staff admin permanent deletion', async () => {
    auth.mockResolvedValue({ ok: true, actor: { role: 'staff_admin' }, supabase: { rpc } });
    expect((await DELETE(request(), { params: Promise.resolve({ id }) })).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('returns the database history restriction without reporting success', async () => {
    rpc.mockResolvedValue({ error: { code: 'P0001', message: 'ยานี้มีประวัติอ้างอิง' } });
    const response = await DELETE(request(), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'ยานี้มีประวัติอ้างอิง' });
  });
});
