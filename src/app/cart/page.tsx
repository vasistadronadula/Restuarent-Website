'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Plus, ShoppingCart, Sparkles, Trash2 } from 'lucide-react';

import { formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { BillSummary } from '@/components/customer/BillSummary';
import { CartLineItem } from '@/components/customer/CartLineItem';
import { CouponField } from '@/components/customer/CouponField';
import { useCoupons } from '@/lib/queries';
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
import { MenuItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';

// Quick add-on items for cross-selling in the cart.
const ADD_ONS: MenuItem[] = [
  {
    id: 'des-01',
    name: 'Hyderabadi Apricot Delight',
    price: 149,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&q=80',
    vegStatus: 'veg',
    category: 'desserts',
    rating: 4.9,
    reviewCount: 310,
    isPopular: true,
    isSpecial: true,
    isAvailable: true,
    description: 'Slow-cooked dried apricots served with thick malai cream.',
    tags: ['Dessert', 'Bestseller'],
  },
  {
    id: 'bev-01',
    name: 'Pala Pitta Special Masala Lassi',
    price: 89,
    image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=300&q=80',
    vegStatus: 'veg',
    category: 'beverages',
    rating: 4.8,
    reviewCount: 190,
    isPopular: true,
    isSpecial: false,
    isAvailable: true,
    description: 'Refreshing churned sweet curd lassi with cardamom & roasted pistachios.',
    tags: ['Drink', 'Refreshing'],
  },
  {
    id: 'side-01',
    name: 'Mirchi Ka Salan & Raitha Pack',
    price: 49,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&q=80',
    vegStatus: 'veg',
    category: 'south-indian',
    rating: 4.9,
    reviewCount: 450,
    isPopular: true,
    isSpecial: true,
    isAvailable: true,
    description: 'Traditional Hyderabadi peanut sesame salan with fresh onion curd raitha.',
    tags: ['Side', 'Biryani Pairing'],
  },
];

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const couponMaxDiscount = useCartStore((s) => s.couponMaxDiscount);
  const { data: coupons = [] } = useCoupons();

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

  // Never suggest something already in the basket.
  const suggestions = ADD_ONS.filter((a) => !items.some((i) => i.id === a.id));

  if (items.length === 0) {
    const activeCoupons = coupons.filter((c) => c.isActive);

    return (
      <>
        <Navbar />
        <main className="flex min-h-[75vh] items-center py-12">
          <div className="mx-auto w-full max-w-lg px-5">
            <Card className="rounded-3xl">
              <CardContent className="p-8">
                <EmptyState
                  icon={ShoppingCart}
                  title="Your cart is empty"
                  description="You haven't added any dishes yet. Have a look at our Telangana, Andhra and Hyderabadi menu."
                  action={
                    <Button asChild variant="brand" size="lg">
                      <Link href="/menu">
                        Browse Menu
                        <ArrowRight />
                      </Link>
                    </Button>
                  }
                  className="py-4"
                />

                {activeCoupons.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <p className="text-muted-foreground mb-3 text-center text-sm font-bold">
                      Offers you can use today
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {activeCoupons.map((c) => (
                        <Badge key={c.code} variant="soft-warning" size="lg">
                          {c.code} · {c.discount}% off
                        </Badge>
                      ))}
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

      <main className="min-h-[85vh] py-4 md:py-5">
        <div className="mx-auto w-full max-w-none px-4 sm:px-8 md:px-12">
          <header className="mb-3">
            <h1 className="font-display text-xl font-black tracking-tight md:text-2xl">
              Your Cart
            </h1>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} · ready when you are
            </p>
          </header>

          <div className="grid items-start gap-6 lg:grid-cols-[1fr_23rem]">
            {/* ── Items ─────────────────────────────────────────────────── */}
            <div className="grid gap-6">
              <ul className="grid gap-3">
                {items.map((item) => (
                  <CartLineItem key={`${item.id}-${item.selectedPortion}`} item={item} />
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button asChild variant="outline">
                  <Link href="/menu">
                    <Plus />
                    Add more items
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => useCartStore.getState().clearCart()}
                >
                  <Trash2 />
                  Clear cart
                </Button>
              </div>

              {/* ── Cross-sell ─────────────────────────────────────────── */}
              {suggestions.length > 0 && (
                <section aria-labelledby="addons-heading">
                  <h2
                    id="addons-heading"
                    className="font-display mb-3 flex items-center gap-2 text-lg font-bold"
                  >
                    <Sparkles className="text-accent size-5" />
                    Goes well with your order
                  </h2>
                  <ul className="grid gap-3 sm:grid-cols-3">
                    {suggestions.map((addon) => (
                      <AddOnCard key={addon.id} item={addon} />
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* ── Summary ───────────────────────────────────────────────── */}
            <Card className="lg:sticky lg:top-24">
              <CardContent className="grid gap-4">
                <h2 className="font-display text-lg font-bold">Bill details</h2>

                <CouponField
                  subtotal={totals.subtotal}
                  discountAmount={totals.discountAmount}
                />

                <BillSummary {...totals} />

                <Button asChild variant="brand" size="lg" className="w-full">
                  <Link href="/checkout">
                    Proceed to Checkout
                    <ArrowRight />
                  </Link>
                </Button>

                <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                  <Clock className="size-3.5" />
                  Ready for pickup in about 25 minutes
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

function AddOnCard({ item }: { item: MenuItem }) {
  return (
    <li className="bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote dish art */}
      <img
        src={item.image || FALLBACK_DISH_IMAGE}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-24 w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start gap-1.5">
          <span className="veg-indicator mt-1 shrink-0" role="img" aria-label="Vegetarian" />
          <p className="text-[13px] leading-tight font-bold">{item.name}</p>
        </div>
        <p className="text-primary mt-auto pt-1 font-extrabold tabular-nums">
          {formatCurrency(item.price)}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-success text-success hover:bg-success/8 w-full"
          onClick={() => useCartStore.getState().addItem(item)}
          aria-label={`Add ${item.name} to cart`}
        >
          <Plus />
          Add
        </Button>
      </div>
    </li>
  );
}
