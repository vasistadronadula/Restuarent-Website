'use client';

import React from 'react';
import {
  BILL_FOOTNOTE, BILL_THANKS, BILL_TITLE, BILL_UNPAID_NOTICE,
  billAmount, billCounts, billHeader, billItems, billMetaLines,
  billPaymentLine, billSummaryLines,
} from '@/lib/billDocument';
import type { Order } from '@/types';

/**
 * ThermalBill — the one 80mm bill used everywhere: the cashier's counter
 * receipt, the auto-print on a new order, and the copy a customer prints from
 * their order history. One component means a bill can't say different things
 * depending on where it was printed from, and every line it prints comes from
 * lib/billDocument, which the Bluetooth printer reads from too.
 *
 * Deliberately plain markup with explicit styles rather than MUI: this is
 * printed, not designed. Monospace, black on white, sized in millimetres.
 *
 * The item table is three columns — QTY, ITEM, AMOUNT — with the unit rate on
 * its own indented line beneath the name. That shape is not arbitrary: 80mm
 * paper has about 72mm of printable width, which at a legible monospace size
 * is roughly 40 characters. A four-column layout with rate in its own column
 * leaves a name column too narrow for "Chicken Dum Biryani (Full)", and the
 * failure mode on a real printer is a squeezed or truncated amount — worse
 * than a bill one line taller.
 *
 * The sheet declares its own width and padding, and the @media print block in
 * globals.css matches them exactly, so the preview on the cashier's screen is
 * the same width as the paper coming out of the printer.
 *
 * No QR code, deliberately. It cost vertical roll on every ticket and nothing
 * at the counter ever scanned it.
 */

const RUPEE = '₹';

export interface ThermalBillProps {
  order: Order;
  invoiceNo?: string;
  /** e.g. "CUSTOMER COPY" — printed under the title when set. */
  copyLabel?: string;
}

const styles: Record<string, React.CSSProperties> = {
  sheet: {
    width: '80mm',
    margin: '0 auto',
    padding: '3mm 4mm 5mm',
    background: '#FFFFFF',
    color: '#000000',
    fontFamily: '"Courier New", Courier, ui-monospace, monospace',
    fontSize: '11px',
    lineHeight: 1.35,
    boxSizing: 'border-box',
    // Thermal output is one colour; anything mid-grey dithers into a smudge.
    WebkitFontSmoothing: 'none',
  },
  center: { textAlign: 'center' },
  shopName: {
    fontSize: '15px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    margin: 0,
    lineHeight: 1.2,
  },
  tagline: { fontSize: '9.5px', margin: '1px 0 0' },
  meta: { fontSize: '10px', margin: '1px 0 0', wordBreak: 'break-word' },
  title: {
    fontSize: '11.5px',
    fontWeight: 900,
    letterSpacing: '2px',
    textAlign: 'center',
    margin: '1px 0',
  },
  copyLabel: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1px',
    textAlign: 'center',
  },
  ruleDashed: { borderTop: '1px dashed #000', margin: '5px 0' },
  ruleSolid: { borderTop: '1px solid #000', margin: '4px 0' },
  ruleDouble: { borderTop: '3px double #000', margin: '4px 0' },

  /** Label left, value right — the meta block and the summary block. */
  row: { display: 'flex', justifyContent: 'space-between', gap: '3mm' },
  rowLabel: { flex: '0 0 auto', whiteSpace: 'nowrap' },
  rowValue: {
    flex: '1 1 auto',
    minWidth: 0,
    textAlign: 'right',
    wordBreak: 'break-word',
    fontWeight: 700,
  },

  /** The item table. Column widths are fixed so every amount lines up. */
  itemGrid: {
    display: 'grid',
    gridTemplateColumns: '7mm 1fr 17mm',
    columnGap: '1.5mm',
    alignItems: 'start',
  },
  colHead: { fontWeight: 800, fontSize: '10px', letterSpacing: '0.3px' },
  qtyCell: { textAlign: 'center', fontWeight: 800, fontVariantNumeric: 'tabular-nums' },
  nameCell: { fontWeight: 700, wordBreak: 'break-word', lineHeight: 1.3 },
  amountCell: {
    textAlign: 'right',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  rateCell: {
    gridColumn: '2 / 4',
    fontSize: '10px',
    paddingLeft: '2mm',
    paddingBottom: '1.2mm',
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '3mm',
    fontSize: '14.5px',
    fontWeight: 900,
    letterSpacing: '0.3px',
  },
  notice: {
    textAlign: 'center',
    fontSize: '10.5px',
    fontWeight: 800,
    margin: '3px 0 0',
  },
  footer: { textAlign: 'center', fontSize: '9.5px', marginTop: '2px', lineHeight: 1.45 },
};

export default function ThermalBill({ order, invoiceNo, copyLabel }: ThermalBillProps) {
  const shop = billHeader();
  const items = billItems(order);
  const meta = billMetaLines(order, invoiceNo);
  const summary = billSummaryLines(order);
  const payment = billPaymentLine(order);
  const counts = billCounts(order);
  const unpaid = order.paymentStatus !== 'paid';

  return (
    <div className="thermal-bill" style={styles.sheet}>
      {/* ── Who is billing ────────────────────────────────────────────── */}
      <div style={styles.center}>
        <div style={styles.shopName}>{shop.name}</div>
        <div style={styles.tagline}>{shop.tagline}</div>
        <div style={styles.meta}>{shop.addressLine}</div>
        <div style={styles.meta}>Ph: {shop.phone}</div>
        {shop.gstin && <div style={styles.meta}>GSTIN: {shop.gstin}</div>}
        {shop.fssai && <div style={styles.meta}>FSSAI: {shop.fssai}</div>}
      </div>

      <div style={styles.ruleSolid} />
      <div style={styles.title}>{BILL_TITLE}</div>
      {copyLabel && <div style={styles.copyLabel}>{copyLabel}</div>}
      <div style={styles.ruleSolid} />

      {/* ── Which bill, whose ─────────────────────────────────────────── */}
      <div>
        {meta.map((line) => (
          <div key={line.label} style={styles.row}>
            <span style={styles.rowLabel}>{line.label}</span>
            <span style={styles.rowValue}>{line.value}</span>
          </div>
        ))}
      </div>

      <div style={styles.ruleDashed} />

      {/* ── What was sold ─────────────────────────────────────────────── */}
      <div style={styles.itemGrid}>
        <span style={{ ...styles.colHead, textAlign: 'center' }}>QTY</span>
        <span style={styles.colHead}>ITEM</span>
        <span style={{ ...styles.colHead, textAlign: 'right' }}>AMOUNT</span>
      </div>
      <div style={styles.ruleSolid} />

      <div style={styles.itemGrid}>
        {items.map((item) => (
          <React.Fragment key={`${item.index}-${item.name}`}>
            <span style={styles.qtyCell}>{item.qty}</span>
            <span style={styles.nameCell}>{item.name}</span>
            <span style={styles.amountCell}>{billAmount(item.amount)}</span>
            {/* The unit rate, so the customer can check the multiplication. */}
            <span style={styles.rateCell}>@ {billAmount(item.rate)}</span>
          </React.Fragment>
        ))}
      </div>

      <div style={styles.ruleSolid} />
      <div style={{ ...styles.row, fontSize: '10px' }}>
        <span style={styles.rowLabel}>
          {counts.lines} item{counts.lines === 1 ? '' : 's'}
        </span>
        <span style={{ ...styles.rowValue, fontWeight: 400 }}>
          Total qty: {counts.units}
        </span>
      </div>
      <div style={styles.ruleDashed} />

      {/* ── What it comes to ──────────────────────────────────────────── */}
      {summary.map((line) =>
        line.strong ? (
          <React.Fragment key={line.label}>
            <div style={styles.ruleDouble} />
            <div style={styles.totalRow}>
              <span>{line.label}</span>
              <span>
                {RUPEE}
                {line.value}
              </span>
            </div>
            <div style={styles.ruleDouble} />
          </React.Fragment>
        ) : (
          <div key={line.label} style={styles.row}>
            <span style={styles.rowLabel}>{line.label}</span>
            <span style={styles.rowValue}>{line.value}</span>
          </div>
        ),
      )}

      {/* ── How it was settled ────────────────────────────────────────── */}
      <div style={styles.row}>
        <span style={styles.rowLabel}>{payment.label}</span>
        <span style={{ ...styles.rowValue, fontWeight: 900 }}>{payment.value}</span>
      </div>
      {unpaid && <div style={styles.notice}>{BILL_UNPAID_NOTICE}</div>}

      <div style={styles.ruleDashed} />

      <div style={styles.footer}>
        <div style={{ fontWeight: 900, fontSize: '11px' }}>{BILL_THANKS}</div>
        <div>{shop.website}</div>
        <div style={{ marginTop: '2px' }}>{BILL_FOOTNOTE}</div>
      </div>
    </div>
  );
}
