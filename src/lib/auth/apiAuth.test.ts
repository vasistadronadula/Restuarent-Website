import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabaseAdmin', () => ({ getSupabaseAdmin: () => null }));
import { assertSameOrigin } from './apiAuth';
afterEach(() => vi.unstubAllEnvs());
describe('public mutation origin checks', () => {
  it.each(['http://localhost:3000', 'http://restaurant.example', 'https://restaurant.example:444', 'https://attacker.example', 'null'])(
    'rejects a different origin: %s', origin => {
      expect(() => assertSameOrigin(new Request('https://restaurant.example/api/orders/checkout', {
        headers: { origin, 'x-forwarded-host': 'attacker.example', 'sec-fetch-site': 'none' },
      }))).toThrow('Forbidden');
    });
  it('allows matching origins and a configured public origin behind a proxy', () => {
    expect(() => assertSameOrigin(new Request('http://localhost:3001/api/orders/checkout', {
      headers: { origin: 'http://localhost:3001' },
    }))).not.toThrow();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://restaurant.example');
    expect(() => assertSameOrigin(new Request('http://internal:3000/api/orders/checkout', {
      headers: { origin: 'https://restaurant.example' },
    }))).not.toThrow();
  });
});
