'use client';

import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

interface Props {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  /** Matches the ADD button it replaces, so the row doesn't resize on the first tap. */
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  label: string;
}

/**
 * The −/qty/+ control that replaces ADD once a dish is in the cart.
 *
 * It is a component rather than three copies of the same JSX because the swap
 * from ADD to stepper has to be dimensionally identical on every surface — a
 * stepper even a few pixels wider than the button it replaces makes the whole
 * dish list twitch sideways on the first tap.
 *
 * Green rather than the brand red on purpose: this control only ever appears
 * for a dish that is already in the cart, so its colour is the confirmation.
 * (The neutral `QuantityStepper` in components/ui is the one used inside the
 * cart itself, where "in the cart" is not news.)
 */
export default function CartStepper({
  quantity,
  onIncrease,
  onDecrease,
  size = 'medium',
  fullWidth = false,
  label,
}: Props) {
  const compact = size === 'small';
  const isOne = quantity === 1;

  return (
    <div
      className={cn(
        'border-success bg-card inline-flex items-center justify-between overflow-hidden rounded-xl border-[1.5px] shadow-[0_4px_14px_rgba(46,125,50,0.18)]',
        fullWidth ? 'w-full' : 'w-auto',
        compact ? 'h-8 min-w-23' : 'h-9.5 min-w-26'
      )}
    >
      <button
        type="button"
        onClick={onDecrease}
        aria-label={isOne ? `Remove ${label} from cart` : `Remove one ${label}`}
        className={cn(
          isOne ? 'text-destructive hover:bg-destructive/10' : 'text-success hover:bg-success/10',
          'grid h-full place-items-center transition-colors outline-none focus-visible:bg-success/15',
          compact ? 'w-7' : 'w-8.5'
        )}
      >
        {isOne ? (
          <Trash2 className={compact ? 'size-3.5' : 'size-4'} />
        ) : (
          <Minus className={compact ? 'size-3.5' : 'size-4'} />
        )}
      </button>

      <span
        aria-live="polite"
        aria-label={`${label}: ${quantity} in cart`}
        className={cn(
          'text-success min-w-5.5 text-center font-black tabular-nums',
          compact ? 'text-[13px]' : 'text-[15px]'
        )}
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        aria-label={`Add one more ${label}`}
        className={cn(
          'text-success hover:bg-success/10 grid h-full place-items-center transition-colors outline-none focus-visible:bg-success/15',
          compact ? 'w-7' : 'w-8.5'
        )}
      >
        <Plus className={compact ? 'size-3.5' : 'size-4'} />
      </button>
    </div>
  );
}
