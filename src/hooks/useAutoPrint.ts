'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * useAutoPrint — the cashier's "print every new order automatically" switch.
 *
 * AdminHeader and the printer settings panel each show this toggle. Before
 * this hook, each read/wrote the 'pala_pitta_auto_print' localStorage key
 * into its own useState, so flipping it in one place left the other showing
 * the stale value until a full page reload — a small but very visible
 * inconsistency for a control a cashier checks mid-shift. Both now share one
 * hook and re-sync on a custom event fired the moment either one writes.
 */

const KEY = 'pala_pitta_auto_print';
const CHANGE_EVENT = 'ppr-auto-print-changed';

function readAutoPrint(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(KEY);
  return saved === null ? true : saved !== 'false';
}

export function useAutoPrint(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState(readAutoPrint);

  useEffect(() => {
    const sync = () => setEnabled(readAutoPrint());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setAutoPrint = useCallback((next: boolean) => {
    localStorage.setItem(KEY, String(next));
    setEnabled(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [enabled, setAutoPrint];
}
