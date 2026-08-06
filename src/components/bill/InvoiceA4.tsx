'use client';

import React from 'react';

import {
  BILL_THANKS, INVOICE_DECLARATION,
  amountInWords, billAmount, billCounts, billDate, billHeader, billItems,
  billPaymentMethodLabel, billSummaryLines, billTaxSummary,
} from '@/lib/billDocument';
import { restaurantInfo } from '@/data/restaurantInfo';
import type { Order } from '@/types';

/**
 * InvoiceA4 — the full-page tax invoice, for when the bill is a document
 * rather than a till slip.
 *
 * There are two audiences and they want different objects. The cashier wants
 * an 80mm roll that tears off in three seconds: that is ThermalBill, and it
 * stays exactly as it is. A customer saving a bill as PDF from their order
 * history wants what any restaurant emails them — a page with the restaurant's
 * details at the top, a proper ruled item table, the GST split shown as its
 * own summary, the total written out in words, and somewhere to file it. That
 * is this. Printing the 80mm receipt onto A4 produced a narrow ribbon of text
 * up the left edge of an otherwise blank page, which is what "the bill PDF is
 * broken" actually meant.
 *
 * Both read every number and label from lib/billDocument, so the two can
 * disagree about layout but never about arithmetic or wording — the same
 * guarantee that already binds ThermalBill and the ESC/POS printer.
 *
 * Styling is inline and explicit rather than Tailwind. This subtree is lifted
 * out to a body-level portal for printing, where utility classes carrying
 * theme tokens resolve against whatever the app's dark mode left behind; fixed
 * hex values and millimetre sizes print the same from either theme.
 */

const INK = '#111111';
const RULE = '#D4D4D4';
const RULE_STRONG = '#9A9A9A';
const WASH = '#F5F5F4';
const BRAND = '#B45309';

const styles: Record<string, React.CSSProperties> = {
  sheet: {
    width: '210mm',
    minHeight: '297mm',
    margin: '0 auto',
    padding: '12mm 12mm 10mm',
    background: '#FFFFFF',
    color: INK,
    fontFamily: '"Helvetica Neue", Arial, "Segoe UI", sans-serif',
    fontSize: '10.5px',
    lineHeight: 1.45,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },

  // ── Masthead ──────────────────────────────────────────────────────────────
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8mm',
    paddingBottom: '4mm',
    borderBottom: `2px solid ${BRAND}`,
  },
  shopName: {
    fontSize: '21px',
    fontWeight: 800,
    letterSpacing: '-0.2px',
    color: BRAND,
    margin: 0,
    lineHeight: 1.15,
  },
  tagline: { fontSize: '10px', color: '#57534E', margin: '1mm 0 2mm' },
  shopMeta: { fontSize: '9.5px', color: '#57534E', margin: 0 },
  invoiceBadge: { textAlign: 'right', flexShrink: 0 },
  invoiceWord: {
    fontSize: '17px',
    fontWeight: 800,
    letterSpacing: '2.5px',
    margin: 0,
    lineHeight: 1.1,
  },
  invoiceNo: { fontSize: '11px', fontWeight: 700, marginTop: '1.5mm' },
  invoiceDate: { fontSize: '9.5px', color: '#57534E' },

  // ── Party panels ──────────────────────────────────────────────────────────
  panels: { display: 'flex', gap: '4mm', margin: '5mm 0 4mm' },
  panel: {
    flex: 1,
    border: `1px solid ${RULE}`,
    borderRadius: '2mm',
    padding: '3mm 3.5mm',
    minWidth: 0,
  },
  panelHead: {
    fontSize: '8.5px',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: '#78716C',
    marginBottom: '1.5mm',
  },
  panelName: { fontSize: '12px', fontWeight: 700, wordBreak: 'break-word' },
  panelLine: { fontSize: '9.5px', color: '#44403C', wordBreak: 'break-word' },
  kvRow: { display: 'flex', justifyContent: 'space-between', gap: '3mm', fontSize: '9.5px' },
  kvKey: { color: '#78716C' },
  kvVal: { fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' },

  // ── Item table ────────────────────────────────────────────────────────────
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    // Fixed layout so a long dish name wraps inside its cell instead of
    // stealing width from the numeric columns and pushing them off the page.
    tableLayout: 'fixed',
  },
  th: {
    background: WASH,
    borderTop: `1px solid ${RULE_STRONG}`,
    borderBottom: `1px solid ${RULE_STRONG}`,
    padding: '2.2mm 2.5mm',
    fontSize: '8.5px',
    fontWeight: 800,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    color: '#44403C',
  },
  td: {
    borderBottom: `1px solid ${RULE}`,
    padding: '2.4mm 2.5mm',
    fontSize: '10px',
    verticalAlign: 'top',
    wordBreak: 'break-word',
  },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  mid: { textAlign: 'center', fontVariantNumeric: 'tabular-nums' },

  // ── Totals ────────────────────────────────────────────────────────────────
  lower: { display: 'flex', gap: '4mm', marginTop: '4mm', alignItems: 'flex-start' },
  totalsBox: { width: '78mm', flexShrink: 0, marginLeft: 'auto' },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '3mm',
    padding: '1.4mm 0',
    fontSize: '10px',
  },
  grandRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '3mm',
    padding: '2.6mm 3mm',
    marginTop: '1.5mm',
    background: BRAND,
    color: '#FFFFFF',
    borderRadius: '1.5mm',
    fontSize: '13px',
    fontWeight: 800,
  },
  words: {
    marginTop: '3mm',
    padding: '2.5mm 3mm',
    background: WASH,
    borderRadius: '1.5mm',
    fontSize: '9.5px',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    marginTop: 'auto',
    paddingTop: '5mm',
    borderTop: `1px solid ${RULE}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '8mm',
  },
  signBox: {
    width: '55mm',
    textAlign: 'center',
    fontSize: '9px',
    color: '#57534E',
    flexShrink: 0,
  },
  signLine: { borderTop: `1px solid ${RULE_STRONG}`, marginTop: '12mm', paddingTop: '1.5mm' },
  thanks: { fontSize: '11px', fontWeight: 700, color: BRAND },
  fine: { fontSize: '8.5px', color: '#78716C', marginTop: '1mm' },
};

export interface InvoiceA4Props {
  order: Order;
  invoiceNo?: string;
  /** e.g. "DUPLICATE" — stamped beside the invoice number when set. */
  copyLabel?: string;
}

export default function InvoiceA4({ order, invoiceNo, copyLabel }: InvoiceA4Props) {
  const shop = billHeader();
  const items = billItems(order);
  const summary = billSummaryLines(order);
  const taxRows = billTaxSummary(order);
  const counts = billCounts(order);
  const paid = order.paymentStatus === 'paid';

  const grand = summary.find((l) => l.strong);
  const lines = summary.filter((l) => !l.strong);

  const phone = order.customerPhone?.trim();
  const showPhone = phone && phone.toLowerCase() !== 'counter sale';
  const address = order.customerAddress?.trim();
  const orderType = (order.orderType || 'takeaway').replace(/-/g, ' ');

  return (
    <div className="invoice-a4" style={styles.sheet}>
      {/* ── Who is billing, and what this is ───────────────────────────── */}
      <header style={styles.head}>
        <div style={{ minWidth: 0 }}>
          <h1 style={styles.shopName}>{shop.name}</h1>
          <p style={styles.tagline}>{shop.tagline}</p>
          <p style={styles.shopMeta}>{shop.addressLine}</p>
          <p style={styles.shopMeta}>
            Ph: {shop.phone} · {restaurantInfo.email}
          </p>
          {/* Hidden while blank rather than printed as an empty label — a bill
              showing "GSTIN:" with nothing after it reads as a missing number
              rather than a business that has not registered one. */}
          {shop.gstin && (
            <p style={styles.shopMeta}>
              <strong>GSTIN:</strong> {shop.gstin}
            </p>
          )}
          {shop.fssai && (
            <p style={styles.shopMeta}>
              <strong>FSSAI:</strong> {shop.fssai}
            </p>
          )}
        </div>

        <div style={styles.invoiceBadge}>
          <p style={styles.invoiceWord}>TAX INVOICE</p>
          {copyLabel && (
            <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '1.5px', color: '#78716C' }}>
              {copyLabel}
            </div>
          )}
          <div style={styles.invoiceNo}>{invoiceNo || order.id || order.orderId}</div>
          <div style={styles.invoiceDate}>
            {billDate(order.orderDate)}
            {order.orderTime ? ` · ${order.orderTime}` : ''}
          </div>
          <div
            style={{
              display: 'inline-block',
              marginTop: '2mm',
              padding: '1mm 2.5mm',
              borderRadius: '1mm',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              color: '#FFFFFF',
              background: paid ? '#15803D' : '#B91C1C',
            }}
          >
            {paid ? 'PAID' : 'PAYMENT DUE'}
          </div>
        </div>
      </header>

      {/* ── Who it is for, and which order ─────────────────────────────── */}
      <section style={styles.panels}>
        <div style={styles.panel}>
          <div style={styles.panelHead}>Billed To</div>
          <div style={styles.panelName}>{order.customerName || 'Walk-in Guest'}</div>
          {showPhone && <div style={styles.panelLine}>{phone}</div>}
          {address && <div style={styles.panelLine}>{address}</div>}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHead}>Order Details</div>
          <div style={styles.kvRow}>
            <span style={styles.kvKey}>Order No</span>
            <span style={styles.kvVal}>{order.id || order.orderId || '—'}</span>
          </div>
          <div style={styles.kvRow}>
            <span style={styles.kvKey}>Service</span>
            <span style={{ ...styles.kvVal, textTransform: 'capitalize' }}>{orderType}</span>
          </div>
          {order.tableNumber ? (
            <div style={styles.kvRow}>
              <span style={styles.kvKey}>Table</span>
              <span style={styles.kvVal}>{order.tableNumber}</span>
            </div>
          ) : null}
          <div style={styles.kvRow}>
            <span style={styles.kvKey}>Payment</span>
            <span style={styles.kvVal}>{billPaymentMethodLabel(order)}</span>
          </div>
        </div>
      </section>

      {/* ── What was sold ──────────────────────────────────────────────── */}
      <table style={styles.table}>
        <colgroup>
          <col style={{ width: '10mm' }} />
          <col />
          <col style={{ width: '18mm' }} />
          <col style={{ width: '26mm' }} />
          <col style={{ width: '30mm' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...styles.th, textAlign: 'center' }}>#</th>
            <th style={{ ...styles.th, textAlign: 'left' }}>Item Description</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>Qty</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Rate (₹)</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.index}-${item.name}`}>
              <td style={{ ...styles.td, ...styles.mid, color: '#78716C' }}>{item.index}</td>
              <td style={{ ...styles.td, fontWeight: 600 }}>{item.name}</td>
              <td style={{ ...styles.td, ...styles.mid, fontWeight: 700 }}>{item.qty}</td>
              <td style={{ ...styles.td, ...styles.num }}>{billAmount(item.rate)}</td>
              <td style={{ ...styles.td, ...styles.num, fontWeight: 700 }}>
                {billAmount(item.amount)}
              </td>
            </tr>
          ))}
          <tr>
            <td
              colSpan={2}
              style={{
                ...styles.td,
                borderBottom: `1px solid ${RULE_STRONG}`,
                fontSize: '9px',
                color: '#78716C',
              }}
            >
              {counts.lines} item{counts.lines === 1 ? '' : 's'}
            </td>
            <td
              style={{
                ...styles.td,
                ...styles.mid,
                borderBottom: `1px solid ${RULE_STRONG}`,
                fontWeight: 800,
              }}
            >
              {counts.units}
            </td>
            <td colSpan={2} style={{ ...styles.td, borderBottom: `1px solid ${RULE_STRONG}` }} />
          </tr>
        </tbody>
      </table>

      {/* ── Tax summary + totals ───────────────────────────────────────── */}
      <div style={styles.lower}>
        {taxRows.length > 0 && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...styles.panelHead, marginTop: '1mm' }}>Tax Summary</div>
            <table style={{ ...styles.table, tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Taxable ₹</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Rate</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>CGST ₹</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>SGST ₹</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Tax ₹</th>
                </tr>
              </thead>
              <tbody>
                {taxRows.map((row) => (
                  <tr key={row.ratePercent}>
                    <td style={{ ...styles.td, ...styles.num }}>{billAmount(row.taxableValue)}</td>
                    <td style={{ ...styles.td, ...styles.mid }}>{row.ratePercent}%</td>
                    <td style={{ ...styles.td, ...styles.num }}>{billAmount(row.cgst)}</td>
                    <td style={{ ...styles.td, ...styles.num }}>{billAmount(row.sgst)}</td>
                    <td style={{ ...styles.td, ...styles.num, fontWeight: 700 }}>
                      {billAmount(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={styles.totalsBox}>
          {lines.map((line) => (
            <div key={line.label} style={styles.totalRow}>
              <span style={{ color: '#57534E' }}>{line.label}</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {line.value}
              </span>
            </div>
          ))}

          {grand && (
            <div style={styles.grandRow}>
              <span>{grand.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>₹{grand.value}</span>
            </div>
          )}

          {!paid && (
            <div
              style={{
                marginTop: '2mm',
                padding: '2mm 3mm',
                border: '1px solid #B91C1C',
                borderRadius: '1.5mm',
                color: '#B91C1C',
                fontSize: '9.5px',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              Payment pending — please settle at the counter
            </div>
          )}
        </div>
      </div>

      {/* The legal reading of the amount. */}
      <div style={styles.words}>
        <span style={{ color: '#78716C', fontWeight: 700 }}>Amount in words: </span>
        <span style={{ fontWeight: 700 }}>
          {amountInWords(Number(order.grandTotal) || 0)}
        </span>
      </div>

      <footer style={styles.footer}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.thanks}>{BILL_THANKS}</div>
          <div style={styles.fine}>{shop.website}</div>
          <div style={{ ...styles.fine, maxWidth: '105mm' }}>{INVOICE_DECLARATION}</div>
        </div>

        <div style={styles.signBox}>
          <div style={styles.signLine}>Authorised Signatory</div>
          <div style={{ marginTop: '1mm', fontWeight: 700 }}>For {shop.name}</div>
        </div>
      </footer>
    </div>
  );
}
