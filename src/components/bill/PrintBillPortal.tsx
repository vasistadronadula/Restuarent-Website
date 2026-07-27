'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ThermalBill, { type ThermalBillProps } from './ThermalBill';

const PRINT_ROOT_ID = 'ppr-print-root';

/**
 * Renders the bill into a container mounted directly on <body>, hidden on
 * screen and revealed only while printing (see the @media print block in
 * globals.css).
 *
 * Uses a safe portal host container managed without manual DOM mutation
 * in unmount cleanup to avoid React child node unmount crashes.
 */
export default function PrintBillPortal(props: ThermalBillProps) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let node = document.getElementById(PRINT_ROOT_ID);
    if (!node) {
      node = document.createElement('div');
      node.id = PRINT_ROOT_ID;
      document.body.appendChild(node);
    }
    setHost(node);
  }, []);

  if (!host) return null;
  return createPortal(<ThermalBill {...props} />, host);
}
