'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';

import { cn, formatCurrency } from '@/lib/utils';

/**
 * The bar that appears at the bottom of the screen the moment the cart stops
 * being empty.
 *
 * It exists because the cart icon in the header scrolls out of reach on a
 * 2000px menu, and a customer three-quarters of the way down a list should not
 * have to scroll back up to find out what they have spent. It shows the two
 * numbers that answer that — how many, how much — and nothing else.
 *
 * On a phone it is a full-width bar sitting directly on top of the bottom nav
 * (`--ppr-bottom-nav-h`, published by MobileBottomNav) rather than over it. On
 * desktop it becomes a centred pill, because a full-bleed bar across a 1600px
 * monitor to say "2 items" is a lot of furniture for very little information.
 */
export default function StoreCartBar({
  itemCount,
  total,
  href = '/cart',
  label = 'View cart',
  className,
}: {
  itemCount: number;
  total: number;
  href?: string;
  label?: string;
  className?: string;
}) {
  if (itemCount <= 0) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-30 px-3 pb-3 md:px-6',
        // Clears the phone bottom nav and the iOS home indicator. Both are
        // zero on desktop, so the same expression works for both.
        'bottom-[calc(var(--ppr-bottom-nav-h,0px)+env(safe-area-inset-bottom,0px))]',
        className
      )}
    >
      <Link
        href={href}
        prefetch
        className={cn(
          'bg-veg animate-rise mx-auto flex h-14 w-full max-w-[520px] items-center justify-between gap-4 rounded-2xl px-5 text-white',
          'shadow-[0_6px_28px_rgba(15,138,69,0.34)] transition-transform outline-none active:scale-[0.99]',
          'focus-visible:ring-veg/40 focus-visible:ring-[3px] focus-visible:ring-offset-2'
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white/20">
            <ShoppingBag className="size-[18px]" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[12px] font-semibold text-white/85 tabular-nums">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-[16px] font-extrabold tabular-nums">{formatCurrency(total)}</span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5 text-[14px] font-extrabold tracking-wide">
          {label}
          <ArrowRight className="size-[18px]" />
        </span>
      </Link>
    </div>
  );
}
