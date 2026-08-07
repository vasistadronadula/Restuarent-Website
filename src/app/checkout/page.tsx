'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Banknote, CheckCircle2, Copy, CreditCard, Lock, LogIn,
  Phone, ShoppingBag, Store, User,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatCurrency } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
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

export default function CheckoutPage() {
  const router = useRouter();
  const { state, subtotal, cgst, sgst, discountAmount, clearCart } = useCart();
  const { user, openAuthModal } = useAuth();
  const { addOrderLocallyAndDB } = useAdmin();

  const [form, setForm] = useState({ name: '', phone: '' });
  const [paymentChoice, setPaymentChoice] = useState<'online' | 'counter'>('online');
  const [placed, setPlaced] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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
    razorpayIds?: { razorpayOrderId?: string; razorpayPaymentId?: string }
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
      customerId: accountEmail || effectivePhone || 'GUEST',
      customerName: effectiveName,
      customerPhone: effectivePhone,
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

  const handleProceedToPayment = async () => {
    if (!user) {
      toast.error('Please log in to complete your checkout');
      router.push('/login?redirect=/checkout');
      return;
    }

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
      handler: async function (response) {
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
        ondismiss: function () {
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
                  <span className="text-xl font-black">{formatCurrency(grandTotal)}</span>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Button asChild variant="brand" size="lg">
                    <a href={whatsappHref} target="_blank" rel="noreferrer noopener">
                      Message the kitchen on WhatsApp
                    </a>
                  </Button>
                  <PrintBillButton
                    order={completedOrder}
                    invoiceNo={generateInvoiceNo(completedOrder.id)}
                    label="Print 80mm Thermal Bill"
                    format="thermal"
                    variant="outline"
                    size="lg"
                    className="w-full"
                  />
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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-3">
            <h1 className="font-display text-xl font-black tracking-tight md:text-2xl">
              Checkout
            </h1>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs sm:text-sm">
              <Store className="size-4" />
              Takeaway — collect from our Madhapur counter
            </p>
          </header>

          {!user && (
            <Card className="border-primary/25 bg-primary/5 mb-6">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="text-primary size-4" />
                  Sign in to place your order and keep your history.
                </p>
                <Button variant="brand" size="sm" asChild>
                  <Link href="/login?redirect=/checkout">
                    <LogIn />
                    Log In
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

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
        </div>
      </main>

      <Footer />
    </>
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
