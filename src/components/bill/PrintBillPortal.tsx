'use client';

import React from 'react';
import { createPortal } from 'react-dom';

import ThermalBill from './ThermalBill';
import InvoiceA4 from './InvoiceA4';
import type { Order } from '@/types';

const PRINT_ROOT_ID = 'ppr-print-root';

/** Which of the two bill documents to send to the printer. */
export type BillFormat = 'thermal' | 'a4';

export interface PrintBillPortalProps {
  order: Order;
  invoiceNo?: string;
  copyLabel?: string;
  /**
   * `thermal` is the 80mm till roll and stays the default — the counter and
   * the auto-printer both depend on it. `a4` is the full-page tax invoice a
   * customer saves as a PDF.
   */
  format?: BillFormat;
}

/**
 * Renders the bill into a container mounted directly on <body>, hidden on
 * screen and revealed only while printing (see the @media print block in
 * globals.css).
 *
 * Why body level: the print stylesheet hides `body > *:not(#ppr-print-root)`.
 * A bill left inside the React tree would be inside a hidden ancestor and
 * print blank, and dragging it out of a dialog's stacking context is the only
 * reliable way to get a clean page rather than a screenshot of the app around
 * it.
 *
 * The host node is found (or created) by a plain function rather than being
 * put in state and assigned from an effect. The effect version needed a second
 * render before the portal existed, which is a real hazard here and not a
 * stylistic one: PrintBillButton calls `window.print()` on the next animation
 * frame, and a bill that is still one render away at that moment prints an
 * empty page.
 *
 * The chosen format is written onto the host as `data-format` so the print
 * stylesheet can size the page for it — an 80mm roll and an A4 sheet need
 * different `@page` widths, and printing one at the other's size is what
 * turned the invoice into a narrow column up the side of a blank page.
 */
function printHost(format: BillFormat): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  const existing = document.getElementById(PRINT_ROOT_ID);
  const node = existing ?? document.createElement('div');
  if (!existing) {
    node.id = PRINT_ROOT_ID;
    document.body.appendChild(node);
  }
  node.dataset.format = format;
  return node;
}

export default function PrintBillPortal({
  order, invoiceNo, copyLabel, format = 'thermal',
}: PrintBillPortalProps) {
  const host = printHost(format);
  if (!host) return null;

  return createPortal(
    format === 'a4' ? (
      <InvoiceA4 order={order} invoiceNo={invoiceNo} copyLabel={copyLabel} />
    ) : (
      <ThermalBill order={order} invoiceNo={invoiceNo} copyLabel={copyLabel} />
    ),
    host
  );
}
