import { describe, expect, it, vi } from 'vitest';
import { createBackendClient } from './client';

describe('standalone backend HTTP contract', () => {
  it('sends the observed version and current bearer token on mutations', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createBackendClient({ getToken: () => 'current-session', fetch: transport });
    await client.data.delete('menu_items', 'dish/one', 7);
    expect(transport.mock.calls[0][0]).toBe('/api/v1/data/menu_items/dish%2Fone');
    const init = transport.mock.calls[0][1]!;
    expect(new Headers(init.headers).get('If-Match')).toBe('"7"');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer current-session');
    expect(init.credentials).toBe('omit');
  });

  it('does not attach old credentials to login or retry conflicts automatically', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: 'Record changed' }), {
      status: 409, headers: { 'X-Request-ID': 'request-123' },
    }));
    const client = createBackendClient({ getToken: () => 'old-token', fetch: transport });
    const result = client.auth.login('user@example.com', 'password');
    await expect(result).rejects.toMatchObject({ status: 409, message: 'Record changed', requestId: 'request-123' });
    expect(new Headers(transport.mock.calls[0][1]?.headers).has('Authorization')).toBe(false);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('preserves the checkout idempotency key and never submits client totals', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"data":{}}'));
    const client = createBackendClient({ getToken: () => null, fetch: transport });
    await client.orders.checkout({ customerName: 'Diner', customerPhone: '9999999999', orderType: 'takeaway',
      items: [{ menuItemId: 'dish', quantity: 2 }] }, 'basket-key');
    const init = transport.mock.calls[0][1]!;
    expect(new Headers(init.headers).get('Idempotency-Key')).toBe('basket-key');
    expect(JSON.parse(String(init.body))).not.toHaveProperty('grandTotal');
  });

  it('rejects writes without a valid version before sending a request', () => {
    const transport = vi.fn<typeof fetch>();
    const client = createBackendClient({ getToken: () => null, fetch: transport });
    expect(() => client.data.update('inventory_items', 'rice', 0, { quantity: 3 })).toThrow('version');
    expect(transport).not.toHaveBeenCalled();
  });
});
