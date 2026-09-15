import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

/** Repair dormant phone accounts as well as returning users. Never use the
 * client-editable user_metadata flag as evidence of a secure password. */
export async function securePhoneAccounts(client, { apply = false } = {}) {
  let candidates = 0;
  let updated = 0;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`Could not list accounts: ${error.message}`);
    for (const user of data.users) {
      if (!/^phone_\d+@palapitta\.internal$/i.test(user.email || '') || user.app_metadata?.phone_auth_secured === true) continue;
      candidates++;
      if (!apply) continue;
      const { error: updateError } = await client.auth.admin.updateUserById(user.id, {
        password: randomBytes(48).toString('base64url'),
        app_metadata: { ...user.app_metadata, phone_auth_secured: true },
      });
      if (updateError) throw new Error(`Account rotation failed for ${user.id}: ${updateError.message}`);
      updated++;
    }
    if (data.users.length < 100) break;
  }
  return { candidates, updated };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  const apply = process.argv.includes('--apply');
  console.log(`${apply ? 'Rotating' : 'Inspecting'} phone accounts in ${new URL(url).hostname}`);
  const result = await securePhoneAccounts(createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }), { apply });
  console.log(JSON.stringify(result));
  if (!apply && result.candidates) console.log('Run with --apply to replace these accounts\' passwords with random credentials.');
}
