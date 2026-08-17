import React from 'react';
import { BadgePercent } from 'lucide-react';

import { cn, formatCurrency } from '@/lib/utils';

interface BillSummaryProps extends React.ComponentProps<'div'> {
  subtotal: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  /** Hides the "Bill details" caption where the surrounding card already says it. */
  heading?: boolean;
}

/**
 * The bill breakup, rendered identically wherever a total is shown.
 *
 * The cart drawer, the cart page and the checkout each had their own version.
 * They rounded differently — one showed `₹128` where another showed `₹127.50`
 * for the same basket — which reads as a pricing bug to a customer comparing
 * two screens of the same order.
 *
 * Tax is one line, not two. CGST and SGST are always the same 2.5% of the same
 * base, so splitting them on screen adds a row that no customer has ever
 * needed; the printed invoice still itemises both, which is where the split is
 * actually a legal requirement.
 */
export function BillSummary({
  subtotal,
  discountAmount,
  cgst,
  sgst,
  grandTotal,
  heading = true,
  className,
  ...props
}: BillSummaryProps) {
  const tax = cgst + sgst;

  return (
    <div className={cn('text-[13.5px]', className)} {...props}>
      {heading && (
        <p className="text-ink-4 mb-3 text-[11px] font-bold tracking-wider uppercase">
          Bill details
        </p>
      )}

      <div className="grid gap-2.5">
        <Row label="Item total" value={formatCurrency(subtotal)} />

        {discountAmount > 0 && (
          <Row
            label="Coupon discount"
            value={`− ${formatCurrency(discountAmount)}`}
            tone="saving"
          />
        )}

        <Row label="Takeaway packing" value="Free" tone="saving" />
        <Row label="GST (5%)" value={formatCurrency(tax, 2)} tone="muted" />
      </div>

      <div className="rule-dash my-3.5" />

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-ink-1 text-[15px] font-extrabold">To pay</span>
        <span className="text-ink-1 text-[19px] font-black tabular-nums">
          {formatCurrency(grandTotal)}
        </span>
      </div>

      {discountAmount > 0 && (
        <p className="text-saving bg-saving/8 mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-bold">
          <BadgePercent className="size-4" aria-hidden="true" />
          You saved {formatCurrency(discountAmount)} on this order
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'muted' | 'saving';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={cn(tone === 'muted' ? 'text-ink-4' : 'text-ink-2')}>{label}</span>
      <span
        className={cn(
          'font-semibold tabular-nums',
          tone === 'saving' ? 'text-saving' : tone === 'muted' ? 'text-ink-3' : 'text-ink-1'
        )}
      >
        {value}
      </span>
    </div>
  );
}
