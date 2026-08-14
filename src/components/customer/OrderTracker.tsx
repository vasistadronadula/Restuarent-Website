'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2, Flame, CookingPot, ShoppingBag, XCircle, Clock,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';

/* ------------------------------------------------------------------ */
/*  Stage definitions                                                   */
/* ------------------------------------------------------------------ */

export const ORDER_STAGES = [
  {
    key: 'pending',
    label: 'Order Confirmed',
    shortTitle: 'Confirmed',
    desc: 'Kitchen received your ticket & is preparing ingredients',
    icon: CheckCircle2,
    activeColor: 'text-emerald-600',
    activeBg: 'bg-emerald-50 border-emerald-200',
    doneBg: 'bg-emerald-500 border-emerald-500 text-white',
    trackColor: '#10b981',
  },
  {
    key: 'preparing',
    label: 'Cooking on Stove',
    shortTitle: 'Cooking',
    desc: 'Chef is actively cooking your fresh food on the stove',
    icon: Flame,
    activeColor: 'text-amber-600',
    activeBg: 'bg-amber-50 border-amber-200',
    doneBg: 'bg-amber-500 border-amber-500 text-white',
    trackColor: '#f59e0b',
  },
  {
    key: 'ready',
    label: 'Ready for Pickup',
    shortTitle: 'Ready',
    desc: 'Fresh & hot, packed and waiting at the counter for you',
    icon: CookingPot,
    activeColor: 'text-sky-600',
    activeBg: 'bg-sky-50 border-sky-200',
    doneBg: 'bg-sky-500 border-sky-500 text-white',
    trackColor: '#0ea5e9',
  },
  {
    key: 'delivered',
    label: 'Order Collected',
    shortTitle: 'Done',
    desc: 'Enjoy your authentic Telangana flavours! 🎉',
    icon: ShoppingBag,
    activeColor: 'text-violet-600',
    activeBg: 'bg-violet-50 border-violet-200',
    doneBg: 'bg-violet-500 border-violet-500 text-white',
    trackColor: '#7c3aed',
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
/*  Live ETA ring countdown                                             */
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
  const total = minutes * 60;
  const pct = Math.max(0, secs / Math.max(total, 1));
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="relative size-10">
        <svg className="size-10 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3" className="stroke-stone-100" />
          <circle
            cx="20" cy="20" r={r} fill="none" strokeWidth="3"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            className="stroke-amber-500 transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[9px] font-black tabular-nums text-stone-700 leading-none">
            {m}:{s < 10 ? '0' : ''}{s}
          </span>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-stone-400 font-semibold leading-none">Est. Ready</p>
        <p className="text-sm font-black text-stone-900 leading-tight tabular-nums">~{minutes}m</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main OrderTracker Component                                         */
/* ------------------------------------------------------------------ */

interface OrderTrackerProps {
  status: OrderStatus;
  estimatedMinutes?: number;
}

export default function OrderTracker({ status, estimatedMinutes }: OrderTrackerProps) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700 shadow-xs">
        <XCircle className="size-5 shrink-0 text-rose-600" />
        <div>
          <p className="text-sm font-black">Order Cancelled</p>
          <p className="text-xs text-rose-500 mt-0.5">This order has been cancelled and will not be prepared.</p>
        </div>
      </div>
    );
  }

  const currentIdx = getStageIndex(status);
  const currentStage = ORDER_STAGES[currentIdx] ?? ORDER_STAGES[0];
  const isComplete = status === 'delivered';
  const StageIcon = currentStage.icon;
  const showEta = !isComplete && estimatedMinutes != null && estimatedMinutes > 0;

  return (
    <div className="space-y-3">
      {/* Active status banner */}
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn('flex items-center justify-between gap-3 rounded-2xl border p-4', currentStage.activeBg)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-white border-2 shadow-xs',
            currentStage.activeColor, 'border-current'
          )}>
            <StageIcon className="size-5" />
            {!isComplete && (
              <span className="absolute -top-1 -right-1 flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
                <span className="relative inline-flex rounded-full size-2.5 bg-current" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-black leading-tight', currentStage.activeColor)}>{currentStage.label}</p>
            <p className="text-xs text-stone-500 mt-0.5 truncate">{currentStage.desc}</p>
          </div>
        </div>

        {showEta && <EtaRing minutes={estimatedMinutes!} />}
        {!showEta && status === 'ready' && (
          <div className="flex items-center gap-1.5 bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl shrink-0">
            <span className="text-xs font-black">🎉 Collect Now!</span>
          </div>
        )}
        {!showEta && status === 'delivered' && (
          <div className="flex items-center gap-1.5 bg-white border border-violet-200 text-violet-700 px-3 py-1.5 rounded-xl shrink-0">
            <span className="text-xs font-black">✓ Enjoyed!</span>
          </div>
        )}
        {!showEta && status === 'pending' && (
          <div className="shrink-0 flex items-center gap-1 text-stone-500 text-xs font-semibold">
            <Clock className="size-3.5" />
            Queued
          </div>
        )}
      </motion.div>

      {/* 4-Step Stepper */}
      <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-xs">
        <div className="relative flex items-start justify-between">
          {/* Track */}
          <div className="absolute top-5 left-5 right-5 h-[2px] rounded-full bg-stone-100" />

          {/* Animated fill */}
          <motion.div
            className="absolute top-5 left-5 h-[2px] rounded-full"
            style={{ maxWidth: 'calc(100% - 40px)', background: 'linear-gradient(90deg, #10b981, #f59e0b, #0ea5e9)' }}
            initial={{ width: '0%' }}
            animate={{
              width: `${Math.min(100, Math.max(0, (currentIdx / (ORDER_STAGES.length - 1)) * 100))}%`,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />

          {ORDER_STAGES.map((stage, idx) => {
            const isDone    = currentIdx > idx;
            const isCurrent = currentIdx === idx;
            const isFuture  = currentIdx < idx;
            const NodeIcon  = stage.icon;

            return (
              <div
                key={stage.key}
                className="relative z-10 flex flex-col items-center"
                style={{ width: `${100 / ORDER_STAGES.length}%` }}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={cn(
                    'relative flex size-10 sm:size-11 items-center justify-center rounded-full border-2 transition-colors duration-300 shadow-xs',
                    isDone  && stage.doneBg,
                    isCurrent && cn(stage.activeBg, 'ring-4 ring-offset-1', stage.activeColor.replace('text-', 'ring-') + '/20'),
                    isFuture && 'bg-white border-stone-200 text-stone-300',
                  )}
                >
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full animate-ping opacity-20 border-2 border-current" />
                  )}
                  {isDone ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                      <CheckCircle2 className="size-5 text-white" />
                    </motion.div>
                  ) : isCurrent ? (
                    <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 350, damping: 18 }}>
                      <NodeIcon className={cn('size-5', stage.activeColor)} />
                    </motion.div>
                  ) : (
                    <NodeIcon className="size-4 text-stone-300" />
                  )}
                </motion.div>

                <span className={cn(
                  'mt-2 text-center text-[10px] sm:text-xs font-bold leading-tight px-0.5',
                  isCurrent && stage.activeColor,
                  isDone    && 'text-stone-600',
                  isFuture  && 'text-stone-300',
                )}>
                  {stage.shortTitle}
                </span>
                <span className="text-[9px] text-stone-400 hidden sm:block mt-0.5">
                  {isDone ? '✓ Done' : isCurrent ? 'In Progress' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
