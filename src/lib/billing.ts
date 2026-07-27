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
  /** What the customer actually pays — whole rupees. */
  grandTotal: number;
  /** grandTotal − (taxable + taxes). Printed as its own line when non-zero. */
  roundOff: number;
}

export function computeBillTotals(subtotal: number, discountPercent = 0): BillTotals {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  const safePercent = Number.isFinite(discountPercent)
    ? Math.min(Math.max(discountPercent, 0), 100)
    : 0;

  const discountAmount = round2((safeSubtotal * safePercent) / 100);
  const taxable = round2(Math.max(0, safeSubtotal - discountAmount));
  const cgst = round2(taxable * HALF_GST_RATE);
  const sgst = round2(taxable * HALF_GST_RATE);
  const payable = taxable + cgst + sgst;
  const grandTotal = Math.round(payable);

  return {
    subtotal: round2(safeSubtotal),
    discountAmount,
    taxable,
    cgst,
    sgst,
    grandTotal,
    roundOff: round2(grandTotal - payable),
  };
}

/** ₹1,234 — no decimals, the way a counter display should read. */
export const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** ₹1,234.50 — for the lines of a bill, where paise matter. */
export const rupeesExact = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
