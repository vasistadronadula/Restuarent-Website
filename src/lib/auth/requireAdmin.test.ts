import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ role: 'customer', error: null as unknown, upsert: vi.fn() }));
vi.mock('@/lib/supabaseAdmin', () => ({ getSupabaseAdmin: () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'owner', email: 'palapittaruchulu@gmail.com' } }, error: null }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: db.role }, error: db.error }) }) }), upsert: db.upsert }),
}) }));
import { requireAdmin } from './requireAdmin';
const request = () => new Request('https://restaurant.example/api/admin/employees', { headers: { Authorization: 'Bearer token' } });
beforeEach(() => { db.role = 'customer'; db.error = null; vi.clearAllMocks(); });
describe('admin authorization', () => {
  it('honors a revoked admin role even for a former owner email', async () => {
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 403 });
    expect(db.upsert).not.toHaveBeenCalled();
  });
  it('allows the verified database admin role', async () => {
    db.role = 'admin';
    await expect(requireAdmin(request())).resolves.toMatchObject({ role: 'admin' });
  });
  it('fails closed when role verification fails', async () => {
    db.error = new Error('Unavailable');
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 500 });
  });
});
