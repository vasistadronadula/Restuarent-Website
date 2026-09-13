// Smoke check for Go Gateway + Spring Boot + Supabase backend.
import assert from 'node:assert/strict';

const base = process.env.BACKEND_SMOKE_URL || 'http://127.0.0.1:8080';

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json().catch(() => null) };
}

console.log(`Checking backend readiness at ${base}...`);
const ready = await request('/health/ready');
assert.equal(ready.status, 200, `Expected 200 from /health/ready, got ${ready.status}`);

console.log('Checking public catalog endpoints...');
const menu = await request('/api/v1/data/menu_items');
assert.equal(menu.status, 200, `Expected 200 from /api/v1/data/menu_items, got ${menu.status}`);
assert.ok(Array.isArray(menu.body?.data), 'Expected array for menu_items data');

const categories = await request('/api/v1/data/menu_categories');
assert.equal(categories.status, 200, `Expected 200 from /api/v1/data/menu_categories, got ${categories.status}`);
assert.ok(Array.isArray(categories.body?.data), 'Expected array for menu_categories data');

const smokeToken = process.env.SUPABASE_SMOKE_TOKEN;
if (smokeToken) {
  console.log('Checking authenticated identity endpoint with provided token...');
  const me = await request('/api/v1/auth/me', { token: smokeToken });
  assert.equal(me.status, 200, `Expected 200 from /api/v1/auth/me, got ${me.status}`);
  assert.ok(me.body?.id, 'Expected user id in identity payload');
}

console.log('Backend smoke tests passed successfully.');
