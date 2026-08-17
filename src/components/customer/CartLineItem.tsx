'use client';

import React from 'react';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE, displayNameWithoutPortion } from '@/lib/utils';
import type { CartItem } from '@/types';
import { useCartStore } from '@/store/useCartStore';
import CartStepper from './CartStepper';
import { VegMark } from './store-ui';

/**
 * One row of the cart. Used by the drawer and the cart page so a line item
 * behaves the same in both — notably the minus button at quantity 1, which
 * removes the line in one place and refused to move in the other.
 *
 * The line total sits at the far right on its own, not next to the unit price,
 * because the only number a customer checks when scanning a cart is "what is
 * this line costing me". The `₹120 × 2` breakdown is underneath it in the
 * quieter ink, for when that answer looks wrong.
 */
export function CartLineItem({
  item,
  compact = false,
  className,
}: {
  item: CartItem;
  compact?: boolean;
  className?: string;
}) {
  const unitPrice = item.selectedPrice ?? item.price;
  const lineTotal = unitPrice * item.quantity;

  return (
    <li className={cn('flex items-start gap-3 py-3.5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- see DishListItem */}
      <img
        src={item.image || FALLBACK_DISH_IMAGE}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== FALLBACK_DISH_IMAGE) img.src = FALLBACK_DISH_IMAGE;
        }}
        className={cn(
          'bg-hair-2 shrink-0 rounded-xl object-cover',
          compact ? 'size-12' : 'size-14 sm:size-16'
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <VegMark status={item.vegStatus} size={13} />
          {item.selectedPortion && (
            <span className="text-ink-3 bg-hair-2 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
              {item.selectedPortion}
            </span>
          )}
        </div>

        <p
          className={cn(
            'text-ink-1 mt-1 leading-snug font-bold',
            compact ? 'line-clamp-2 text-[13px]' : 'text-[14px] sm:text-[15px]'
          )}
        >
          {displayNameWithoutPortion(item.name, item.selectedPortion)}
        </p>

        <p className="text-ink-4 mt-0.5 text-[12px] font-medium tabular-nums">
          {formatCurrency(unitPrice)} each
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-ink-1 text-[14px] font-extrabold tabular-nums">
          {formatCurrency(lineTotal)}
        </span>
        <CartStepper
          quantity={item.quantity}
          size="small"
          label={item.name}
          onIncrease={() => useCartStore.getState().increaseQty(item.id, item.selectedPortion)}
          onDecrease={() => useCartStore.getState().decreaseQty(item.id, item.selectedPortion)}
        />
      </div>
    </li>
  );
}
