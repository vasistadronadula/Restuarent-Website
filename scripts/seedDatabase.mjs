/**
 * seedDatabase.mjs — resets test/demo operational data and seeds the real
 * menu from src/data/menuItems.json (the same file menuData.ts's client
 * fallback reads, so there's one source of truth for menu content).
 *
 * Deliberately does NOT touch: profiles (real accounts), push_subscriptions
 * (real device subscriptions), restaurant_tables (facility config, not
 * fabricated content), coupons/inventory_items/employees (already empty).
 *
 * Usage: node --env-file=.env.local scripts/seedDatabase.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

function fail(step, error) {
  console.error(`✗ ${step} failed:`, error.message);
  process.exit(1);
}

console.log('── Resetting test/demo operational data ──────────────────────');

{
  const { error, count } = await supabase.from('orders').delete().neq('id', '').select('*', { count: 'exact' });
  if (error) fail('Clearing orders', error);
  console.log(`✓ Cleared orders (${count ?? 0} rows removed)`);
}
{
  // Deleting reservations cascades to table_reservations via the FK.
  const { error, count } = await supabase.from('reservations').delete().neq('id', '').select('*', { count: 'exact' });
  if (error) fail('Clearing reservations', error);
  console.log(`✓ Cleared reservations (${count ?? 0} rows removed, table_reservations cascaded)`);
}
{
  const { error, count } = await supabase.from('menu_items').delete().neq('id', '').select('*', { count: 'exact' });
  if (error) fail('Clearing menu_items', error);
  console.log(`✓ Cleared menu_items (${count ?? 0} rows removed)`);
}

console.log('\n── Seeding the real menu ──────────────────────────────────────');

const menuItems = JSON.parse(readFileSync(join(__dirname, '../src/data/menuItems.json'), 'utf-8'));

const rows = menuItems.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  price: item.price,
  image: item.image,
  veg_status: item.vegStatus,
  rating: 4.5,
  review_count: 0,
  is_popular: Boolean(item.isPopular),
  is_special: Boolean(item.isSpecial),
  is_available: true,
  description: item.description,
  prep_time: item.prepTime,
  tags: item.tags || [],
  portion_prices: item.portionPrices || null,
}));

// Insert in chunks to stay well under any request-size limits.
const CHUNK = 50;
let inserted = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const { error, count } = await supabase.from('menu_items').insert(chunk).select('*', { count: 'exact' });
  if (error) fail(`Inserting menu_items chunk ${i}-${i + chunk.length}`, error);
  inserted += count ?? chunk.length;
}
console.log(`✓ Seeded ${inserted} menu items across ${new Set(rows.map((r) => r.category)).size} categories`);

console.log('\n── Done ────────────────────────────────────────────────────────');
console.log('orders, reservations, and menu_items are now clean. Real menu is live.');
