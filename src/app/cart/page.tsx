'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Plus, ShieldCheck, ShoppingBag, Store, Trash2 } from 'lucide-react';

import { formatCurrency } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import { BillSummary } from '@/components/customer/BillSummary';
import { CartLineItem } from '@/components/customer/CartLineItem';
import { CouponField } from '@/components/customer/CouponField';
import { restaurantInfo } from '@/data/restaurantInfo';
import { useCoupons } from '@/lib/queries';
import { useAuth } from '@/context/AuthContext';
import { useCartStore, getCartBillTotals } from '@/store/useCartStore';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const couponMaxDiscount = useCartStore((s) => s.couponMaxDiscount);
  const { data: coupons = [] } = useCoupons();
  const { user } = useAuth();

  const totals = useMemo(
    () => getCartBillTotals(items, couponDiscount, couponMaxDiscount),
    [items, couponDiscount, couponMaxDiscount]
  );

  const itemCount = totals.totalItems;

  /* ── Empty ──────────────────────────────────────────────────────────── */
  if (items.length === 0) {
    const activeCoupons = coupons.filter((c) => c.isActive);

    return (
      <div className="bg-store flex min-h-screen flex-col">
        <Navbar />

        <main className="flex flex-1 items-center justify-center px-4 py-14">
          <div className="w-full max-w-md text-center">
            <span className="bg-brand-50 text-brand-500 mx-auto mb-5 grid size-20 place-items-center rounded-full">
              <ShoppingBag className="size-9" />
            </span>

            <h1 className="text-ink-1 font-display text-[22px] font-black tracking-tight">
              Your cart is empty
            </h1>
            <p className="text-ink-3 mx-auto mt-2 max-w-[320px] text-[13.5px] leading-relaxed">
              Nothing added yet. Have a look at the biryanis, the vepudus and the day&apos;s
              specials.
            </p>

            <Link
              href="/menu"
              className="bg-brand hover:bg-brand-600 mt-6 inline-flex h-12 items-center gap-2 rounded-xl px-7 text-[15px] font-extrabold text-white transition-colors"
            >
              Browse the menu
              <ArrowRight className="size-[18px]" />
            </Link>

            {user && activeCoupons.length > 0 && (
              <div className="border-hair-1 mt-8 rounded-2xl border border-dashed bg-white p-5">
                <p className="text-ink-4 text-[11px] font-bold tracking-wider uppercase">
                  Offers running today
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {activeCoupons.map((c) => (
                    <span
                      key={c.code}
                      className="border-brand-200 bg-brand-50 text-brand-800 rounded-lg border px-3 py-1.5 text-[12px] font-bold tracking-wide"
                    >
                      {c.code} · {c.discount}% off
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!user && (
              <div className="border-hair-1 mt-8 rounded-2xl border bg-white p-5">
                <p className="text-ink-1 text-[14px] font-bold">Sign in for offers</p>
                <p className="text-ink-3 mx-auto mt-1 max-w-[280px] text-[12.5px] leading-relaxed">
                  Coupons, saved details and order history all live behind your account.
                </p>
                <Link
                  href="/login?redirect=/cart"
                  className="border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 mt-4 inline-flex h-10 items-center rounded-xl border px-5 text-[13px] font-extrabold transition-colors"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  /* ── With items ─────────────────────────────────────────────────────── */
  return (
    <div className="bg-store flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-5 sm:py-7">
        <Container className="max-w-[1320px]">
          <h1 className="text-ink-1 font-display mb-4 text-[22px] font-black tracking-tight sm:text-[26px]">
            Your order
          </h1>

          <div className="grid items-start gap-5 lg:grid-cols-[1fr_25rem]">
            {/* ── Items ─────────────────────────────────────────────── */}
            <section className="border-hair-1 shadow-store overflow-hidden rounded-2xl border bg-white">
              <header className="border-hair-2 flex items-center gap-3 border-b px-4 py-3.5 sm:px-5">
                <span className="bg-brand-50 text-brand-600 grid size-10 shrink-0 place-items-center rounded-xl">
                  <Store className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-ink-1 truncate text-[15px] font-extrabold">
                    {restaurantInfo.name}
                  </p>
                  <p className="text-ink-4 text-[12px] font-semibold">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'} · Takeaway from{' '}
                    {restaurantInfo.addressLine}
                  </p>
                </div>
              </header>

              <ul className="divide-hair-2 divide-y px-4 sm:px-5">
                {items.map((item) => (
                  <CartLineItem key={`${item.id}-${item.selectedPortion}`} item={item} />
                ))}
              </ul>

              <div className="border-hair-2 flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
                <Link
                  href="/menu"
                  className="text-brand-700 hover:bg-brand-50 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-extrabold transition-colors"
                >
                  <Plus className="size-4" />
                  Add more items
                </Link>

                <button
                  type="button"
                  onClick={() => useCartStore.getState().clearCart()}
                  className="text-ink-4 hover:text-nonveg hover:bg-nonveg/8 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-bold transition-colors"
                >
                  <Trash2 className="size-4" />
                  Empty cart
                </button>
              </div>
            </section>

            {/* ── Bill ──────────────────────────────────────────────── */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--store-header-h)+1.25rem)]">
              <div className="border-hair-1 shadow-store rounded-2xl border bg-white p-4 sm:p-5">
                <CouponField
                  subtotal={totals.subtotal}
                  discountAmount={totals.discountAmount}
                  className="mb-5"
                />

                <BillSummary {...totals} />

                {/* Desktop only. On a phone the fixed bar at the bottom of the
                    screen is already this button, and rendering both put two
                    identical orange Checkout buttons on screen at once. */}
                <Link
                  href="/checkout"
                  className="bg-brand hover:bg-brand-600 mt-5 hidden h-13 w-full items-center justify-between rounded-xl px-5 text-white transition-colors lg:flex"
                >
                  <span className="text-[15px] font-extrabold tabular-nums">
                    {formatCurrency(totals.grandTotal)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[14px] font-extrabold tracking-wide">
                    Checkout
                    <ArrowRight className="size-[18px]" />
                  </span>
                </Link>
              </div>

              <div className="text-ink-3 grid gap-2 px-1 text-[12.5px]">
                <p className="flex items-center gap-2">
                  <Clock className="text-brand size-4 shrink-0" />
                  Cooked to order · ready in about 25–30 minutes
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="text-veg size-4 shrink-0" />
                  Collect from our {restaurantInfo.locality} counter — no delivery charge
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </main>

      {/* Phone-only checkout bar. The bill card's own button is below the fold
          on a 360px screen once there are three dishes in the cart. */}
      <div
        className="border-hair-1 fixed inset-x-0 z-30 border-t bg-white px-4 py-3 lg:hidden"
        style={{
          bottom: 'calc(var(--ppr-bottom-nav-h,0px) + env(safe-area-inset-bottom,0px))',
        }}
      >
        <Link
          href="/checkout"
          className="bg-brand hover:bg-brand-600 flex h-13 w-full items-center justify-between rounded-xl px-5 text-white transition-colors active:scale-[0.99]"
        >
          <span className="flex flex-col leading-tight">
            <span className="text-[11.5px] font-semibold text-white/85 tabular-nums">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-[16px] font-extrabold tabular-nums">
              {formatCurrency(totals.grandTotal)}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[14px] font-extrabold tracking-wide">
            Checkout
            <ArrowRight className="size-[18px]" />
          </span>
        </Link>
      </div>

      {/* Reserves the fixed bar's height so the footer clears it. */}
      <div aria-hidden="true" className="h-[76px] lg:hidden" />

      <Footer />
    </div>
  );
}
