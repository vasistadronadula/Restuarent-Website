'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, CookingPot, Flame, ShoppingBag, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';

/* ------------------------------------------------------------------ */
/*  Stage definitions                                                   */
/* ------------------------------------------------------------------ */

/**
 * The four states an order passes through, in order.
 *
 * They deliberately share one colour scheme instead of getting a hue each.
 * The old tracker gave every stage its own — emerald, amber, sky, violet — and
 * the result was that a glance told you nothing: four bright circles look the
 * same whichever one you are on. Here the *position* carries the meaning, and
 * colour only separates three states: done (green), happening now (orange),
 * not yet (grey).
 */
export const ORDER_STAGES = [
  {
    key: 'pending',
    label: 'Order confirmed',
    shortTitle: 'Confirmed',
    desc: 'The kitchen has your ticket',
    icon: CheckCircle2,
  },
  {
    key: 'preparing',
    label: 'Cooking now',
    shortTitle: 'Cooking',
    desc: 'Your dishes are on the stove',
    icon: Flame,
  },
  {
    key: 'ready',
    label: 'Ready for pickup',
    shortTitle: 'Ready',
    desc: 'Packed and waiting at the counter',
    icon: CookingPot,
  },
  {
    key: 'delivered',
    label: 'Collected',
    shortTitle: 'Done',
    desc: 'Thanks for eating with us',
    icon: ShoppingBag,
  },
] as const;

export function getStageIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':   return 0;
    case 'preparing': return 1;
    case 'ready':     return 2;
    case 'delivered': return 3;
    case 'cancelled': return -1;
    default:          return 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Live ETA ring                                                       */
/* ------------------------------------------------------------------ */

function EtaRing({ minutes }: { minutes: number }) {
  const [secs, setSecs] = useState(minutes * 60);

  useEffect(() => {
    // Deferred a tick, not called directly in the effect body, so resetting
    // the ring when `minutes` changes doesn't fire setState synchronously
    // within the effect.
    const reset = setTimeout(() => setSecs(minutes * 60), 0);
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => {
      clearTimeout(reset);
      clearInterval(id);
    };
  }, [minutes]);

  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const total = Math.max(minutes * 60, 1);
  const r = 17;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.max(0, secs / total) * circ;

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <div className="relative size-11">
        <svg className="size-11 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" className="stroke-hair-1" />
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            strokeWidth="3"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="stroke-brand transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className="text-ink-1 absolute inset-0 grid place-items-center text-[10px] leading-none font-extrabold tabular-nums">
          {m}:{s < 10 ? '0' : ''}{s}
        </span>
      </div>
      <div className="hidden sm:block">
        <p className="text-ink-4 text-[10.5px] leading-none font-bold tracking-wide uppercase">
          Est. ready
        </p>
        <p className="text-ink-1 text-[14px] leading-tight font-extrabold tabular-nums">
          ~{minutes} min
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tracker                                                             */
/* ------------------------------------------------------------------ */

interface OrderTrackerProps {
  status: OrderStatus;
  estimatedMinutes?: number;
}

export default function OrderTracker({ status, estimatedMinutes }: OrderTrackerProps) {
  if (status === 'cancelled') {
    return (
      <div className="border-nonveg/25 bg-nonveg/8 flex items-center gap-3 rounded-xl border p-4">
        <XCircle className="text-nonveg size-5 shrink-0" />
        <div>
          <p className="text-ink-1 text-[14px] font-extrabold">Order cancelled</p>
          <p className="text-ink-3 mt-0.5 text-[12.5px]">
            This order will not be prepared. Any online payment is refunded automatically.
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = getStageIndex(status);
  const currentStage = ORDER_STAGES[currentIdx] ?? ORDER_STAGES[0];
  const isComplete = status === 'delivered';
  const StageIcon = currentStage.icon;
  const showEta = !isComplete && estimatedMinutes != null && estimatedMinutes > 0;
  const progress = (currentIdx / (ORDER_STAGES.length - 1)) * 100;

  return (
    <div className="space-y-4">
      {/* ── Where it is right now ────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-xl border p-4',
          isComplete ? 'border-veg/25 bg-veg/8' : 'border-brand-200 bg-brand-50'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'relative grid size-11 shrink-0 place-items-center rounded-xl bg-white',
              isComplete ? 'text-veg' : 'text-brand-600'
            )}
          >
            <StageIcon className="size-5" />
            {!isComplete && (
              <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-60" />
                <span className="bg-brand relative inline-flex size-2.5 rounded-full" />
              </span>
            )}
          </span>
          <div className="min-w-0">
            <p className={cn('text-[14.5px] font-extrabold', isComplete ? 'text-veg' : 'text-brand-800')}>
              {currentStage.label}
            </p>
            <p className="text-ink-3 mt-0.5 truncate text-[12.5px]">{currentStage.desc}</p>
          </div>
        </div>

        {showEta ? (
          <EtaRing minutes={estimatedMinutes} />
        ) : status === 'ready' ? (
          <span className="text-veg shrink-0 rounded-lg bg-white px-3 py-2 text-[12px] font-extrabold">
            Collect now
          </span>
        ) : status === 'pending' ? (
          <span className="text-ink-4 flex shrink-0 items-center gap-1.5 text-[12px] font-bold">
            <Clock className="size-3.5" />
            Queued
          </span>
        ) : null}
      </div>

      {/* ── Four-step rail ───────────────────────────────────────────── */}
      <div className="px-1">
        <div className="relative flex items-start justify-between">
          {/* The rail is inset by half a node on each side so it starts and
              ends at the centre of the first and last circle rather than at
              the edge of the row. */}
          <div className="bg-hair-1 absolute top-[18px] right-[12.5%] left-[12.5%] h-[3px] rounded-full" />
          <div
            className="bg-veg absolute top-[18px] left-[12.5%] h-[3px] rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `calc(${progress}% * 0.75)` }}
          />

          {ORDER_STAGES.map((stage, idx) => {
            const isDone = currentIdx > idx;
            const isCurrent = currentIdx === idx;
            const NodeIcon = stage.icon;

            return (
              <div key={stage.key} className="relative z-10 flex w-1/4 flex-col items-center">
                <span
                  className={cn(
                    'grid size-9 place-items-center rounded-full border-2 transition-colors duration-300',
                    isDone && 'border-veg bg-veg text-white',
                    isCurrent && 'border-brand bg-white text-brand ring-brand/20 ring-4',
                    !isDone && !isCurrent && 'border-hair-1 text-ink-4 bg-white'
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-[18px]" />
                  ) : (
                    <NodeIcon className="size-[17px]" />
                  )}
                </span>

                <span
                  className={cn(
                    'mt-2 px-0.5 text-center text-[11px] leading-tight font-bold',
                    isCurrent ? 'text-brand-700' : isDone ? 'text-ink-2' : 'text-ink-4'
                  )}
                >
                  {stage.shortTitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
