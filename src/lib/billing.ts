/**
 * billing.ts — the one place bill arithmetic lives.
 *
 * The POS screen, the order record and the printed bill each used to do
 * their own rounding, which is how a receipt can end up with lines that
 * don't add up to its own total. Everything now derives from this function,
 * including the round-off line the bill prints.
 *
 * GST is 5% split evenly into CGST and SGST, applied after any discount —
 * matching how the printed bill lays it out.
 */

export const GST_RATE = 0.05;
export const HALF_GST_RATE = GST_RATE / 2;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface BillTotals {
  subtotal: number;
  discountAmount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  packagingCharge?: number;
  /** What the customer actually pays — whole rupees. */
  grandTotal: number;
  /** grandTotal − (taxable + taxes + packaging). Printed as its own line when non-zero. */
  roundOff: number;
}

export type DiscountOption =
  | { type: 'percent'; value: number }
  | { type: 'flat'; value: number }
  | number;

export function computeBillTotals(
  subtotal: number,
  discount: DiscountOption = 0,
  packagingCharge = 0
): BillTotals {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  let discountAmount = 0;

  if (typeof discount === 'number') {
    const safePercent = Math.min(Math.max(discount, 0), 100);
    discountAmount = round2((safeSubtotal * safePercent) / 100);
  } else if (discount.type === 'percent') {
    const safePercent = Math.min(Math.max(discount.value, 0), 100);
    discountAmount = round2((safeSubtotal * safePercent) / 100);
  } else if (discount.type === 'flat') {
    discountAmount = round2(Math.min(Math.max(discount.value, 0), safeSubtotal));
  }

  const taxable = round2(Math.max(0, safeSubtotal - discountAmount));
  const cgst = round2(taxable * HALF_GST_RATE);
  const sgst = round2(taxable * HALF_GST_RATE);
  const safePackaging = Math.max(0, packagingCharge || 0);
  const payable = taxable + cgst + sgst + safePackaging;
  const grandTotal = Math.round(payable);

  return {
    subtotal: round2(safeSubtotal),
    discountAmount,
    taxable,
    cgst,
    sgst,
    packagingCharge: safePackaging > 0 ? safePackaging : undefined,
    grandTotal,
    roundOff: round2(grandTotal - payable),
  };
}

/** ₹1,234 — no decimals, the way a counter display should read. */
export const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** ₹1,234.50 — for the lines of a bill, where paise matter. */
export const rupeesExact = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
