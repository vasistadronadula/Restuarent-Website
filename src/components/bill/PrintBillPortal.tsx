'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ThermalBill, { type ThermalBillProps } from './ThermalBill';

const PRINT_ROOT_ID = 'ppr-print-root';

/**
 * Renders the bill into a container mounted directly on <body>, hidden on
 * screen and revealed only while printing (see the @media print block in
 * globals.css, which hides every other body child).
 *
 * Printing the bill *in place* — inside a dialog — is what produced the
 * clipped, A4-shaped output before: the receipt sat inside a scrolling,
 * transformed, fixed-height modal, and the print stylesheet had to fight
 * all of that with `position: fixed` and `overflow: hidden`, which cut off
 * any bill longer than one page. Out here it's a plain block in normal
 * flow, so an 80mm roll simply grows as long as the order needs.
 */
export default function PrintBillPortal(props: ThermalBillProps) {
  // Created during render (detached is fine — React can portal into a node
  // that isn't in the document yet) and attached in the effect below. Doing
  // it this way means no state round-trip, so the bill is in the DOM on the
  // first commit rather than a render later — which matters when print() is
  // called immediately after mounting this.
  const [host] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const existing = document.getElementById(PRINT_ROOT_ID);
    if (existing) return existing;
    const node = document.createElement('div');
    node.id = PRINT_ROOT_ID;
    return node;
  });

  useEffect(() => {
    if (!host) return;
    if (!host.isConnected) document.body.appendChild(host);

    return () => {
      if (host) {
        host.innerHTML = '';
        if (host.isConnected && host.childElementCount === 0) {
          host.remove();
        }
      }
    };
  }, [host]);

  if (!host) return null;
  // Ensure host container is cleared before portaling so no duplicate bills stack
  if (typeof window !== 'undefined') {
    const existing = document.getElementById(PRINT_ROOT_ID);
    if (existing && existing !== host) {
      existing.innerHTML = '';
    }
  }
  return createPortal(<ThermalBill {...props} />, host);
}
