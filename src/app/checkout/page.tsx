'use client';

import React, { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight, Banknote, Check, Copy, CreditCard, Loader2, Lock,
  Phone, ShoppingBag, Store, User,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatCurrency } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import { BillSummary } from '@/components/customer/BillSummary';
import { CouponField } from '@/components/customer/CouponField';
import { VegMark } from '@/components/customer/store-ui';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { generateOrderId } from '@/lib/idGenerator';
import { supabase } from '@/lib/supabase';
import { normalizePhone } from '@/lib/validation';
import { accountDisplayName, isInternalPhoneEmail } from '@/lib/phoneIdentity';
import { triggerNewOrderPush, triggerWhatsAppOrderConfirmation } from '@/lib/triggerPush';
import { restaurantInfo } from '@/data/restaurantInfo';
import type { Order, PaymentMode, PaymentStatus } from '@/types';

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayOptions {
  key: string;
  amount?: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  order_id?: string;
  prefill: { name: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void | Promise<void>;
  modal: { ondismiss: () => void };
  /** Server route Razorpay POSTs the result to once payment finishes. */
  callback_url?: string;
  /**
   * Forces completion to be communicated via a POST to `callback_url`
   * instead of the in-page `handler` callback. UPI/QR and bank-redirect
   * payment methods can leave the customer stuck on Razorpay's own success
   * screen when only `handler` is relied on — this guarantees the browser
   * is handed back regardless of tab/JS state.
   */
  redirect?: boolean;
}
interface RazorpayInstance {
  open: () => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

// Bridges the full-page redirect Razorpay's `callback_url` flow makes:
// checkout state (activeOrderId, the name/phone the customer confirmed) is
// captured here right before `rzp.open()` and read back once
// /api/razorpay/callback lands the browser back on this page.
const PENDING_CHECKOUT_KEY = 'ppr:pendingRazorpayCheckout';

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, subtotal, cgst, sgst, discountAmount, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { addOrderLocallyAndDB } = useAdmin();

  const [form, setForm] = useState({ name: '', phone: '' });
  const [paymentChoice, setPaymentChoice] = useState<'online' | 'counter'>('online');
  const [placed, setPlaced] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  // Set the instant `handler` starts processing a payment, so a same-tick or
  // later `ondismiss` (Razorpay fires it on close regardless of outcome)
  // knows not to re-process — see the `ondismiss` handler below.
  const paymentHandledRef = useRef(false);
  // Guards the /api/razorpay/callback return-trip effect below so it acts on
  // a `?payment=` query string exactly once, even across the re-renders that
  // waiting on auth/cart hydration causes.
  const paymentCallbackHandledRef = useRef(false);

  // Autofill form state with logged-in user profile details
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const meta = user.user_metadata || {};
      const metaName = meta.full_name || meta.name || accountDisplayName(user) || '';
      const metaPhone = normalizePhone(meta.phone || user.phone || '');

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const loadedName = prof?.full_name || metaName;
      const loadedPhone = normalizePhone(prof?.phone || metaPhone);

      setForm((prev) => ({
        name: prev.name || loadedName,
        phone: prev.phone || loadedPhone,
      }));
    })();

    return () => { cancelled = true; };
  }, [user]);

  const autofillName = accountDisplayName(user);
  const autofillPhone = user?.user_metadata?.phone || user?.phone || '';
  /** Empty for a phone-only account — see the customerId note in finalizeOrder. */
  const accountEmail = isInternalPhoneEmail(user?.email) ? '' : (user?.email ?? '');
  const effectiveName = form.name || autofillName;
  const effectivePhone = form.phone || autofillPhone;

  const grandTotal = subtotal + cgst + sgst - discountAmount;

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!effectiveName.trim()) e.name = 'Full name required';
    if (!effectivePhone.trim()) {
      e.phone = 'Mobile number required';
    } else if (effectivePhone.trim().replace(/\D/g, '').length < 10) {
      e.phone = 'Enter valid 10-digit mobile number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finalizeOrder = async (
    id: string,
    mode: PaymentMode,
    status: PaymentStatus,
    razorpayIds?: { razorpayOrderId?: string; razorpayPaymentId?: string },
    // Defaults to the live form state for the normal same-page flow. The
    // /api/razorpay/callback return-trip effect below passes the name/phone
    // captured before the redirect instead, since the form's in-memory state
    // does not survive that full page navigation.
    customer: { name: string; phone: string } = { name: effectiveName, phone: effectivePhone }
  ) => {
    const orderItemPayload = state.items.map((i) => ({
      menuItemId: i.id,
      name: i.name,
      price: i.selectedPrice ?? i.price,
      quantity: i.quantity,
      vegStatus: i.vegStatus,
      selectedPortion: i.selectedPortion,
    }));

    const newOrderObj: Order = {
      id,
      orderId: id,
      orderType: 'takeaway',
      // Persisted to the `customer_email` column, so only a real address
      // belongs here. A phone customer's account carries the synthetic
      // `@palapitta.internal` placeholder instead, which would end up printed
      // on their receipt — they fall through to their number, exactly as a
      // guest checkout does.
      customerId: accountEmail || customer.phone || 'GUEST',
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: 'Takeaway — Collect from Madhapur Restaurant',
      items: orderItemPayload,
      subtotal,
      cgst,
      sgst,
      discount: discountAmount,
      deliveryCharge: 0,
      grandTotal,
      status: 'pending' as const,
      paymentMode: mode,
      paymentStatus: status,
      orderDate: new Date().toISOString().split('T')[0],
      orderTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      couponCode: state.couponCode,
      userId: user?.id || null,
      razorpayOrderId: razorpayIds?.razorpayOrderId,
      razorpayPaymentId: razorpayIds?.razorpayPaymentId,
    };

    try {
      await addOrderLocallyAndDB(newOrderObj);
      if (!user) {
        try {
          const guestOrders = JSON.parse(localStorage.getItem('ppr:guestOrderIds') || '[]');
          if (!guestOrders.includes(id)) {
            guestOrders.push(id);
            localStorage.setItem('ppr:guestOrderIds', JSON.stringify(guestOrders));
          }
        } catch (e) {
          console.error('Failed to save guest order ID locally', e);
        }
      }
    } catch {
      toast.error('We could not save your order. Please try again or contact us.');
      setLoading(false);
      return;
    }

    triggerNewOrderPush(id);
    triggerWhatsAppOrderConfirmation(id);
    setCompletedOrder(newOrderObj);
    setPlaced(true);
    clearCart();
    setLoading(false);
  };

  // Return trip from /api/razorpay/callback (see the `redirect`/`callback_url`
  // options below). Waits for the Supabase session and the persisted cart to
  // both rehydrate after the full-page navigation before finalizing, so this
  // never fires against a still-empty store or a signed-out `user`.
  React.useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment || paymentCallbackHandledRef.current) return;
    if (authLoading) return;
    if (state.items.length === 0) return;

    paymentCallbackHandledRef.current = true;
    router.replace('/checkout', { scroll: false });

    let pending: { activeOrderId: string; name: string; phone: string } | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
      if (raw) pending = JSON.parse(raw);
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    } catch {
      // Storage disabled (private mode) — falls through to the "could not
      // confirm automatically" toast below, same as a missing entry.
    }

    if (payment !== 'success' || !pending) {
      toast.error(
        payment === 'success'
          ? 'We could not confirm your payment automatically. If you were charged, please contact us with your payment reference.'
          : 'Payment was not completed. You can retry or pay at the counter.'
      );
      return;
    }

    // Syncing to the external redirect Razorpay's server just made (the
    // `?payment=` query string), not deriving state from a render — the same
    // exception carousel.tsx documents for Embla's subscribe callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    toast.success('Payment received successfully');
    finalizeOrder(
      pending.activeOrderId,
      'razorpay',
      'paid',
      {
        razorpayOrderId: searchParams.get('rp_order_id') || undefined,
        razorpayPaymentId: searchParams.get('rp_payment_id') || undefined,
      },
      { name: pending.name, phone: pending.phone }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, authLoading, state.items.length]);

  const handleProceedToPayment = async () => {
    if (!validateDetails()) return;
    setLoading(true);

    const activeOrderId = generateOrderId();

    if (paymentChoice === 'counter') {
      await finalizeOrder(activeOrderId, 'cash', 'unpaid');
      return;
    }

    // Online Payment mode
    let orderData: { id?: string; amount?: number; currency?: string } | undefined;
    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: grandTotal,
          currency: 'INR',
          receipt: activeOrderId,
          notes: { customerName: effectiveName, customerPhone: effectivePhone },
        }),
      });
      orderData = await res.json();
      if (!res.ok || !orderData?.id) {
        toast.error('Online payment service is momentarily busy. You can pay at counter or retry.');
        setLoading(false);
        return;
      }
    } catch {
      toast.error('Online payment service is momentarily busy. You can pay at counter or retry.');
      setLoading(false);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!scriptLoaded || !razorpayKey) {
      toast.error('Payment window could not be loaded. Please try paying at counter.');
      setLoading(false);
      return;
    }

    const confirmedOrderData = orderData;
    paymentHandledRef.current = false;

    // Survives the full-page navigation that the `redirect: true` /
    // `callback_url` completion flow below makes — the in-memory `form`
    // state does not.
    try {
      sessionStorage.setItem(
        PENDING_CHECKOUT_KEY,
        JSON.stringify({ activeOrderId, name: effectiveName, phone: effectivePhone })
      );
    } catch {
      // Private mode / storage disabled — the callback return-trip effect
      // falls back to its "could not confirm automatically" toast.
    }

    const options: RazorpayOptions = {
      key: razorpayKey,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Pala Pitta Ruchulu',
      description: `Takeaway Order #${activeOrderId}`,
      image: '/logo.png',
      order_id: orderData.id,
      prefill: { name: effectiveName, contact: effectivePhone },
      theme: { color: '#C62828' },
      // Guarantees the browser is handed back to the app after payment via
      // a server-side POST redirect instead of relying solely on the
      // `handler` callback below, which UPI/QR and bank-redirect payment
      // methods can leave stranded on Razorpay's own success screen.
      callback_url: `${window.location.origin}/api/razorpay/callback`,
      redirect: true,
      handler: async function (response) {
        // Razorpay closes the modal right after calling `handler`, which
        // also fires `ondismiss` — mark this payment handled so that
        // fallback check doesn't re-run against the same order.
        paymentHandledRef.current = true;
        toast.loading('Confirming your payment…', { id: 'verify-toast' });
        const razorpayIds = {
          razorpayOrderId: response.razorpay_order_id as string,
          razorpayPaymentId: response.razorpay_payment_id as string,
        };
        try {
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyRes.ok && verifyData.success) {
            toast.success('Payment received successfully', { id: 'verify-toast' });
            await finalizeOrder(activeOrderId, 'razorpay', 'paid', razorpayIds);
          } else {
            toast.error('Payment status pending verification. Show receipt at counter.', { id: 'verify-toast', duration: 6000 });
            await finalizeOrder(activeOrderId, 'razorpay', 'unpaid', razorpayIds);
          }
        } catch {
          toast.error('Payment status pending verification. Show receipt at counter.', { id: 'verify-toast', duration: 6000 });
          await finalizeOrder(activeOrderId, 'razorpay', 'unpaid', razorpayIds);
        }
      },
      modal: {
        // Fires whenever the modal closes, including right after a
        // successful payment — and, for UPI intent/QR payments, also when
        // the customer closes it themselves as soon as their UPI app shows
        // "paid," without waiting for the modal's own polling to catch up.
        // Rather than assume cancellation, confirm with Razorpay directly
        // before giving up — that's the gap that left customers stuck on
        // the checkout form after a payment that had actually gone through.
        ondismiss: async function () {
          if (paymentHandledRef.current) return;

          const orderId = confirmedOrderData.id;
          if (!orderId) {
            toast.error('Payment cancelled.');
            setLoading(false);
            return;
          }

          toast.loading('Checking payment status…', { id: 'verify-toast' });
          try {
            const statusRes = await fetch('/api/razorpay/order-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ razorpay_order_id: orderId }),
            });
            const statusData = await statusRes.json();

            if (statusRes.ok && statusData.paid) {
              paymentHandledRef.current = true;
              toast.success('Payment received successfully', { id: 'verify-toast' });
              await finalizeOrder(activeOrderId, 'razorpay', 'paid', {
                razorpayOrderId: orderId,
                razorpayPaymentId: statusData.razorpay_payment_id,
              });
              return;
            }
          } catch {
            // Fall through — treat as cancelled below.
          }

          toast.dismiss('verify-toast');
          toast.error('Payment cancelled.');
          setLoading(false);
        },
      },
    };

    if (!window.Razorpay) {
      toast.error('Payment window could not be loaded. Try paying at counter.');
      setLoading(false);
      return;
    }
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // ─── Empty cart ─────────────────────────────────────────────────────────
  if (state.items.length === 0 && !placed) {
    return (
      <div className="bg-store flex min-h-screen flex-col">
        <Navbar />
        <main className="grid flex-1 place-items-center px-4 py-16">
          <div className="w-full max-w-sm text-center">
            <span className="bg-brand-50 text-brand-500 mx-auto mb-5 grid size-20 place-items-center rounded-full">
              <ShoppingBag className="size-9" />
            </span>
            <h1 className="text-ink-1 font-display text-[22px] font-black tracking-tight">
              Nothing to check out
            </h1>
            <p className="text-ink-3 mt-2 text-[13.5px] leading-relaxed">
              Your cart is empty — add a dish or two and come back.
            </p>
            <Link
              href="/menu"
              className="bg-brand hover:bg-brand-600 mt-6 inline-flex h-12 items-center gap-2 rounded-xl px-7 text-[15px] font-extrabold text-white transition-colors"
            >
              Browse the menu
              <ArrowRight className="size-[18px]" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Order placed ───────────────────────────────────────────────────────
  if (placed && completedOrder) {
    const isPaid = completedOrder.paymentStatus === 'paid';
    const whatsappHref = `https://wa.me/${restaurantInfo.whatsapp}?text=${encodeURIComponent(
      `Hi, I've just placed order ${completedOrder.orderId}.`
    )}`;

    return (
      <div className="bg-store flex min-h-screen flex-col">
        <Navbar />
        <main className="grid flex-1 place-items-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="border-hair-1 shadow-store overflow-hidden rounded-2xl border bg-white">
              {/* Green, not orange. This panel confirms something that already
                  happened — there is no action left to take here. */}
              <div className="bg-veg px-6 py-8 text-center text-white">
                <span className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-white/20">
                  <Check className="size-9" strokeWidth={3} />
                </span>
                <h1 className="font-display text-[22px] font-black tracking-tight">
                  Order confirmed
                </h1>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/85">
                  It&apos;s with the kitchen now. Ready for pickup at Madhapur in about 25 minutes.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <div className="border-hair-1 rounded-xl border border-dashed px-4 py-3.5 text-center">
                  <p className="text-ink-4 text-[11px] font-bold tracking-wider uppercase">
                    Order ID
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <code className="text-ink-1 text-[17px] font-black break-all">
                      {completedOrder.orderId}
                    </code>
                    <button
                      type="button"
                      aria-label="Copy order ID"
                      onClick={() => {
                        navigator.clipboard.writeText(completedOrder.orderId);
                        toast.success('Order ID copied');
                      }}
                      className="text-ink-4 hover:text-ink-1 hover:bg-hair-2 grid size-8 place-items-center rounded-lg transition-colors"
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="border-hair-2 mt-5 flex items-baseline justify-between border-t pt-4">
                  <span className="text-ink-3 text-[13.5px]">Amount</span>
                  <span className="text-ink-1 text-[20px] font-black tabular-nums">
                    {formatCurrency(completedOrder.grandTotal)}
                  </span>
                </div>
                <p
                  className={cn(
                    'mt-2 inline-flex rounded-lg px-2.5 py-1 text-[12px] font-bold',
                    isPaid ? 'bg-saving/10 text-saving' : 'bg-brand-50 text-brand-700'
                  )}
                >
                  {isPaid ? 'Paid online' : 'Pay at the counter when you collect'}
                </p>

                <div className="mt-6 grid gap-2.5">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="bg-brand hover:bg-brand-600 flex h-12 items-center justify-center rounded-xl text-[14.5px] font-extrabold text-white transition-colors"
                  >
                    Message the kitchen on WhatsApp
                  </a>
                  <Link
                    href="/orders"
                    className="border-hair-1 text-ink-2 hover:bg-hair-2 flex h-12 items-center justify-center rounded-xl border text-[14.5px] font-bold transition-colors"
                  >
                    Track this order
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── Checkout form ──────────────────────────────────────────────────────
  const payLabel = paymentChoice === 'online' ? 'Pay now' : 'Place order';

  return (
    <div className="bg-store flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-5 sm:py-7">
        <Container className="max-w-[1320px]">
          <header className="mb-4">
            <h1 className="text-ink-1 font-display text-[22px] font-black tracking-tight sm:text-[26px]">
              Checkout
            </h1>
            <p className="text-ink-3 mt-1 flex items-center gap-1.5 text-[13px] font-medium">
              <Store className="text-brand size-4" />
              Takeaway — collect from our Madhapur counter
            </p>
          </header>

          <div className="grid items-start gap-5 lg:grid-cols-[1fr_25rem]">
            <div className="grid gap-5">
              {/* ── Your details ───────────────────────────────────────── */}
              <section className="border-hair-1 shadow-store rounded-2xl border bg-white p-5 sm:p-6">
                <h2 className="text-ink-1 text-[16px] font-extrabold">Your details</h2>
                <p className="text-ink-4 mt-0.5 text-[12.5px]">
                  The kitchen calls this number when the order is ready.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field
                    id="checkout-name"
                    label="Full name"
                    icon={User}
                    error={errors.name}
                    value={effectiveName}
                    onChange={(value) => setForm({ ...form, name: value })}
                    placeholder="Name for the order"
                    autoComplete="name"
                  />

                  <Field
                    id="checkout-phone"
                    label="Mobile number"
                    icon={Phone}
                    error={errors.phone}
                    hint="We'll text you when the order is ready."
                    value={effectivePhone}
                    onChange={(value) => setForm({ ...form, phone: value })}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                    type="tel"
                    inputMode="numeric"
                  />
                </div>
              </section>

              {/* ── Payment ────────────────────────────────────────────── */}
              <section className="border-hair-1 shadow-store rounded-2xl border bg-white p-5 sm:p-6">
                <h2 className="text-ink-1 text-[16px] font-extrabold">How would you like to pay?</h2>

                <div
                  role="radiogroup"
                  aria-label="Payment method"
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  <PaymentOption
                    selected={paymentChoice === 'online'}
                    onSelect={() => setPaymentChoice('online')}
                    icon={CreditCard}
                    title="Pay online"
                    description="UPI, card or wallet — secured by Razorpay"
                  />
                  <PaymentOption
                    selected={paymentChoice === 'counter'}
                    onSelect={() => setPaymentChoice('counter')}
                    icon={Banknote}
                    title="Pay at counter"
                    description="Settle when you collect your order"
                  />
                </div>
              </section>
            </div>

            {/* ── Summary ──────────────────────────────────────────────── */}
            <aside className="border-hair-1 shadow-store rounded-2xl border bg-white p-5 sm:p-6 lg:sticky lg:top-[calc(var(--store-header-h)+1.25rem)]">
              <h2 className="text-ink-1 text-[16px] font-extrabold">Order summary</h2>

              <ul className="divide-hair-2 mt-3 divide-y">
                {state.items.map((item) => (
                  <li
                    key={`${item.id}-${item.selectedPortion}`}
                    className="flex items-start justify-between gap-3 py-2.5 text-[13px]"
                  >
                    <span className="text-ink-2 flex min-w-0 items-start gap-2">
                      <span className="mt-0.5 shrink-0">
                        <VegMark status={item.vegStatus} size={13} />
                      </span>
                      <span className="min-w-0">
                        {item.name}
                        <span className="text-ink-4 ml-1 font-semibold tabular-nums">
                          × {item.quantity}
                        </span>
                      </span>
                    </span>
                    <span className="text-ink-1 shrink-0 font-semibold tabular-nums">
                      {formatCurrency((item.selectedPrice ?? item.price) * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <CouponField
                subtotal={subtotal}
                discountAmount={discountAmount}
                className="border-hair-2 mt-4 border-t pt-4"
              />

              <BillSummary
                subtotal={subtotal}
                discountAmount={discountAmount}
                cgst={cgst}
                sgst={sgst}
                grandTotal={grandTotal}
                className="border-hair-2 mt-4 border-t pt-4"
              />

              {/* Desktop pay button. The phone gets the fixed bar below
                  instead, so this one is hidden there rather than duplicated. */}
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={loading}
                className="bg-brand hover:bg-brand-600 mt-5 hidden h-13 w-full items-center justify-between rounded-xl px-5 text-white transition-colors disabled:opacity-60 lg:flex"
              >
                <span className="text-[15px] font-extrabold tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
                <span className="flex items-center gap-1.5 text-[14px] font-extrabold tracking-wide">
                  {loading ? <Loader2 className="size-[18px] animate-spin" /> : payLabel}
                  {!loading && <ArrowRight className="size-[18px]" />}
                </span>
              </button>

              <p className="text-ink-4 mt-3 flex items-center justify-center gap-1.5 text-[11.5px] font-medium">
                <Lock className="size-3.5" />
                Payments are processed securely by Razorpay
              </p>
            </aside>
          </div>
        </Container>
      </main>

      {/* Phone pay bar. Checkout hides the bottom nav (see MobileBottomNav's
          HIDDEN_PREFIXES), so this only has to clear the home indicator. */}
      <div
        className="border-hair-1 fixed inset-x-0 bottom-0 z-30 border-t bg-white px-4 py-3 lg:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom,0px))' }}
      >
        <button
          type="button"
          onClick={handleProceedToPayment}
          disabled={loading}
          className="bg-brand hover:bg-brand-600 flex h-13 w-full items-center justify-between rounded-xl px-5 text-white transition-colors active:scale-[0.99] disabled:opacity-60"
        >
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[11.5px] font-semibold text-white/85">
              {paymentChoice === 'online' ? 'UPI · card · wallet' : 'Pay when you collect'}
            </span>
            <span className="text-[16px] font-extrabold tabular-nums">
              {formatCurrency(grandTotal)}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[14px] font-extrabold tracking-wide">
            {loading ? <Loader2 className="size-[18px] animate-spin" /> : payLabel}
            {!loading && <ArrowRight className="size-[18px]" />}
          </span>
        </button>
      </div>

      <div aria-hidden="true" className="h-[76px] lg:hidden" />

      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}

function PaymentOption({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors outline-none',
        'focus-visible:ring-brand/25 focus-visible:ring-[3px]',
        selected ? 'border-brand bg-brand-50' : 'border-hair-1 hover:border-ink-4/50 bg-white'
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-2',
          selected ? 'border-brand' : 'border-ink-4/50'
        )}
      >
        {selected && <span className="bg-brand size-2.5 rounded-full" />}
      </span>
      <span className="min-w-0">
        <span className="text-ink-1 flex items-center gap-1.5 text-[14px] font-bold">
          <Icon className={cn('size-4', selected ? 'text-brand' : 'text-ink-4')} />
          {title}
        </span>
        <span className="text-ink-3 mt-1 block text-[12px] leading-snug">{description}</span>
      </span>
    </button>
  );
}

/**
 * One labelled input. Extracted because the two on this page were 20 identical
 * lines apart from the icon, and the error/hint slot below them had already
 * drifted — one showed the hint under an error, the other replaced it.
 */
function Field({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  error,
  hint,
  ...input
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
} & Omit<React.ComponentProps<'input'>, 'id' | 'value' | 'onChange'>) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-ink-2 text-[13px] font-bold">
        {label}
      </label>
      <div className="relative">
        <Icon className="text-ink-4 pointer-events-none absolute top-1/2 left-3.5 size-[17px] -translate-y-1/2" />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          className={cn(
            'text-ink-1 placeholder:text-ink-4 h-12 w-full rounded-xl border bg-white pr-4 pl-11 text-[14px] font-medium',
            'transition-colors outline-none focus:ring-[3px]',
            error
              ? 'border-nonveg focus:ring-nonveg/20'
              : 'border-hair-1 focus:border-brand-300 focus:ring-brand/15'
          )}
          {...input}
        />
      </div>
      {(error || hint) && (
        <p
          id={`${id}-note`}
          className={cn('text-[12px]', error ? 'text-nonveg font-semibold' : 'text-ink-4')}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
