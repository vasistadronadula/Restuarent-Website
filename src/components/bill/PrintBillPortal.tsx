'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ThermalBill, { type ThermalBillProps } from './ThermalBill';

const PRINT_ROOT_ID = 'ppr-print-root';

/**
 * Renders the bill into a container mounted directly on <body>, hidden on
 * screen and revealed only while printing (see the @media print block in
 * globals.css, which hides every other body child).
 *
 * Guards against React strict-mode double-mounts and stale DOM nodes by:
 *  1. Clearing innerHTML of any existing host before portal mount
 *  2. Using a mount ref to prevent duplicate appends
 *  3. Cleaning up properly on unmount
 */
export default function PrintBillPortal(props: ThermalBillProps) {
  const mountedRef = useRef(false);

  const [host] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;

    // Always clear any leftover host to prevent stale bill duplicates
    const existing = document.getElementById(PRINT_ROOT_ID);
    if (existing) {
      existing.innerHTML = '';
      return existing;
    }

    const node = document.createElement('div');
    node.id = PRINT_ROOT_ID;
    return node;
  });

  useEffect(() => {
    if (!host || mountedRef.current) return;
    mountedRef.current = true;

    // Clear any stale content before mounting
    host.innerHTML = '';

    if (!host.isConnected) {
      document.body.appendChild(host);
    }

    return () => {
      mountedRef.current = false;
      if (host) {
        host.innerHTML = '';
        if (host.isConnected) {
          host.remove();
        }
      }
    };
  }, [host]);

  if (!host) return null;
  return createPortal(<ThermalBill {...props} />, host);
}
