'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { Order } from '@/types';
import ThermalReceiptModal from './ThermalReceiptModal';
import { isPrinterConnected, printOrder, reconnectSavedPrinter } from '@/lib/thermalPrinter';
import { toast } from 'sonner';

// Audio chime generator using browser Web Audio API (zero external files required)
const playOrderAlertChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.15); // A5

    osc2.frequency.setValueAtTime(293.66, now); // D4
    osc2.frequency.setValueAtTime(440, now + 0.15); // A4

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('Audio chime playback omitted:', err);
  }
};

export default function AutoOrderPrinter() {
  const { orders, isLoadingDB } = useAdmin();
  const { userRole } = useAuth();
  const seenOrdersRef = useRef<Set<string>>(new Set());
  const hasSeededRef = useRef<boolean>(false);

  const [activeAutoOrder, setActiveAutoOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Auto-print is restricted to cashier role only
  const isCashier = userRole === 'cashier';

  // Re-attach the printer paired on this device on a previous shift. Chrome
  // remembers the grant, so this needs no picker and no user gesture — the
  // cashier opens the app and printing just works. A failure here is silent
  // by design: it only means the next ticket falls back to the dialog.
  useEffect(() => {
    if (!isCashier) return;
    void reconnectSavedPrinter();
  }, [isCashier]);

  useEffect(() => {
    // Only cashiers get auto-print functionality
    if (!isCashier) return;

    // Wait for the initial orders fetch to actually finish before touching
    // anything. Previously this seeded the "already seen" set on the very
    // first effect run, but that run happened while `orders` was still the
    // empty placeholder array (before RTK Query's fetch resolved) — so the
    // seed was empty, and the moment real data arrived a render later, every
    // historical order looked brand new. On every page refresh the most
    // recent order would silently look "new" and get auto-printed again.
    if (isLoadingDB) return;

    // Check local storage setting for auto-print enabled (default true)
    const autoPrintSetting = localStorage.getItem('pala_pitta_auto_print');
    const isAutoPrintEnabled = autoPrintSetting !== 'false';

    if (!hasSeededRef.current) {
      // Seed with whatever the initial fetch actually returned — this is the
      // true starting snapshot, empty or not.
      orders.forEach((o) => seenOrdersRef.current.add(o.id));
      hasSeededRef.current = true;
      return;
    }

    // Find any brand new incoming order
    const newOrder = orders.find((o) => !seenOrdersRef.current.has(o.id));

    if (newOrder) {
      seenOrdersRef.current.add(newOrder.id);

      // If this order was placed right here by the POS page on this device,
      // OrderPlacedDialog is already handling the print/receipt confirmation.
      // Do not trigger a second print modal/window.print call!
      const posSeen = typeof window !== 'undefined' && (window as unknown as { __ppr_seen_pos_orders?: Set<string> }).__ppr_seen_pos_orders?.has(newOrder.id);
      if (posSeen) return;

      if (isAutoPrintEnabled) {
        // Play notification audio alert
        playOrderAlertChime();

        // A paired Bluetooth printer prints the ticket outright — no dialog,
        // no modal, nothing for the cashier to confirm mid-rush. Only when
        // there's no printer (or the write fails) does the on-screen receipt
        // and the browser print dialog take over, so an order can never be
        // silently dropped.
        void (async () => {
          if (isPrinterConnected() && (await printOrder(newOrder))) {
            toast.success(`🧾 Printed order ${newOrder.id}`, { id: `print-${newOrder.id}` });
            return;
          }

          setActiveAutoOrder(newOrder);
          setModalOpen(true);
          setTimeout(() => {
            window.print();
          }, 400);
        })();
      }
    }
  }, [orders, isLoadingDB, isCashier]);

  // Don't render the modal at all for non-cashier roles
  if (!isCashier) return null;

  return (
    <ThermalReceiptModal
      order={activeAutoOrder}
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      isAutoPrinted={true}
    />
  );
}
