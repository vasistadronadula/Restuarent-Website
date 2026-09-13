// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ clear: vi.fn(), error: vi.fn(), fetch: vi.fn(), user: null as unknown }));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ state: { items: [{ id: 'rice', name: 'Rice', price: 100, quantity: 1 }], couponCode: '' },
  subtotal: 100, cgst: 2.5, sgst: 2.5, discountAmount: 0, grandTotal: 105, clearCart: mocks.clear }) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/context/AdminContext', () => ({ useAdmin: () => ({ menuItems: [] }) }));
vi.mock('@/lib/supabase', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: null } }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
} }));
vi.mock('@/lib/triggerPush', () => ({ triggerNewOrderPush: vi.fn(), triggerWhatsAppOrderConfirmation: vi.fn() }));
vi.mock('@/components/customer/Navbar', () => ({ default: () => null }));
vi.mock('@/components/customer/Footer', () => ({ default: () => null }));
vi.mock('@/components/customer/CouponField', () => ({ CouponField: () => null }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, loading: vi.fn(), success: vi.fn(), dismiss: vi.fn() } }));
import CheckoutPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID', 'test-key');
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); delete window.Razorpay; });

function details() {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Diner' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '9876543210' } });
}
const response = () => new Response(JSON.stringify({ id: 'saved', orderId: 'saved', grandTotal: 105, paymentStatus: 'paid' }));

describe('checkout submission', () => {
  it('allows clearing autofilled details instead of immediately restoring the profile value', async () => {
    mocks.user = { id: 'user', email: 'diner@example.com', user_metadata: { name: 'Diner', phone: '9876543210' } };
    render(React.createElement(CheckoutPage));
    await act(async () => {});
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: '' } });
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('');
  });
  it('locks both submit buttons until a cash order finishes', async () => {
    let finish!: (value: Response) => void;
    mocks.fetch.mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    render(React.createElement(CheckoutPage)); details();
    fireEvent.click(screen.getByRole('radio', { name: /Pay at counter/ }));
    const buttons = screen.getAllByRole('button', { name: /Place order/ });
    act(() => { buttons[0].click(); buttons[1].click(); });
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    await act(async () => finish(response()));
    expect(screen.getByText('Order confirmed')).toBeTruthy();
  });
  it('reuses the cash order ID after a network error', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('Network lost')).mockImplementationOnce(async () => response());
    render(React.createElement(CheckoutPage)); details();
    fireEvent.click(screen.getByRole('radio', { name: /Pay at counter/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /Place order/ })[0]);
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button', { name: /Place order/ })[0]);
    await waitFor(() => expect(screen.getByText('Order confirmed')).toBeTruthy());
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body).orderId).toBe(JSON.parse(mocks.fetch.mock.calls[1][1].body).orderId);
  });
  it('retries saving a paid order without opening a second payment', async () => {
    let handlePayment!: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => Promise<void>;
    const open = vi.fn();
    window.Razorpay = class {
      constructor(options: { handler: typeof handlePayment }) { handlePayment = options.handler; }
      open = open;
    } as typeof window.Razorpay;
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'gateway', amount: 10500, currency: 'INR' })))
      .mockRejectedValueOnce(new Error('Network lost')).mockImplementationOnce(async () => response());
    render(React.createElement(CheckoutPage)); details();
    fireEvent.click(screen.getAllByRole('button', { name: /Pay now/ })[0]);
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    await act(async () => handlePayment({ razorpay_order_id: 'gateway', razorpay_payment_id: 'payment', razorpay_signature: 'signature' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Retry confirmation/ })[0]);
    await waitFor(() => expect(screen.getByText('Order confirmed')).toBeTruthy());
    expect(open).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls.map(call => call[0])).toEqual(['/api/razorpay/create-order', '/api/orders/checkout', '/api/orders/checkout']);
    expect(mocks.fetch.mock.calls[1][1].body).toBe(mocks.fetch.mock.calls[2][1].body);
  });
});
