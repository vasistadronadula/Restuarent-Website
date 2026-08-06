'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ShoppingCart } from 'lucide-react';

import { formatCurrency } from '@/lib/utils';
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
import { EmptyState } from '@/components/ui/empty-state';
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { BillSummary } from './BillSummary';
import { CartLineItem } from './CartLineItem';
import { CouponField } from './CouponField';

export default function CartDrawer() {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const couponMaxDiscount = useCartStore((s) => s.couponMaxDiscount);

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

  const totalItems = getCartTotalItems(items);

  // Close the drawer whenever the route changes — it is an overlay on the page
  // that was open, not a persistent panel.
  useEffect(() => {
    useCartStore.getState().closeCart();
  }, [pathname]);

  const close = () => useCartStore.getState().closeCart();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="bg-primary text-primary-foreground border-b-0">
          <SheetTitle className="text-primary-foreground flex items-center gap-2">
            <ShoppingCart className="size-5" />
            Your Cart
          </SheetTitle>
          {totalItems > 0 && (
            <Badge variant="outline" className="mt-1 w-fit border-white/25 bg-white/15 text-white">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Your cart is empty"
              description="Add something from the menu and it will show up here."
              action={
                <Button asChild variant="brand" onClick={close}>
                  <Link href="/menu">Browse Menu</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-2.5">
              {items.map((item) => (
                <CartLineItem key={`${item.id}-${item.selectedPortion}`} item={item} compact />
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="gap-3">
            <CouponField subtotal={totals.subtotal} discountAmount={totals.discountAmount} />
            <BillSummary {...totals} />

            <Button asChild variant="brand" size="lg" className="w-full" onClick={close}>
              <Link href="/checkout">
                Checkout · {formatCurrency(totals.grandTotal)}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="w-full" onClick={close}>
              <Link href="/menu">Add more items</Link>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
