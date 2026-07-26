'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { Order } from '@/types';
import ThermalReceiptModal from './ThermalReceiptModal';

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
  const seenOrdersRef = useRef<Set<string>>(new Set());
  const hasSeededRef = useRef<boolean>(false);

  const [activeAutoOrder, setActiveAutoOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
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

      if (isAutoPrintEnabled) {
        // Play notification audio alert
        playOrderAlertChime();

        // Trigger Auto-Print Receipt Modal
        setActiveAutoOrder(newOrder);
        setModalOpen(true);

        // Auto trigger print dialog after 400ms delay for modal animation
        setTimeout(() => {
          window.print();
        }, 400);
      }
    }
  }, [orders, isLoadingDB]);

  return (
    <ThermalReceiptModal
      order={activeAutoOrder}
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      isAutoPrinted={true}
    />
  );
}
