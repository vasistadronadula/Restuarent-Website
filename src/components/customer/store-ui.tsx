'use client';

import React from 'react';
import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { VegStatus } from '@/types';

/**
 * The small, repeated parts of the storefront.
 *
 * These are here rather than in `components/ui` because they are not generic
 * primitives — each one encodes a convention an Indian diner already reads
 * fluently (the FSSAI square, the green rating chip, the filter pill), and the
 * admin console must never inherit them by accident.
 */

/* ------------------------------------------------------------------ */
/*  Veg / non-veg / egg mark                                           */
/* ------------------------------------------------------------------ */

const VEG_LABEL: Record<VegStatus, string> = {
  veg: 'Vegetarian',
  'non-veg': 'Non-vegetarian',
  egg: 'Contains egg',
};

/**
 * The FSSAI mark. Legally required next to a dish, and the single fastest
 * filter a customer applies — which is why it is the first thing in a row,
 * before the name, on every surface.
 */
export function VegMark({
  status,
  size = 15,
  className,
}: {
  status: VegStatus;
  /** Pixels. 15 in a list, 18 over a photo where it competes with the image. */
  size?: number;
  className?: string;
}) {
  const cls =
    status === 'veg' ? 'veg-indicator' : status === 'egg' ? 'egg-indicator' : 'non-veg-indicator';

  return (
    <span
      className={cn(cls, className)}
      style={{ ['--mark-size' as string]: `${size}px` }}
      role="img"
      aria-label={VEG_LABEL[status] ?? VEG_LABEL['non-veg']}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Rating                                                             */
/* ------------------------------------------------------------------ */

/**
 * Rating as a filled green chip, not a row of five stars.
 *
 * Five stars costs ~70px to say what "4.3★" says in 38px, and on a phone that
 * width comes straight out of the dish name. The chip also stays legible at
 * the 11px this appears at, which a 10px star outline does not.
 */
export function RatingPill({
  value,
  count,
  className,
}: {
  value?: number | null;
  count?: number | null;
  className?: string;
}) {
  if (value == null || value <= 0) return null;

  return (
    <span className={cn('inline-flex items-center gap-1 text-[12px] leading-none', className)}>
      <span className="bg-rating inline-flex items-center gap-[3px] rounded px-1.5 py-[3px] font-bold text-white">
        <Star className="size-[9px] fill-current" aria-hidden="true" />
        <span className="tabular-nums">{value.toFixed(1)}</span>
      </span>
      {count != null && count > 0 && (
        <span className="text-ink-4 font-semibold tabular-nums">({count})</span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter pill                                                        */
/* ------------------------------------------------------------------ */

/**
 * A single filter in the horizontal chip row.
 *
 * Selected state is a tinted fill with a darker border rather than a solid
 * block, because several of these can be on at once and a row of four solid
 * blocks reads as a navigation bar, not as applied filters.
 */
export function FilterPill({
  active,
  onClick,
  children,
  leading,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  leading?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap',
        'transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30',
        active
          ? 'border-brand-300 bg-brand-50 text-brand-800 shadow-[inset_0_0_0_1px_var(--brand-200)]'
          : 'border-hair-1 bg-white text-ink-2 hover:border-ink-4/60',
        className
      )}
    >
      {leading}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section heading                                                    */
/* ------------------------------------------------------------------ */

/**
 * The heading above a group of dishes. The rule underneath is deliberately
 * short and centred on wide screens — a full-width rule at 860px reads as a
 * table header.
 */
export function SectionHeading({
  title,
  count,
  className,
}: {
  title: string;
  count?: number;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        'text-ink-1 font-display text-[17px] font-extrabold tracking-tight sm:text-[19px]',
        className
      )}
    >
      {title}
      {count != null && (
        <span className="text-ink-4 ml-1.5 text-[15px] font-semibold tabular-nums">({count})</span>
      )}
    </h2>
  );
}

/* ------------------------------------------------------------------ */
/*  Dish tags                                                          */
/* ------------------------------------------------------------------ */

/** Bestseller / Chef's special, above the dish name. */
export function DishFlag({ kind }: { kind: 'special' | 'popular' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11.5px] font-bold tracking-wide uppercase',
        kind === 'special' ? 'text-brand-700' : 'text-brand-600'
      )}
    >
      <Star className="size-3 fill-current" aria-hidden="true" />
      {kind === 'special' ? "Chef's special" : 'Bestseller'}
    </span>
  );
}
