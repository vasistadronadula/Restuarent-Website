import { expect, test } from '@playwright/test';

const dish = {
  id: 'launch-rice', name: 'Launch Test Rice', price: 100, category: 'rice',
  image: '/logo.png', veg_status: 'veg', rating: 4.5, review_count: 12,
  is_available: true, is_popular: true, is_special: false, description: 'Fresh rice',
  tags: [], prep_time: 15, max_quantity: 5, portion_prices: { single: 100, full: 180 },
};

test.beforeEach(async ({ page }) => {
  // Browser flow tests use isolated fixtures; no production data is mutated.
  await page.route('**/rest/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/menu_items') ? [dish]
      : path.endsWith('/menu_categories') ? [{ id: 'rice', slug: 'rice', name: 'Rice', is_active: true, sort_order: 1 }]
      : [];
    await route.fulfill({ json: data });
  });
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unexpected API request in browser test' } }));
});

for (const path of ['/', '/menu', '/cart', '/checkout', '/orders', '/login', '/signup', '/contact', '/terms', '/privacy-policy', '/refund-policy']) {
  test(`renders ${path} without runtime errors or horizontal overflow`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('guest can select a portion, place a counter order, and track it', async ({ page }) => {
  let saved: Record<string, unknown> | undefined;
  await page.route('**/api/orders/checkout', async route => {
    const input = route.request().postDataJSON();
    expect(input.paymentMode).toBe('cash');
    expect(input.items).toHaveLength(1);
    expect(input.items[0]).toMatchObject({ menuItemId: dish.id, quantity: 1, selectedPortion: 'single' });
    saved = { id: input.orderId, customer_name: input.customer.name, items: input.items,
      status: 'pending', grand_total: 105, subtotal: 100, cgst: 2.5, sgst: 2.5,
      payment_mode: 'cash', payment_status: 'unpaid', order_type: 'takeaway', created_at: new Date().toISOString() };
    await route.fulfill({ json: { id: input.orderId, orderId: input.orderId, items: input.items,
      grandTotal: 105, paymentStatus: 'unpaid', paymentMode: 'cash', status: 'pending' } });
  });
  await page.route('**/api/guest/orders', route => route.fulfill({ json: saved ? [saved] : [] }));
  await page.goto('/menu');
  await expect(page.getByText(dish.name).first()).toBeVisible();
  await page.getByRole('group', { name: `Portion size for ${dish.name}` }).getByRole('button', { name: 'Half', exact: true }).click();
  await page.getByRole('button', { name: `Add ${dish.name} to cart`, exact: true }).click();
  await page.goto('/checkout');
  await page.getByLabel('Full name', { exact: true }).fill('Launch Diner');
  await page.getByLabel('Mobile number', { exact: true }).fill('9876543210');
  await page.getByRole('radio', { name: /Pay at counter/ }).check();
  await page.getByRole('button', { name: /Place order/ }).filter({ visible: true }).click();
  await expect(page.getByText('Order confirmed', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Track this order' }).click();
  await expect(page.getByText(dish.name).first()).toBeVisible();
});
