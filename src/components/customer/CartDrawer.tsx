'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ShoppingBag } from 'lucide-react';

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
import { restaurantInfo } from '@/data/restaurantInfo';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BillSummary } from './BillSummary';
import { CartLineItem } from './CartLineItem';
import { CouponField } from './CouponField';

export default function CartDrawer() {
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
  const pathname = usePathname();
  useEffect(() => {
    useCartStore.getState().closeCart();
  }, [pathname]);

  const close = () => useCartStore.getState().closeCart();

  return (
    <Sheet modal={false} open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="w-full gap-0 bg-white p-0 sm:max-w-md">
        <SheetHeader className="border-hair-2 border-b px-5 py-4">
          <SheetTitle className="text-ink-1 text-[16px] font-extrabold">
            {restaurantInfo.name}
          </SheetTitle>
          <p className="text-ink-4 text-[12.5px] font-semibold">
            {totalItems > 0
              ? `${totalItems} ${totalItems === 1 ? 'item' : 'items'} · Takeaway`
              : 'Your cart is empty'}
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="grid place-items-center py-20 text-center">
              <span className="bg-brand-50 text-brand-500 mb-4 grid size-14 place-items-center rounded-full">
                <ShoppingBag className="size-7" />
              </span>
              <p className="text-ink-1 text-[15px] font-extrabold">Nothing here yet</p>
              <p className="text-ink-3 mt-1 max-w-[240px] text-[13px] leading-relaxed">
                Add a dish from the menu and it will show up here.
              </p>
              <Link
                href="/menu"
                onClick={close}
                className="bg-brand hover:bg-brand-600 mt-5 flex h-11 items-center rounded-xl px-6 text-[14px] font-extrabold text-white transition-colors"
              >
                Browse the menu
              </Link>
            </div>
          ) : (
            <ul className="divide-hair-2 divide-y">
              {items.map((item) => (
                <CartLineItem key={`${item.id}-${item.selectedPortion}`} item={item} compact />
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="border-hair-1 gap-4 bg-white">
            <CouponField subtotal={totals.subtotal} discountAmount={totals.discountAmount} />
            <BillSummary {...totals} />

            <Link
              href="/checkout"
              onClick={close}
              className="bg-brand hover:bg-brand-600 flex h-13 w-full items-center justify-between rounded-xl px-5 text-white transition-colors"
            >
              <span className="text-[15px] font-extrabold tabular-nums">
                {formatCurrency(totals.grandTotal)}
              </span>
              <span className="flex items-center gap-1.5 text-[14px] font-extrabold tracking-wide">
                Checkout
                <ArrowRight className="size-[18px]" />
              </span>
            </Link>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
