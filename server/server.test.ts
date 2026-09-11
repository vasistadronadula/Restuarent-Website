import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from './index';

import type { SupabaseClient } from '@supabase/supabase-js';

describe('Fastify Backend Service', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false, realtime: false });
    // Mock verifySession to simulate an authenticated staff user
    app.verifySession = async (token: string) => {
      if (token !== 'valid-staff-token') {
        throw app.httpErrors.unauthorized('Invalid token');
      }
      return {
        userId: 'staff-123',
        role: 'chef',
        expiresAt: Date.now() + 3600_000,
        db: {
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: 'test-order-999' }, error: null }),
              }),
            }),
          }),
        } as unknown as SupabaseClient,
      };
    };
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 and healthy status metadata', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('pala-pitta-fastify');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  it('POST /api/kot/dispatch rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/kot/dispatch',
      payload: { orderId: 'test-order-999' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /api/kot/dispatch validates request body schema', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/kot/dispatch',
      headers: { authorization: 'Bearer valid-staff-token' },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/kot/dispatch dispatches order for authenticated staff', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/kot/dispatch',
      headers: { authorization: 'Bearer valid-staff-token' },
      payload: {
        orderId: 'test-order-999',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.orderId).toBe('test-order-999');
  });
});
