'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Plus, ShoppingBag, ShoppingCart, Trash2, ShieldCheck, Utensils, Tag } from 'lucide-react';

import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import { BillSummary } from '@/components/customer/BillSummary';
import { CartLineItem } from '@/components/customer/CartLineItem';
import { CouponField } from '@/components/customer/CouponField';
import { useCoupons } from '@/lib/queries';
import { useAuth } from '@/context/AuthContext';
import {
  useCartStore,
  getCartTotalItems,
  getCartSubtotal,
  getCartDiscountAmount,
  getCartTaxableAmount,
  getCartCgst,
  getCartSgst,
  getCartGrandTotal,
} from '@/store/useCartStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const couponMaxDiscount = useCartStore((s) => s.couponMaxDiscount);
  const { data: coupons = [] } = useCoupons();
  const { user } = useAuth();

  const totals = useMemo(() => {
    const subtotal = getCartSubtotal(items);
    const discountAmount = getCartDiscountAmount(subtotal, couponDiscount, couponMaxDiscount);
    const taxable = getCartTaxableAmount(subtotal, discountAmount);
    const cgst = getCartCgst(taxable);
    const sgst = getCartSgst(taxable);
    return {
      subtotal,
      discountAmount,
      cgst,
      sgst,
      grandTotal: getCartGrandTotal(taxable, cgst, sgst),
    };
  }, [items, couponDiscount, couponMaxDiscount]);

  const totalItemsCount = getCartTotalItems(items);

  if (items.length === 0) {
    const activeCoupons = coupons.filter((c) => c.isActive);

    return (
      <>
        <Navbar />
        <main className="flex min-h-[75vh] items-center justify-center py-10 px-4">
          <div className="w-full max-w-md">
            <Card className="rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm bg-card">
              <CardContent className="p-6 sm:p-8 text-center">
                <EmptyState
                  icon={ShoppingCart}
                  title="Your cart is empty"
                  description="You haven't added any dishes yet. Explore our authentic Telangana, Andhra, and Hyderabadi menu."
                  action={
                    <Button asChild variant="brand" size="lg" className="rounded-xl font-bold shadow-md">
                      <Link href="/menu">
                        <Utensils className="mr-1.5 size-4" />
                        Browse Menu
                        <ArrowRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  }
                  className="py-2"
                />

                {user ? (
                  activeCoupons.length > 0 && (
                    <>
                      <Separator className="my-6" />
                      <div className="space-y-2.5">
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                          Available Offers Today
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {activeCoupons.map((c) => (
                            <Badge key={c.code} variant="soft-warning" size="lg" className="rounded-lg font-bold">
                              {c.code} · {c.discount}% off
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <Separator className="my-6" />
                    <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-4 flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Tag className="size-4 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider">Unlock Special Offers</span>
                      </div>
                      <p className="text-xs text-muted-foreground max-w-[280px] leading-normal mx-auto">
                        Sign in to view active coupons and claim discounts on your order.
                      </p>
                      <Button size="sm" variant="brand" className="rounded-xl h-8 text-xs font-bold px-4" asChild>
                        <Link href="/login?redirect=/cart">
                          Log In
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-[85vh] py-5 sm:py-7 pb-[calc(var(--ppr-bottom-nav-h,0px)+2.5rem)] md:pb-12">
        <Container className="max-w-6xl">
          {/* Header */}
          <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <ShoppingBag className="size-5" />
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight">
                  Your Cart
                </h1>
                <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5 rounded-full">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                Review your selected dishes before proceeding to secure checkout
              </p>
            </div>

            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex rounded-xl font-bold text-xs h-9">
              <Link href="/menu">
                <Plus className="size-3.5 mr-1" />
                Add More Dishes
              </Link>
            </Button>
          </div>

          {/* Cart Grid Layout */}
          <div className="grid items-start gap-6 lg:grid-cols-12">
            {/* ── Left Column: Items List ─────────────────────────────────── */}
            <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-4">
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <CartLineItem key={`${item.id}-${item.selectedPortion}`} item={item} />
                ))}
              </ul>

              {/* Cart Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button asChild variant="outline" size="sm" className="rounded-xl font-bold text-xs h-9 sm:hidden">
                  <Link href="/menu">
                    <Plus className="size-3.5 mr-1" />
                    Add More Items
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 text-xs font-bold h-9 rounded-xl ml-auto"
                  onClick={() => useCartStore.getState().clearCart()}
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Clear Entire Cart
                </Button>
              </div>
            </div>

            {/* ── Right Column: Order Summary ────────────────────────────── */}
            <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 flex flex-col gap-4">
              <Card className="rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-sm bg-card overflow-hidden">
                <div className="bg-stone-50 dark:bg-stone-900/60 px-5 py-3.5 border-b border-border/80 flex items-center justify-between">
                  <h2 className="font-display text-sm sm:text-base font-bold text-foreground">
                    Bill Summary
                  </h2>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {totalItemsCount} {totalItemsCount === 1 ? 'dish' : 'dishes'}
                  </span>
                </div>

                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Coupon / Promo Code Field */}
                  <CouponField
                    subtotal={totals.subtotal}
                    discountAmount={totals.discountAmount}
                  />

                  <Separator />

                  {/* Calculated Bill Breakdown */}
                  <BillSummary {...totals} />

                  {/* Checkout Button */}
                  <Button asChild variant="brand" size="lg" className="w-full h-12 rounded-xl text-base font-extrabold shadow-md">
                    <Link href="/checkout">
                      Proceed to Checkout
                      <ArrowRight className="ml-1.5 size-4" />
                    </Link>
                  </Button>

                  {/* Delivery & Assurance Info */}
                  <div className="space-y-2 pt-1 border-t border-border/60">
                    <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs font-medium text-center">
                      <Clock className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      Freshly prepared · Ready in ~25-30 mins
                    </p>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
                      <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      100% Authentic Telugu & Hyderabadi Quality
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
