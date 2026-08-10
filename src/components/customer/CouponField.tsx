'use client';

import React, { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatCurrency } from '@/lib/utils';
import { useCoupons } from '@/lib/queries';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect } from 'react';

/**
 * Apply / remove a promo code.
 *
 * Shared by the cart drawer, the cart page and the checkout — all three used to
 * carry their own copy, and they disagreed: one checked `minOrder`, one did
 * not, so a code rejected on the cart page applied cleanly at checkout.
 */
export function CouponField({
  subtotal,
  discountAmount,
  className,
}: {
  subtotal: number;
  discountAmount: number;
  className?: string;
}) {
  const [input, setInput] = useState('');
  const { data: coupons = [] } = useCoupons();
  const couponCode = useCartStore((s) => s.couponCode);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user && couponCode) {
      useCartStore.getState().removeCoupon();
    }
  }, [user, couponCode]);

  if (!user) return null;

  const apply = () => {
    const code = input.toUpperCase().trim();
    if (!code) return;

    const coupon = coupons.find((c) => c.code === code && c.isActive);
    if (!coupon) {
      toast.error('Invalid or expired coupon code');
      return;
    }
    if (subtotal < coupon.minOrder) {
      toast.error(`Add ${formatCurrency(coupon.minOrder - subtotal)} more to use ${code}`);
      return;
    }
    useCartStore.getState().applyCoupon({
      code: coupon.code,
      discount: coupon.discount,
      maxDiscount: coupon.maxDiscount,
    });
    toast.success(`${coupon.discount}% off applied`);
    setInput('');
  };

  if (couponCode) {
    return (
      <div
        className={cn(
          'border-success/25 bg-success/10 text-success flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm',
          className
        )}
      >
        <Tag className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <strong className="font-bold">{couponCode}</strong> applied — you save{' '}
          {formatCurrency(discountAmount)}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hover:bg-success/15 text-success -mr-1 size-7 shrink-0"
          onClick={() => useCartStore.getState().removeCoupon()}
          aria-label={`Remove coupon ${couponCode}`}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <div className="relative flex-1">
        <Tag
          className="text-accent pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Coupon code"
          aria-label="Coupon code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="pl-9 font-semibold tracking-wide uppercase"
        />
      </div>
      <Button variant="outline" onClick={apply} disabled={!input.trim()}>
        Apply
      </Button>
    </div>
  );
}
