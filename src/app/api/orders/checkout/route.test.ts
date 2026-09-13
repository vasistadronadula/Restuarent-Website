import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  menu: [{ id: 'rice', name: 'Rice', price: 500, category: 'rice', veg_status: 'veg',
    is_available: true, portion_prices: { single: 500, full: 800 }, max_quantity: 10 }],
  coupon: { discount: 10, max_discount: 0, min_order: 100, is_active: true },
  insert: vi.fn(), createPayment: vi.fn(), verifySignature: vi.fn(),
  fetchOrder: vi.fn(), fetchPayment: vi.fn(),
  existing: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => ({
        in: async () => ({ data: db.menu, error: null }),
        eq: () => ({ maybeSingle: async () => ({ data: table === 'orders' ? db.existing : db.coupon, error: null }) }),
      }),
      insert: table === 'orders' ? db.insert : vi.fn(),
    }),
  }),
}));
vi.mock('@/lib/razorpayServer', () => ({
  getRazorpayClient: () => ({
    orders: { create: db.createPayment, fetch: db.fetchOrder },
    payments: { fetch: db.fetchPayment },
  }),
  verifyRazorpaySignature: db.verifySignature,
}));
vi.mock('@/lib/auth/apiAuth', () => ({ assertSameOrigin: vi.fn(), authErrorResponse: vi.fn() }));
vi.mock('@/lib/auth/rateLimit', () => ({ rateLimit: () => ({ allowed: true }), clientIp: () => 'test' }));
vi.mock('@/lib/logger', () => ({ log: { error: vi.fn() } }));

import { POST as checkout } from './route';
import { POST as createPayment } from '../../razorpay/create-order/route';

const line = { menuItemId: 'rice', selectedPortion: 'single', quantity: 1 };
const basket = { orderId: 'PPR-ORD-20260828-01234567890123456789', paymentMode: 'cash',
  customer: { name: 'Guest', phone: '9876543210' }, items: [line] };
const request = (body: unknown) => new Request('https://restaurant.example/api/orders/checkout', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  db.menu[0].is_available = true;
  db.coupon = { discount: 10, max_discount: 0, min_order: 100, is_active: true };
  db.insert.mockResolvedValue({ error: null });
  db.existing = null;
  db.createPayment.mockResolvedValue({ id: 'order_gateway', amount: 52500, currency: 'INR' });
  db.verifySignature.mockReturnValue(false);
});

describe('checkout basket validation', () => {
  it.each(['1234567890', '98765432100000', 'phone9876543210'])('rejects invalid contact details: %s', async phone => {
    expect((await checkout(request({ ...basket, customer: { name: 'Guest', phone } }))).status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('rejects IDs that cannot be tracked securely', async () => {
    expect((await checkout(request({ ...basket, orderId: '1234' }))).status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });
  it('returns the original order after a lost response, including reordered JSONB keys', async () => {
    await checkout(request(basket));
    const saved = db.insert.mock.calls[0][0][0];
    db.existing = { ...saved, items: saved.items.map((item: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(item).reverse().filter(([, value]) => value !== undefined))) };
    db.insert.mockResolvedValue({ error: { code: '23505' } });
    const response = await checkout(request(basket));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: basket.orderId, grandTotal: 525 });
  });
  it('does not disclose an existing order when the retry belongs to another customer', async () => {
    await checkout(request(basket));
    db.existing = { ...db.insert.mock.calls[0][0][0], customer_phone: '9999999999' };
    db.insert.mockResolvedValue({ error: { code: '23505' } });
    expect((await checkout(request(basket))).status).toBe(409);
  });
  it('prices a cash order from the menu, ignoring submitted prices', async () => {
    const response = await checkout(request({ ...basket, items: [{ ...line, price: 1 }] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ grandTotal: 525, paymentStatus: 'unpaid' });
    expect(db.insert).toHaveBeenCalledOnce();
  });

  it.each([
    [null], [{ ...line, quantity: -1 }], [{ ...line, quantity: 1.5 }],
    [{ ...line, quantity: 'Infinity' }], [{ ...line, selectedPortion: 'invalid' }],
    [{ ...line, selectedPortion: 'large' }], Array.from({ length: 51 }, () => line),
    [line, { ...line, menuItemId: 'missing' }],
    [{ ...line, quantity: 6 }, { ...line, selectedPortion: 'full', quantity: 5 }],
  ])('rejects invalid baskets without writing a partial order: %j', async (...items) => {
    const response = await checkout(request({ ...basket, items }));
    expect(response.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('rejects a sold-out dish', async () => {
    db.menu[0].is_available = false;
    expect((await checkout(request(basket))).status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('does not silently remove a coupon when its minimum is no longer met', async () => {
    db.coupon.min_order = 1000;
    expect((await checkout(request({ ...basket, couponCode: 'SAVE' }))).status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('applies an uncapped coupon above the former cart-only cap', async () => {
    const response = await checkout(request({ ...basket, items: [{ ...line, quantity: 10 }], couponCode: 'SAVE' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ discount: 500, grandTotal: 4725 });
  });

  it('continues rejecting online orders without a valid signature', async () => {
    expect((await checkout(request({ ...basket, paymentMode: 'razorpay' }))).status).toBe(402);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('still checks captured status and gateway amounts after a valid signature', async () => {
    db.verifySignature.mockReturnValue(true);
    db.fetchOrder.mockResolvedValue({ amount: 52500, currency: 'INR', receipt: basket.orderId });
    db.fetchPayment.mockResolvedValue({ amount: 52500, currency: 'INR', order_id: 'gateway', status: 'authorized' });
    const body = { ...basket, paymentMode: 'razorpay', razorpay: {
      razorpay_order_id: 'gateway', razorpay_payment_id: 'payment', razorpay_signature: 'signature',
    } };
    expect((await checkout(request(body))).status).toBe(402);
    expect(db.insert).not.toHaveBeenCalled();
    db.fetchPayment.mockResolvedValue({ amount: 52500, currency: 'INR', order_id: 'gateway', status: 'captured' });
    const response = await checkout(request(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ paymentStatus: 'paid' });
  });
});

describe('payment preflight', () => {
  it('does not create a gateway order when the displayed amount is stale', async () => {
    const response = await createPayment(request({ amount: 100, items: [line], receipt: basket.orderId }));
    expect(response.status).toBe(409);
    expect(db.createPayment).not.toHaveBeenCalled();
  });
  it('does not start payment for an inactive coupon', async () => {
    db.coupon.is_active = false;
    const response = await createPayment(request({ amount: 525, items: [line], couponCode: 'SAVE' }));
    expect(response.status).toBe(400);
    expect(db.createPayment).not.toHaveBeenCalled();
  });
  it('creates a gateway order only for a matching live total', async () => {
    const response = await createPayment(request({ amount: 525, items: [line], receipt: basket.orderId }));
    expect(response.status).toBe(200);
    expect(db.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 52500 }));
  });
});
