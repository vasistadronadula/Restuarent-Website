import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({
  generateLink: vi.fn(), updateUser: vi.fn(), eq: vi.fn(), insert: vi.fn(),
  profile: null as Record<string, unknown> | null,
}));
vi.mock('@/lib/auth/firebaseIdToken', () => ({
  verifyFirebasePhoneToken: async () => ({ phoneNumber: '+919876543210' }),
  FirebaseTokenError: class extends Error {},
}));
vi.mock('@/lib/auth/rateLimit', () => ({ rateLimit: () => ({ allowed: true }), clientIp: () => 'test' }));
vi.mock('@/lib/supabaseAdmin', () => ({ getSupabaseAdmin: () => ({
  auth: { admin: { generateLink: db.generateLink, updateUserById: db.updateUser } },
  from: () => ({ select: () => ({ eq: db.eq }), insert: db.insert }),
}) }));
import { POST } from './route';
const request = (body: unknown) => new Request('https://restaurant.example/api/auth/phone', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});
beforeEach(() => {
  vi.clearAllMocks();
  db.profile = null;
  db.generateLink.mockResolvedValue({ data: { user: { id: 'phone-user', user_metadata: { phone_auth_secured: true } }, properties: { hashed_token: 'one-time-token' } }, error: null });
  db.updateUser.mockResolvedValue({ error: null });
  db.insert.mockResolvedValue({ error: null });
  db.eq.mockImplementation(() => ({ maybeSingle: async () => ({ data: db.profile, error: null }) }));
});
describe('phone identity protection', () => {
  it('rejects JSON null without crashing', async () => {
    expect((await POST(request(null))).status).toBe(400);
  });
  it('does not trust a client-editable secured flag or match another profile by phone', async () => {
    expect((await POST(request({ idToken: 'verified' }))).status).toBe(200);
    expect(db.updateUser).toHaveBeenCalledWith('phone-user', expect.objectContaining({
      password: expect.any(String), app_metadata: { phone_auth_secured: true },
    }));
    expect(db.generateLink).toHaveBeenCalledTimes(2);
    expect(db.eq).toHaveBeenCalledWith('id', 'phone-user');
    expect(db.eq).not.toHaveBeenCalledWith('phone', expect.anything());
  });
  it('does not issue a session if replacing a legacy password fails', async () => {
    db.updateUser.mockResolvedValue({ error: { message: 'Unavailable' } });
    const response = await POST(request({ idToken: 'verified' }));
    expect(response.status).toBe(500);
    expect(await response.json()).not.toHaveProperty('tokenHash');
  });
});
