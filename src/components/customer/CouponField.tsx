'use client';

import React, { useEffect, useState } from 'react';
import { BadgePercent, Check, X } from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatCurrency } from '@/lib/utils';
import { useCoupons } from '@/lib/queries';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';

/**
 * Apply / remove a promo code.
 *
 * Shared by the cart drawer, the cart page and the checkout — all three used to
 * carry their own copy, and they disagreed: one checked `minOrder`, one did
 * not, so a code rejected on the cart page applied cleanly at checkout.
 *
 * The live offers are listed under the input rather than hidden behind a
 * "view offers" screen. There are rarely more than three of them, and a code
 * the customer can tap is worth more than a code they have to remember and
 * retype.
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

  const applyCode = (raw: string) => {
    const code = raw.toUpperCase().trim();
    if (!code) return;

    const coupon = coupons.find((c) => c.code === code && c.isActive);
    if (!coupon) {
      toast.error('That coupon code is not valid right now');
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

  /* ── Applied ─────────────────────────────────────────────────────── */
  if (couponCode) {
    return (
      <div
        className={cn(
          'border-saving/25 bg-saving/8 flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-3',
          className
        )}
      >
        <span className="bg-saving grid size-7 shrink-0 place-items-center rounded-full text-white">
          <Check className="size-4" strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1 text-[13px] leading-tight">
          <strong className="text-ink-1 font-extrabold tracking-wide">{couponCode}</strong>
          <span className="text-saving block font-semibold">
            {formatCurrency(discountAmount)} saved on this order
          </span>
        </span>
        <button
          type="button"
          onClick={() => useCartStore.getState().removeCoupon()}
          aria-label={`Remove coupon ${couponCode}`}
          className="text-ink-4 hover:text-ink-1 hover:bg-hair-2 grid size-8 shrink-0 place-items-center rounded-full transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  /* ── Not applied ─────────────────────────────────────────────────── */
  const available = coupons.filter((c) => c.isActive);

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="border-hair-1 flex h-11 items-center gap-2 rounded-xl border border-dashed bg-white pr-1.5 pl-3.5">
        <BadgePercent className="text-brand size-[18px] shrink-0" aria-hidden="true" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyCode(input);
            }
          }}
          placeholder="Enter coupon code"
          aria-label="Coupon code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="text-ink-1 placeholder:text-ink-4 h-full min-w-0 flex-1 bg-transparent text-[13.5px] font-bold tracking-wide uppercase outline-none placeholder:font-medium placeholder:tracking-normal placeholder:normal-case"
        />
        <button
          type="button"
          onClick={() => applyCode(input)}
          disabled={!input.trim()}
          className="text-brand-700 hover:bg-brand-50 disabled:text-ink-4 h-8 shrink-0 rounded-lg px-3 text-[13px] font-extrabold transition-colors disabled:hover:bg-transparent"
        >
          Apply
        </button>
      </div>

      {available.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {available.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => applyCode(c.code)}
              className="border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-bold tracking-wide transition-colors"
            >
              {c.code} · {c.discount}% off
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
