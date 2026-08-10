'use client';

import React, { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight, Banknote, CheckCircle2, Copy, CreditCard, Lock, LogIn,
  Phone, ShoppingBag, Store, User,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatCurrency } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import { BillSummary } from '@/components/customer/BillSummary';
import { CouponField } from '@/components/customer/CouponField';
import PrintBillButton from '@/components/bill/PrintBillButton';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { generateInvoiceNo, generateOrderId } from '@/lib/idGenerator';
import { supabase } from '@/lib/supabase';
import { normalizePhone } from '@/lib/validation';
import { accountDisplayName, isInternalPhoneEmail } from '@/lib/phoneIdentity';
import { triggerNewOrderPush } from '@/lib/triggerPush';
import { restaurantInfo } from '@/data/restaurantInfo';
import type { Order, PaymentMode, PaymentStatus } from '@/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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
  const { user, loading: authLoading, openAuthModal } = useAuth();
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
      <>
        <Navbar />
        <main className="grid min-h-[70vh] place-items-center py-16">
          <div className="w-full max-w-md px-5">
            <EmptyState
              icon={ShoppingBag}
              title="Nothing to check out"
              description="Your cart is empty — add a dish or two and come back."
              action={
                <Button asChild variant="brand" size="lg">
                  <Link href="/menu">
                    Browse Menu
                    <ArrowRight />
                  </Link>
                </Button>
              }
            />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ─── Order placed ───────────────────────────────────────────────────────
  if (placed && completedOrder) {
    const isPaid = completedOrder.paymentStatus === 'paid';
    const whatsappHref = `https://wa.me/${restaurantInfo.whatsapp}?text=${encodeURIComponent(
      `Hi, I've just placed order ${completedOrder.orderId}.`
    )}`;

    return (
      <>
        <Navbar />
        <main className="grid min-h-[70vh] place-items-center py-12">
          <div className="w-full max-w-lg px-5">
            <Card className="rounded-3xl text-center">
              <CardContent className="grid gap-5 p-8">
                <div className="bg-success/10 text-success mx-auto grid size-20 place-items-center rounded-full">
                  <CheckCircle2 className="size-11" />
                </div>

                <div className="grid gap-1.5">
                  <h1 className="font-display text-2xl font-black tracking-tight">
                    Order confirmed
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    We&apos;ve sent it to the kitchen. It&apos;ll be ready for pickup at Madhapur
                    in about 25 minutes.
                  </p>
                </div>

                <div className="bg-muted grid gap-2 rounded-xl p-4">
                  <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                    Order ID
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-lg font-black break-all">{completedOrder.orderId}</code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copy order ID"
                      onClick={() => {
                        navigator.clipboard.writeText(completedOrder.orderId);
                        toast.success('Order ID copied');
                      }}
                    >
                      <Copy />
                    </Button>
                  </div>
                  <Badge
                    variant={isPaid ? 'soft-success' : 'soft-warning'}
                    className="mx-auto"
                    size="lg"
                  >
                    {isPaid ? 'Paid online' : 'Pay at counter'}
                  </Badge>
                </div>

                <div className="flex items-baseline justify-between text-left">
                  <span className="text-muted-foreground text-sm">Amount</span>
                  <span className="text-xl font-black">{formatCurrency(completedOrder.grandTotal)}</span>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Button asChild variant="brand" size="lg">
                    <a href={whatsappHref} target="_blank" rel="noreferrer noopener">
                      Message the kitchen on WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/orders">View my orders</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ─── Checkout form ──────────────────────────────────────────────────────
  return (
    <>
      <Navbar />

      <main className="min-h-[85vh] py-4 md:py-5">
        <Container>
          <header className="mb-3">
            <h1 className="font-display text-xl font-black tracking-tight md:text-2xl">
              Checkout
            </h1>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs sm:text-sm">
              <Store className="size-4" />
              Takeaway — collect from our Madhapur counter
            </p>
          </header>


          <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="grid gap-6">
              {/* ── Your details ───────────────────────────────────────── */}
              <Card>
                <CardContent className="grid gap-4">
                  <h2 className="font-display text-lg font-bold">Your details</h2>

                  <div className="grid gap-2">
                    <Label htmlFor="checkout-name">Full name</Label>
                    <div className="relative">
                      <User
                        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <Input
                        id="checkout-name"
                        value={effectiveName}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        aria-invalid={!!errors.name}
                        autoComplete="name"
                        placeholder="Name for the order"
                        className="pl-10"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-destructive text-xs font-medium">{errors.name}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="checkout-phone">Mobile number</Label>
                    <div className="relative">
                      <Phone
                        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <Input
                        id="checkout-phone"
                        type="tel"
                        inputMode="numeric"
                        value={effectivePhone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        aria-invalid={!!errors.phone}
                        autoComplete="tel"
                        placeholder="10-digit mobile number"
                        className="pl-10"
                      />
                    </div>
                    {errors.phone ? (
                      <p className="text-destructive text-xs font-medium">{errors.phone}</p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        We&apos;ll text you when the order is ready.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── Payment ────────────────────────────────────────────── */}
              <Card>
                <CardContent className="grid gap-4">
                  <h2 className="font-display text-lg font-bold">How would you like to pay?</h2>

                  <div
                    role="radiogroup"
                    aria-label="Payment method"
                    className="grid gap-3 sm:grid-cols-2"
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
                </CardContent>
              </Card>
            </div>

            {/* ── Summary ──────────────────────────────────────────────── */}
            <Card className="lg:sticky lg:top-24">
              <CardContent className="grid gap-4">
                <h2 className="font-display text-lg font-bold">Order summary</h2>

                <ul className="grid gap-2 text-sm">
                  {state.items.map((item) => (
                    <li
                      key={`${item.id}-${item.selectedPortion}`}
                      className="flex justify-between gap-3"
                    >
                      <span className="min-w-0">
                        <span className="text-muted-foreground font-semibold tabular-nums">
                          {item.quantity}×
                        </span>{' '}
                        {item.name}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatCurrency((item.selectedPrice ?? item.price) * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Separator />

                <CouponField subtotal={subtotal} discountAmount={discountAmount} />

                <BillSummary
                  subtotal={subtotal}
                  discountAmount={discountAmount}
                  cgst={cgst}
                  sgst={sgst}
                  grandTotal={grandTotal}
                />

                <Button
                  variant="brand"
                  size="lg"
                  className="w-full"
                  loading={loading}
                  onClick={handleProceedToPayment}
                >
                  {paymentChoice === 'online'
                    ? `Pay ${formatCurrency(grandTotal)}`
                    : `Place order · ${formatCurrency(grandTotal)}`}
                  {!loading && <ArrowRight />}
                </Button>

                <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                  <Lock className="size-3.5" />
                  Payments are processed securely by Razorpay
                </p>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>

      <Footer />
    </>
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
        'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors outline-none',
        'focus-visible:ring-ring/40 focus-visible:ring-[3px]',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2',
          selected ? 'border-primary' : 'border-muted-foreground/40'
        )}
      >
        {selected && <span className="bg-primary size-2.5 rounded-full" />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <Icon className="size-4" />
          {title}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs">{description}</span>
      </span>
    </button>
  );
}
