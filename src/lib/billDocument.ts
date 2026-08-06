import { restaurantInfo } from '@/data/restaurantInfo';
import type { Order } from '@/types';

/**
 * billDocument.ts — what a bill says, decided once.
 *
 * There are two renderers for the same bill: the HTML one the browser prints
 * (ThermalBill) and the ESC/POS byte stream the counter's Bluetooth printer
 * receives (thermalPrinter). They had drifted — the paper receipt was missing
 * the delivery charge, and neither of them printed the round-off, so a bill
 * whose total had been rounded showed lines that visibly did not add up to it.
 * A customer checking the arithmetic on a GST bill and finding it short by a
 * rupee is not a cosmetic problem.
 *
 * So the wording, the ordering and the arithmetic of every line live here, and
 * the two renderers only decide how to draw them. Neither can invent a line the
 * other doesn't have.
 *
 * Nothing here emits a QR code. The bill is a record of what was charged, and
 * a code on it cost vertical roll on every ticket that nothing at the counter
 * ever scanned.
 */

export interface BillLine {
  label: string;
  value: string;
  /** The total — drawn larger on paper, double-width on the thermal printer. */
  strong?: boolean;
}

export interface BillItemRow {
  index: number;
  name: string;
  qty: number;
  rate: number;
  amount: number;
}

/** 1,234.00 — two decimals, the way a bill line reads. */
export const billAmount = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** `2026-08-05` → `05/08/2026`. Anything unexpected is passed through as-is. */
export function billDate(raw?: string): string {
  if (!raw) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
}

export function billItems(order: Order): BillItemRow[] {
  return (order.items || []).map((item, i) => {
    const qty = Number(item.quantity) || 1;
    const rate = Number(item.price) || 0;
    return {
      index: i + 1,
      name: item.name || 'Item',
      qty,
      rate,
      amount: round2(rate * qty),
    };
  });
}

export interface BillCounts {
  /** Distinct lines — "3 items". */
  lines: number;
  /** Units across those lines — "5 qty". A bill of 3 dishes can be 9 plates. */
  units: number;
}

export function billCounts(order: Order): BillCounts {
  const items = order.items || [];
  return {
    lines: items.length,
    units: items.reduce((n, i) => n + (Number(i.quantity) || 1), 0),
  };
}

/**
 * The identification block — bill number, order id, when, what kind, who.
 *
 * Only rows with something to say are returned, so a counter sale doesn't
 * print an empty "Table" line and a walk-in doesn't print a blank phone.
 */
export function billMetaLines(order: Order, invoiceNo?: string): BillLine[] {
  const rows: BillLine[] = [];

  if (invoiceNo) rows.push({ label: 'Bill No', value: invoiceNo });
  rows.push({ label: 'Order', value: order.id || order.orderId || '-' });

  const date = billDate(order.orderDate);
  const stamp = [date, order.orderTime].filter(Boolean).join('  ');
  if (stamp) rows.push({ label: 'Date', value: stamp });

  rows.push({
    label: 'Type',
    value: (order.orderType || 'takeaway').replace(/-/g, ' ').toUpperCase(),
  });
  if (order.tableNumber) rows.push({ label: 'Table', value: String(order.tableNumber) });

  rows.push({ label: 'Guest', value: order.customerName || 'Walk-in' });

  // "Counter Sale" is the placeholder the POS writes when nobody gave a
  // number; printing it as if it were one is worse than printing nothing.
  const phone = order.customerPhone?.trim();
  if (phone && phone.toLowerCase() !== 'counter sale') {
    rows.push({ label: 'Phone', value: phone });
  }

  return rows;
}

/**
 * The money block, in the order a GST bill is expected to present it.
 *
 * The round-off line is what makes the column add up. `grandTotal` is whole
 * rupees (see computeBillTotals) while the lines above it carry paise, so
 * without this row the bill is arithmetically wrong by up to fifty paise —
 * every single time rounding does anything at all.
 */
export function billSummaryLines(order: Order): BillLine[] {
  const subtotal = Number(order.subtotal) || 0;
  const discount = Number(order.discount) || 0;
  const delivery = Number(order.deliveryCharge) || 0;
  const cgst = Number(order.cgst) || 0;
  const sgst = Number(order.sgst) || 0;
  const grandTotal = Number(order.grandTotal) || subtotal;

  const taxable = round2(subtotal - discount);
  const beforeRounding = round2(taxable + delivery + cgst + sgst);
  const roundOff = round2(grandTotal - beforeRounding);

  const rows: BillLine[] = [{ label: 'Subtotal', value: billAmount(subtotal) }];

  if (discount > 0) {
    rows.push({
      label: order.couponCode ? `Discount (${order.couponCode})` : 'Discount',
      value: `-${billAmount(discount)}`,
    });
    rows.push({ label: 'Taxable Value', value: billAmount(taxable) });
  }
  if (delivery > 0) rows.push({ label: 'Delivery', value: billAmount(delivery) });

  rows.push({ label: 'CGST 2.5%', value: billAmount(cgst) });
  rows.push({ label: 'SGST 2.5%', value: billAmount(sgst) });

  if (Math.abs(roundOff) >= 0.01) {
    rows.push({
      label: 'Round Off',
      value: `${roundOff > 0 ? '+' : '-'}${billAmount(Math.abs(roundOff))}`,
    });
  }

  rows.push({ label: 'TOTAL', value: billAmount(grandTotal), strong: true });

  return rows;
}

export interface BillHeader {
  name: string;
  tagline: string;
  addressLine: string;
  phone: string;
  /** Blank until the real registration numbers are entered; hidden when blank. */
  gstin: string;
  fssai: string;
  website: string;
}

export function billHeader(): BillHeader {
  return {
    name: restaurantInfo.name.toUpperCase(),
    tagline: 'Authentic Telangana & Hyderabadi Cuisine',
    addressLine: restaurantInfo.addressLine,
    phone: restaurantInfo.phoneDisplay,
    gstin: restaurantInfo.gstin,
    fssai: restaurantInfo.fssai,
    website: restaurantInfo.website,
  };
}

/** "Paid by CASH" / "PAID"–"UNPAID", worded the same in both renderers. */
export function billPaymentLine(order: Order): BillLine {
  return {
    label: `Paid by ${(order.paymentMode || 'cash').toUpperCase()}`,
    value: order.paymentStatus === 'paid' ? 'PAID' : 'UNPAID',
  };
}

export const BILL_UNPAID_NOTICE = '** PAYMENT PENDING - COLLECT AT COUNTER **';
export const BILL_THANKS = 'Thank you! Please visit again';
export const BILL_FOOTNOTE = 'This is a computer generated bill';
/** Printed under the header so a bill is identifiable as a tax document. */
export const BILL_TITLE = 'TAX INVOICE';

// ─── A4 invoice extras ────────────────────────────────────────────────────────
//
// Everything below serves the full-page invoice rather than the 80mm till roll.
// A thermal slip is a receipt; an A4 tax invoice is the document a customer
// files for reimbursement or a company claims input credit against, and it is
// expected to carry a GST rate summary and the total spelled out in words.

/**
 * The GST breakdown as its own table: taxable value, rate, and the two halves
 * of the tax.
 *
 * Only one rate is in play — restaurant service is 5%, split 2.5/2.5 — so this
 * is a single row today. It is shaped as a list anyway because that is the
 * shape the document needs, and a second rate (packaged goods at 12%, say)
 * then adds a row rather than a rewrite.
 */
export interface TaxSummaryRow {
  taxableValue: number;
  ratePercent: number;
  cgst: number;
  sgst: number;
  total: number;
}

export function billTaxSummary(order: Order): TaxSummaryRow[] {
  const subtotal = Number(order.subtotal) || 0;
  const discount = Number(order.discount) || 0;
  const cgst = Number(order.cgst) || 0;
  const sgst = Number(order.sgst) || 0;
  const taxable = round2(subtotal - discount);

  if (taxable <= 0 && cgst + sgst <= 0) return [];

  return [
    {
      taxableValue: taxable,
      ratePercent: 5,
      cgst,
      sgst,
      total: round2(cgst + sgst),
    },
  ];
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundreds ? `${ONES[hundreds]} Hundred` : '';
  const tail = rest ? twoDigits(rest) : '';
  return [head, tail].filter(Boolean).join(' ');
}

/**
 * "One Thousand Two Hundred Thirty Four Rupees Only".
 *
 * Indian grouping, not international: after the first three digits the groups
 * are two wide — thousand, lakh, crore. Rendering ₹1,50,000 as "One Hundred
 * Fifty Thousand" is the tell that a bill was built from a Western template,
 * and on a GST invoice the words are what the amount legally reads as.
 */
export function amountInWords(value: number): string {
  const amount = Math.abs(Math.round(Number.isFinite(value) ? value : 0));
  if (amount === 0) return 'Zero Rupees Only';

  const crore = Math.floor(amount / 10_000_000);
  const lakh = Math.floor((amount % 10_000_000) / 100_000);
  const thousand = Math.floor((amount % 100_000) / 1000);
  const rest = amount % 1000;

  const parts = [
    crore && `${threeDigits(crore)} Crore`,
    lakh && `${twoDigits(lakh)} Lakh`,
    thousand && `${twoDigits(thousand)} Thousand`,
    rest && threeDigits(rest),
  ].filter(Boolean);

  const negative = value < 0 ? 'Minus ' : '';
  return `${negative}${parts.join(' ')} Rupees Only`;
}

/** How the payment settled, worded for a document rather than a till slip. */
export function billPaymentMethodLabel(order: Order): string {
  const mode = (order.paymentMode || 'cash').toLowerCase();
  const labels: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    card: 'Card',
    cod: 'Cash on Delivery',
    razorpay: 'Online (Razorpay)',
    online: 'Online',
  };
  return labels[mode] || mode.toUpperCase();
}

export const INVOICE_DECLARATION =
  'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.';
