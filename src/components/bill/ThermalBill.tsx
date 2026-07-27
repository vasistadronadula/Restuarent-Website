'use client';

import React from 'react';
import { restaurantInfo } from '@/data/restaurantInfo';
import type { Order } from '@/types';

/**
 * ThermalBill — the one 80mm bill used everywhere: the cashier's counter
 * receipt, the auto-print on a new order, and the copy a customer prints
 * from their order history. One component means a bill can't say different
 * things depending on where it was printed from.
 *
 * Deliberately plain markup with explicit styles rather than MUI: this is
 * printed, not designed. Everything is monospace, black on white, sized in
 * millimetres, and every row is width-constrained so nothing can spill past
 * the edge of the paper. Long dish names wrap onto their own lines instead
 * of squeezing the amount column — the failure mode on a real printer is a
 * truncated total, which is worse than a taller bill.
 *
 * No QR code: it cost vertical roll on every ticket and nothing at the
 * counter scanned it.
 */

const RUPEE = '₹';

const money = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface ThermalBillProps {
  order: Order;
  invoiceNo?: string;
  /** e.g. "CUSTOMER COPY" — printed under the header when set. */
  copyLabel?: string;
}

const styles: Record<string, React.CSSProperties> = {
  sheet: {
    width: '72mm',
    margin: '0 auto',
    padding: '2mm 0 4mm',
    background: '#FFFFFF',
    color: '#000000',
    fontFamily: '"Courier New", Courier, ui-monospace, monospace',
    fontSize: '11.5px',
    lineHeight: 1.35,
    boxSizing: 'border-box',
  },
  center: { textAlign: 'center' },
  shopName: { fontSize: '16px', fontWeight: 900, letterSpacing: '0.5px', margin: 0 },
  tagline: { fontSize: '10px', margin: '1px 0 0' },
  meta: { fontSize: '10.5px', margin: '1px 0 0', wordBreak: 'break-word' },
  rule: { borderTop: '1px dashed #000', margin: '6px 0' },
  ruleSolid: { borderTop: '1px solid #000', margin: '4px 0' },
  row: { display: 'flex', justifyContent: 'space-between', gap: '6px' },
  rowLabel: { flex: '1 1 auto', minWidth: 0, wordBreak: 'break-word' },
  rowValue: { flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' },
  itemName: { fontWeight: 700, wordBreak: 'break-word' },
  itemMathRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '6px',
    paddingLeft: '4mm',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 900,
  },
  footer: { textAlign: 'center', fontSize: '10px', marginTop: '4px' },
};

export default function ThermalBill({ order, invoiceNo, copyLabel }: ThermalBillProps) {
  const items = order.items || [];
  const subtotal = order.subtotal || 0;
  const discount = order.discount || 0;
  const cgst = order.cgst || 0;
  const sgst = order.sgst || 0;
  const grandTotal = order.grandTotal || subtotal;

  // The POS rounds the payable amount to whole rupees; showing the rounding
  // as its own line is what makes the arithmetic on the bill add up, and is
  // what a GST bill is expected to do.
  const roundOff = Number((grandTotal - (subtotal - discount + cgst + sgst)).toFixed(2));

  const orderTypeLabel = (order.orderType || 'takeaway').replace('-', ' ').toUpperCase();

  return (
    <div className="thermal-bill" style={styles.sheet}>
      <div style={styles.center}>
        <div style={styles.shopName}>{restaurantInfo.name.toUpperCase()}</div>
        <div style={styles.tagline}>Authentic Telangana &amp; Hyderabadi Cuisine</div>
        <div style={styles.meta}>{restaurantInfo.addressLine}</div>
        <div style={styles.meta}>Ph: {restaurantInfo.phoneDisplay}</div>
        {restaurantInfo.gstin && <div style={styles.meta}>GSTIN: {restaurantInfo.gstin}</div>}
        {restaurantInfo.fssai && <div style={styles.meta}>FSSAI: {restaurantInfo.fssai}</div>}
        {copyLabel && (
          <div style={{ ...styles.meta, fontWeight: 800, marginTop: '3px' }}>{copyLabel}</div>
        )}
      </div>

      <div style={styles.rule} />

      <div>
        {invoiceNo && (
          <div style={styles.row}>
            <span style={styles.rowLabel}>Bill No</span>
            <span style={styles.rowValue}>{invoiceNo}</span>
          </div>
        )}
        <div style={styles.row}>
          <span style={styles.rowLabel}>Order</span>
          <span style={styles.rowValue}>{order.id}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.rowLabel}>Date</span>
          <span style={styles.rowValue}>
            {order.orderDate} {order.orderTime}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.rowLabel}>Type</span>
          <span style={styles.rowValue}>
            {orderTypeLabel}
            {order.tableNumber ? ` · TABLE ${order.tableNumber}` : ''}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.rowLabel}>Customer</span>
          <span style={styles.rowValue}>{order.customerName || 'Walk-in'}</span>
        </div>
        {order.customerPhone && order.customerPhone !== 'Counter Sale' && (
          <div style={styles.row}>
            <span style={styles.rowLabel}>Phone</span>
            <span style={styles.rowValue}>{order.customerPhone}</span>
          </div>
        )}
      </div>

      <div style={styles.rule} />

      <div style={{ ...styles.row, fontWeight: 800 }}>
        <span style={styles.rowLabel}>ITEM</span>
        <span style={styles.rowValue}>AMOUNT</span>
      </div>
      <div style={styles.ruleSolid} />

      {items.map((item, idx) => {
        const qty = item.quantity || 1;
        const rate = item.price || 0;
        return (
          <div key={`${item.name}-${idx}`} style={{ marginBottom: '3px' }}>
            <div style={styles.itemName}>
              {idx + 1}. {item.name}
            </div>
            <div style={styles.itemMathRow}>
              <span>
                {qty} x {money(rate)}
              </span>
              <span style={styles.rowValue}>{money(rate * qty)}</span>
            </div>
          </div>
        );
      })}

      <div style={styles.rule} />

      <div style={styles.row}>
        <span style={styles.rowLabel}>Subtotal</span>
        <span style={styles.rowValue}>{money(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div style={styles.row}>
          <span style={styles.rowLabel}>
            Discount{order.couponCode ? ` (${order.couponCode})` : ''}
          </span>
          <span style={styles.rowValue}>-{money(discount)}</span>
        </div>
      )}
      <div style={styles.row}>
        <span style={styles.rowLabel}>CGST 2.5%</span>
        <span style={styles.rowValue}>{money(cgst)}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.rowLabel}>SGST 2.5%</span>
        <span style={styles.rowValue}>{money(sgst)}</span>
      </div>

      <div style={styles.ruleSolid} />
      <div style={styles.totalRow}>
        <span>TOTAL</span>
        <span>
          {RUPEE}
          {money(grandTotal)}
        </span>
      </div>
      <div style={styles.ruleSolid} />

      <div style={styles.row}>
        <span style={styles.rowLabel}>Paid by {(order.paymentMode || 'cash').toUpperCase()}</span>
        <span style={{ ...styles.rowValue, fontWeight: 800 }}>
          {order.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
        </span>
      </div>
      {order.paymentStatus !== 'paid' && (
        <div style={{ ...styles.meta, fontWeight: 800, marginTop: '2px' }}>
          ** PAYMENT PENDING — COLLECT AT COUNTER **
        </div>
      )}

      <div style={styles.rule} />

      <div style={styles.footer}>
        <div style={{ fontWeight: 800, fontSize: '11.5px' }}>Thank you! Visit again</div>
        <div>{restaurantInfo.website}</div>
        <div style={{ marginTop: '2px' }}>This is a computer generated bill</div>
      </div>
    </div>
  );
}
