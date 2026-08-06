import React from 'react';

import { cn, formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface BillSummaryProps extends React.ComponentProps<'div'> {
  subtotal: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
}

/**
 * The bill breakup, rendered identically wherever a total is shown.
 *
 * The cart drawer, the cart page and the checkout each had their own version.
 * They rounded differently — one showed `₹128` where another showed `₹127.50`
 * for the same basket — which reads as a pricing bug to a customer comparing
 * two screens of the same order.
 */
export function BillSummary({
  subtotal,
  discountAmount,
  cgst,
  sgst,
  grandTotal,
  className,
  ...props
}: BillSummaryProps) {
  return (
    <div className={cn('grid gap-1.5 text-sm tabular', className)} {...props}>
      <Row label="Subtotal" value={formatCurrency(subtotal)} />
      {discountAmount > 0 && (
        <Row
          label="Discount"
          value={`−${formatCurrency(discountAmount)}`}
          className="text-success"
        />
      )}
      <Row label="CGST (2.5%)" value={formatCurrency(cgst, 2)} muted />
      <Row label="SGST (2.5%)" value={formatCurrency(sgst, 2)} muted />
      <Row label="Delivery" value="FREE" className="text-success font-semibold" />

      <Separator className="my-1.5" />

      <div className="flex items-baseline justify-between">
        <span className="font-display text-base font-bold">Grand Total</span>
        <span className="text-primary text-xl font-black">{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  className,
}: {
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', className)}>
      <span className={cn(muted ? 'text-muted-foreground' : 'text-foreground/80')}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
