import { test } from 'node:test';
import assert from 'node:assert/strict';
import { securePhoneAccounts } from './securePhoneAccounts.mjs';

function fixture() {
  const users = [
    { id: 'legacy', email: 'phone_919876543210@palapitta.internal', user_metadata: { phone_auth_secured: true }, app_metadata: { provider: 'email' } },
    { id: 'secured', email: 'phone_919876543211@palapitta.internal', app_metadata: { phone_auth_secured: true } },
    { id: 'regular', email: 'diner@example.com' },
  ];
  const changes = [];
  return { changes, client: { auth: { admin: {
    listUsers: async () => ({ data: { users }, error: null }),
    updateUserById: async (id, patch) => { changes.push({ id, patch }); return { error: null }; },
  } } } };
}

test('inspection performs no credential mutations', async () => {
  const { client, changes } = fixture();
  assert.deepEqual(await securePhoneAccounts(client), { candidates: 1, updated: 0 });
  assert.equal(changes.length, 0);
});

test('rotates only unsecured reserved phone accounts and preserves trusted metadata', async () => {
  const { client, changes } = fixture();
  assert.deepEqual(await securePhoneAccounts(client, { apply: true }), { candidates: 1, updated: 1 });
  assert.equal(changes[0].id, 'legacy');
  assert.equal(changes[0].patch.password.length, 64);
  assert.deepEqual(changes[0].patch.app_metadata, { provider: 'email', phone_auth_secured: true });
});

test('reports a failed rotation instead of claiming the account was secured', async () => {
  const { client } = fixture();
  client.auth.admin.updateUserById = async () => ({ error: { message: 'unavailable' } });
  await assert.rejects(securePhoneAccounts(client, { apply: true }), /rotation failed/);
});
