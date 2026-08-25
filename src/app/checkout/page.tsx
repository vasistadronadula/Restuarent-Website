'use client';

import React, { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Banknote, Check, Copy, CreditCard, Loader2, Lock,
  Phone, ShoppingBag, Store, User,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatCurrency, scrollToAndFocus } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import { BillSummary } from '@/components/customer/BillSummary';
import { CouponField } from '@/components/customer/CouponField';
import { VegMark } from '@/components/customer/store-ui';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { useCartStore } from '@/store/useCartStore';
import { orderStamps } from '@/lib/orderTime';
import { generateOrderId } from '@/lib/idGenerator';
import { supabase } from '@/lib/supabase';
import { normalizePhone } from '@/lib/validation';
import { accountDisplayName, isInternalPhoneEmail } from '@/lib/phoneIdentity';
import { triggerNewOrderPush, triggerWhatsAppOrderConfirmation } from '@/lib/triggerPush';
import { Skeleton } from '@/components/ui/skeleton';
import { restaurantInfo } from '@/data/restaurantInfo';
import { buildPrepTimeMap, estimateOrderMinutes } from '@/lib/orderEstimate';
import type { Order, PaymentMode } from '@/types';

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
}
interface RazorpayInstance {
  open: () => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

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
  const { state, subtotal, cgst, sgst, discountAmount, grandTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { menuItems } = useAdmin();

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

  // grandTotal comes from useCart() above — computeBillTotals()'s whole-rupee
  // rounding, the same math the POS bill and printed receipt use. This used
  // to be a fourth, unrounded (subtotal + cgst + sgst - discount) formula
  // computed locally, which could disagree with what's displayed/printed by
  // up to ₹0.99 and is also the amount actually sent to Razorpay.
  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!effectiveName.trim()) e.name = 'Full name required';
    if (!effectivePhone.trim()) {
      e.phone = 'Mobile number required';
    } else if (effectivePhone.trim().replace(/\D/g, '').length < 10) {
      e.phone = 'Enter valid 10-digit mobile number';
    }
    setErrors(e);

    // Field order matches the form's left-to-right layout, so whichever
    // comes first on screen is the one that gets the scroll+focus.
    const firstBad = (['name', 'phone'] as const).find((f) => e[f]);
    if (firstBad) {
      scrollToAndFocus(document.getElementById(`checkout-${firstBad}`) as HTMLElement | null);
    }

    return Object.keys(e).length === 0;
  };

  const finalizeOrder = async (
    id: string,
    mode: PaymentMode,
    razorpayResponse?: RazorpayResponse,
    customer: { name: string; phone: string } = { name: effectiveName, phone: effectivePhone }
  ) => {
    const orderItemPayload = state.items.map((i) => ({
      menuItemId: i.id,
      name: i.name,
      price: i.selectedPrice ?? i.price,
      quantity: i.quantity,
      vegStatus: i.vegStatus,
      selectedPortion: i.selectedPortion,
      category: i.category,
    }));

    const previewOrder: Order = {
      id,
      orderId: id,
      orderType: 'takeaway',
      customerId: accountEmail || customer.phone || 'GUEST',
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: `Takeaway - Collect from ${restaurantInfo.locality} Restaurant`,
      items: orderItemPayload,
      subtotal,
      cgst,
      sgst,
      discount: discountAmount,
      deliveryCharge: 0,
      grandTotal,
      status: 'pending' as const,
      paymentMode: mode,
      paymentStatus: mode === 'razorpay' ? 'paid' : 'unpaid',
      ...orderStamps(),
      couponCode: state.couponCode,
      userId: user?.id || null,
      razorpayOrderId: razorpayResponse?.razorpay_order_id,
      razorpayPaymentId: razorpayResponse?.razorpay_payment_id,
    };

    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          paymentMode: mode,
          customer: {
            name: customer.name,
            phone: customer.phone,
            email: accountEmail,
            address: previewOrder.customerAddress,
          },
          items: orderItemPayload,
          couponCode: state.couponCode,
          userId: user?.id || null,
          razorpay: razorpayResponse,
        }),
      });
      const savedOrder = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(savedOrder?.error || 'Could not save your order');
      }

      if (!user) {
        try {
          const guestOrders = JSON.parse(localStorage.getItem('ppr:guestOrderIds') || '[]');
          const updated = [id, ...guestOrders.filter((oid: string) => oid !== id)];
          localStorage.setItem('ppr:guestOrderIds', JSON.stringify(updated));
          if (customer.phone) {
            localStorage.setItem('ppr:guestPhone', customer.phone.trim());
          }
        } catch (e) {
          console.error('Failed to save guest order ID locally', e);
        }
      }

      triggerNewOrderPush(id);
      triggerWhatsAppOrderConfirmation(id);
      setCompletedOrder({ ...previewOrder, ...savedOrder } as Order);
      setPlaced(true);
      clearCart();
      setLoading(false);
    } catch {
      toast.error('We could not save your order. Please try again or contact us.');
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!validateDetails()) return;

    // CartMenuSync reconciles the cart against the menu app-wide, but that
    // runs in an effect and a fast click here could beat it to the punch —
    // finalizeOrder builds its payload straight from `state.items`, so a
    // stale, unreconciled cart line would otherwise get charged and printed
    // at a delisted/sold-out dish's old price. Re-checking synchronously
    // right before submit closes that race; if anything changed, the totals
    // above already reflect it and the customer reviews before trying again.
    if (menuItems.length > 0) {
      const { removed, repriced } = useCartStore.getState().reconcileWithMenu(menuItems);
      if (removed.length > 0) {
        toast.warning(
          removed.length === 1
            ? `${removed[0]} is no longer available and was removed from your cart — please review before paying.`
            : `${removed.length} items are no longer available and were removed from your cart — please review before paying.`,
          { duration: 7000 }
        );
        return;
      }
      if (repriced.length > 0) {
        toast.info(
          repriced.length === 1
            ? `${repriced[0]} was repriced — please review your total before paying.`
            : `${repriced.length} items were repriced — please review your total before paying.`,
          { duration: 7000 }
        );
        return;
      }
    }

    setLoading(true);

    const activeOrderId = generateOrderId();

    if (paymentChoice === 'counter') {
      await finalizeOrder(activeOrderId, 'cash');
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

    paymentHandledRef.current = false;

    const options: RazorpayOptions = {
      key: razorpayKey,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Pala Pitta Ruchulu',
      description: `Takeaway Order #${activeOrderId}`,
      image: '/logo.png',
      order_id: orderData.id,
      prefill: { name: effectiveName, contact: effectivePhone },
      // Matches --brand-500 in globals.css — this modal is the one surface
      // Razorpay owns, so it's themed by hand rather than reading the CSS
      // variable, but it still has to agree with everything else on screen.
      theme: { color: '#FC8019' },
      handler: async function (response) {
        // Razorpay closes the modal right after calling `handler`, which
        // also fires `ondismiss` — mark this payment handled so that
        // fallback check doesn't re-run against the same order.
        paymentHandledRef.current = true;
        toast.loading('Confirming your payment…', { id: 'verify-toast' });
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
            await finalizeOrder(activeOrderId, 'razorpay', response);
          } else {
            toast.error('Payment could not be verified. Please pay at counter or contact us if charged.', { id: 'verify-toast', duration: 6000 });
            setLoading(false);
          }
        } catch {
          toast.error('Payment could not be verified. Please pay at counter or contact us if charged.', { id: 'verify-toast', duration: 6000 });
          setLoading(false);
        }
      },
      modal: {
        ondismiss: async function () {
          if (paymentHandledRef.current) return;
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
    // A fresh order is always 'pending', so this is the same prep-time
    // estimate the /orders tracker shows a moment later — not the flat
    // "about 25 minutes" every order used to get regardless of what (or how
    // much) was actually ordered.
    const estimatedMinutes = estimateOrderMinutes(completedOrder, buildPrepTimeMap(menuItems));

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
                  It&apos;s with the kitchen now. Ready for pickup at {restaurantInfo.locality}
                  {typeof estimatedMinutes === 'number'
                    ? ` in about ${estimatedMinutes} minute${estimatedMinutes === 1 ? '' : 's'}.`
                    : ' shortly.'}
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
                  <Link
                    href="/orders"
                    className="bg-brand hover:bg-brand-600 flex h-12 items-center justify-center rounded-xl text-[14.5px] font-extrabold text-white transition-colors"
                  >
                    Track this order
                  </Link>
                  <Link
                    href="/menu"
                    className="border-hair-1 text-ink-2 hover:bg-hair-2 flex h-12 items-center justify-center rounded-xl border text-[14.5px] font-bold transition-colors"
                  >
                    Browse menu
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
              Takeaway — collect from our {restaurantInfo.locality} counter
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

                <div className="mt-5 grid items-start gap-4 sm:grid-cols-2">
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

              {paymentChoice === 'online' && (
                <p className="text-ink-4 mt-3 flex items-center justify-center gap-1.5 text-[11.5px] font-medium">
                  <Lock className="size-3.5" />
                  Payments are processed securely by Razorpay
                </p>
              )}
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

function CheckoutFormSkeleton() {
  return (
    <div className="bg-store flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-5 sm:py-7">
        <Container className="max-w-[1320px]">
          <Skeleton className="mb-4 h-8 w-40 rounded-lg" />
          <div className="grid items-start gap-5 lg:grid-cols-[1fr_25rem]">
            <div className="grid gap-5">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFormSkeleton />}>
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
    <div className="flex flex-col gap-1.5">
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
