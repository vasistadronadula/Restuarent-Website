import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { kitchenItemKey } from './kitchen';
import type { PersistedOrderItem } from '@/types';

const items: PersistedOrderItem[] = [
  { menuItemId: 'rice', name: 'Rice', quantity: 1, price: 100 },
  { menuItemId: 'roti', name: 'Roti', quantity: 2, price: 30, notes: 'No butter' },
];
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION public.can_access_orders() RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('app.role', true) IN ('chef','admin','manager','cashier') $$;
    CREATE TABLE public.orders(id text PRIMARY KEY, status text NOT NULL, items jsonb NOT NULL, created_at timestamptz DEFAULT now());
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    CREATE POLICY staff_read ON public.orders FOR SELECT USING (public.can_access_orders());
    CREATE POLICY staff_update ON public.orders FOR UPDATE USING (public.can_access_orders()) WITH CHECK (public.can_access_orders());
    GRANT USAGE ON SCHEMA public, auth TO authenticated;
    GRANT SELECT, UPDATE ON public.orders TO authenticated;
  `);
  await db.exec(await readFile(resolve('supabase/migrations/20260828120000_kitchen_progress_and_timing.sql'), 'utf8'));
}, 30000);
afterAll(async () => { await db?.close(); });

async function fixture(id: string) {
  await db.exec('RESET ROLE');
  await db.query('INSERT INTO orders(id,status,items) VALUES($1,$2,$3)', [id, 'pending', JSON.stringify(items)]);
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); SELECT set_config('app.role','chef',false);`);
}
async function check(id: string, index: number, prepared = true, key = kitchenItemKey(items, index)) {
  return db.query('SELECT * FROM set_kitchen_item_prepared($1,$2,$3,$4,$5)', [id, index, JSON.stringify(items[index]), key, prepared]);
}

describe('KDS database migration in isolated PostgreSQL', () => {
  it('merges independent item checks, is idempotent, and can uncheck without losing another line', async () => {
    await fixture('merge');
    await check('merge', 0); await check('merge', 1); await check('merge', 0);
    const { rows } = await db.query<{ kitchen_progress: Record<string, boolean> }>('SELECT kitchen_progress FROM orders WHERE id=$1', ['merge']);
    expect(rows[0].kitchen_progress).toEqual({ [kitchenItemKey(items, 0)]: true, [kitchenItemKey(items, 1)]: true });
    await check('merge', 0, false);
    const result = await db.query<{ kitchen_progress: Record<string, boolean> }>('SELECT kitchen_progress FROM orders WHERE id=$1', ['merge']);
    expect(result.rows[0].kitchen_progress).toEqual({ [kitchenItemKey(items, 1)]: true });
  });
  it('rejects stale item content and invalid identities', async () => {
    await fixture('stale');
    await expect(check('stale', 0, true, kitchenItemKey(items, 1))).rejects.toThrow('identity');
    await db.query('UPDATE orders SET items=$1 WHERE id=$2', [JSON.stringify([{ ...items[0], quantity: 3 }, items[1]]), 'stale']);
    await expect(check('stale', 0)).rejects.toThrow('items changed');
  });
  it('does not let a customer invoke staff checklist updates', async () => {
    await fixture('forbidden');
    await db.exec("SELECT set_config('app.role','customer',false)");
    await expect(check('forbidden', 0)).rejects.toThrow('Kitchen access required');
  });
  it('stamps stage transitions on the server without resetting timestamps on repeated writes', async () => {
    await fixture('timing');
    const first = await db.query<{ preparing_at: string | null; ready_at: string | null }>("SELECT preparing_at,ready_at FROM orders WHERE id='timing'");
    expect(first.rows[0]).toEqual({ preparing_at: null, ready_at: null });
    const cooking = await db.query<{ preparing_at: string }>("UPDATE orders SET status='preparing' WHERE id='timing' RETURNING preparing_at");
    expect(cooking.rows[0].preparing_at).toBeTruthy();
    const repeated = await db.query<{ preparing_at: string }>("UPDATE orders SET status='preparing' WHERE id='timing' RETURNING preparing_at");
    expect(repeated.rows[0].preparing_at).toEqual(cooking.rows[0].preparing_at);
    const ready = await db.query<{ ready_at: string }>("UPDATE orders SET status='ready' WHERE id='timing' RETURNING ready_at");
    expect(ready.rows[0].ready_at).toBeTruthy();
    await expect(check('timing', 0)).rejects.toThrow('stage changed');
    const delivered = await db.query<{ delivered_at: string }>("UPDATE orders SET status='delivered' WHERE id='timing' RETURNING delivered_at");
    expect(delivered.rows[0].delivered_at).toBeTruthy();
    const recalled = await db.query<{ ready_at: string; delivered_at: string | null }>("UPDATE orders SET status='ready' WHERE id='timing' RETURNING ready_at,delivered_at");
    expect(recalled.rows[0].ready_at).toBeTruthy();
    expect(recalled.rows[0].delivered_at).toBeNull();
  });
});
