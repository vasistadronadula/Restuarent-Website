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

/** Kept in one place so ADD and the stepper cannot drift apart. */
export const ADD_CONTROL_SIZE = {
  small: 'h-9 min-w-[104px]',
  medium: 'h-10 min-w-[118px]',
} as const;

/**
 * The −/qty/+ control that replaces ADD once a dish is in the cart.
 *
 * It is a component rather than three copies of the same JSX because the swap
 * from ADD to stepper has to be dimensionally identical on every surface — a
 * stepper even a few pixels wider than the button it replaces makes the whole
 * dish list twitch sideways on the first tap.
 *
 * Green rather than the brand orange on purpose: orange is this storefront's
 * action colour and means "tap me to do the thing". This control only ever
 * appears for a dish that is *already* in the cart, so it is confirmation, not
 * a call to action, and takes the confirmation colour.
 *
 * At quantity 1 the minus becomes a bin. Decrementing to zero and removing the
 * line are the same intent, and a minus that silently deletes a row — with no
 * change of icon to warn you — is the single most complained-about control in
 * a cart.
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
        'border-veg shadow-add inline-flex items-center justify-between overflow-hidden rounded-[10px] border bg-white',
        fullWidth ? 'w-full' : 'w-auto',
        compact ? ADD_CONTROL_SIZE.small : ADD_CONTROL_SIZE.medium
      )}
    >
      <button
        type="button"
        onClick={onDecrease}
        aria-label={isOne ? `Remove ${label} from cart` : `Remove one ${label}`}
        className={cn(
          'grid h-full flex-1 place-items-center transition-colors outline-none',
          isOne
            ? 'text-nonveg hover:bg-nonveg/8 focus-visible:bg-nonveg/12'
            : 'text-veg hover:bg-veg/8 focus-visible:bg-veg/12'
        )}
      >
        {isOne ? (
          <Trash2 className={compact ? 'size-4' : 'size-[17px]'} />
        ) : (
          <Minus className={compact ? 'size-4' : 'size-[17px]'} strokeWidth={3} />
        )}
      </button>

      <span
        // `key` restarts the pop animation on every change, so 2→3 is as
        // visible as 1→2. Without it React reuses the node and the animation
        // only ever plays once.
        key={quantity}
        aria-live="polite"
        aria-label={`${label}: ${quantity} in cart`}
        className={cn(
          'text-veg animate-pop min-w-6 text-center font-extrabold tabular-nums',
          compact ? 'text-[14px]' : 'text-[15px]'
        )}
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        aria-label={`Add one more ${label}`}
        className="text-veg hover:bg-veg/8 focus-visible:bg-veg/12 grid h-full flex-1 place-items-center transition-colors outline-none"
      >
        <Plus className={compact ? 'size-4' : 'size-[17px]'} strokeWidth={3} />
      </button>
    </div>
  );
}

/**
 * The ADD button itself, so the two halves of the swap live in one file and
 * share `ADD_CONTROL_SIZE` by construction rather than by convention.
 */
export function AddButton({
  onClick,
  disabled,
  label,
  size = 'medium',
  fullWidth = false,
}: {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  label: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}) {
  const compact = size === 'small';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Add ${label} to cart`}
      className={cn(
        'border-veg text-veg shadow-add relative rounded-[10px] border bg-white font-extrabold tracking-[0.06em] uppercase',
        'transition-[transform,background-color,color] outline-none active:scale-[0.97]',
        'hover:bg-veg hover:text-white focus-visible:ring-[3px] focus-visible:ring-veg/30',
        'disabled:border-hair-1 disabled:text-ink-4 disabled:bg-hair-2 disabled:shadow-none disabled:hover:bg-hair-2 disabled:hover:text-ink-4 disabled:active:scale-100',
        fullWidth ? 'w-full' : '',
        compact ? `${ADD_CONTROL_SIZE.small} text-[13px]` : `${ADD_CONTROL_SIZE.medium} text-[14px]`
      )}
    >
      {disabled ? 'Sold out' : 'Add'}
      {!disabled && (
        <span className="absolute top-1 right-2 text-[11px] leading-none font-bold" aria-hidden="true">
          +
        </span>
      )}
    </button>
  );
}
