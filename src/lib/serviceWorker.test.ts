import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const worker = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');

function setup() {
  const handlers = new Map<string, (event: unknown) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const caches = { match: vi.fn().mockResolvedValue(undefined) };
  runInNewContext(worker, {
    self: { addEventListener: (type: string, handler: (event: unknown) => void) => handlers.set(type, handler),
      registration: { showNotification } },
    caches, fetch: vi.fn().mockRejectedValue(new Error('Offline')), URL, Response,
  });
  return { handlers, showNotification, caches };
}

describe('service worker', () => {
  it('does not pass the invalid silent/vibrate combination to notification display', async () => {
    const { handlers, showNotification } = setup();
    let work!: Promise<unknown>;
    handlers.get('push')!({ data: { json: () => ({ title: 'Delayed', type: 'delay' }) }, waitUntil: (promise: Promise<unknown>) => { work = promise; } });
    await work;
    expect(showNotification.mock.calls[0][1].silent).toBe(true);
    expect(showNotification.mock.calls[0][1]).not.toHaveProperty('vibrate');
  });
  it('does not serve the admin shell to an offline storefront visitor', async () => {
    const { handlers, caches } = setup();
    let work!: Promise<Response>;
    handlers.get('fetch')!({ request: { method: 'GET', mode: 'navigate', url: 'https://restaurant.example/checkout' },
      respondWith: (promise: Promise<Response>) => { work = promise; } });
    const response = await work;
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('You are offline');
    expect(caches.match).not.toHaveBeenCalledWith('/admin');
  });
});
