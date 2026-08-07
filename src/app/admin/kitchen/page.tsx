'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { PageHeader, StatCard, SectionCard } from '@/components/admin/ui';
import { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Volume2, VolumeX, Flame, CheckCircle2, Clock,
  ArrowRight, Check, History, Undo2, Timer, Utensils,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LANES: { status: OrderStatus; label: string; icon: React.ReactNode; lane: string; cta: string; next: OrderStatus | null }[] = [
  {
    status: 'pending',
    label: 'New Orders',
    icon: <Clock className="size-4" />,
    lane: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    cta: 'Start Cooking',
    next: 'preparing',
  },
  {
    status: 'preparing',
    label: 'Cooking Now',
    icon: <Flame className="size-4" />,
    lane: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
    cta: 'Mark Ready',
    next: 'ready',
  },
  {
    status: 'ready',
    label: 'Ready for Pass',
    icon: <CheckCircle2 className="size-4" />,
    lane: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    cta: 'Mark Delivered',
    next: 'delivered',
  },
];

const CTA_STYLES: Record<string, string> = {
  pending: 'bg-amber-500 hover:bg-amber-400 text-stone-950',
  preparing: 'bg-orange-500 hover:bg-orange-400 text-stone-950',
  ready: 'bg-emerald-500 hover:bg-emerald-400 text-stone-950',
};

function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio Context not allowed or unsupported
  }
}

const getOrderStatus = (o: Order): OrderStatus => o.orderStatus || o.status || 'pending';

const orderPlacedAt = (o: Order) => o.createdAt || o.orderTime || o.orderDate;

/** Live count-up of how long an order has been in the kitchen. Goes amber at
 *  10 minutes and red at 15 — a kitchen screen has to scream before a ticket
 *  dies quietly at the bottom of the queue. */
function ElapsedTime({ placedAt }: { placedAt?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!placedAt) return <span className="text-[10px] font-bold text-stone-500">—</span>;

  const mins = Math.max(0, Math.floor((now - new Date(placedAt).getTime()) / 60_000));
  const label = mins < 1 ? 'just now' : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums',
        mins >= 15 ? 'animate-pulse bg-rose-500/20 text-rose-400'
          : mins >= 10 ? 'bg-amber-500/20 text-amber-400'
          : 'bg-stone-800 text-stone-400'
      )}
    >
      <Timer className="size-3" /> {label}
    </span>
  );
}

export default function KitchenDisplayPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(orders.length);

  useEffect(() => {
    if (orders.length > lastOrderCount) {
      if (soundEnabled) playKitchenChime();
      toast.success('New Order Received in Kitchen! 🔔');
    }
    setLastOrderCount(orders.length);
  }, [orders.length, lastOrderCount, soundEnabled]);

  const activeOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = getOrderStatus(o);
      return s === 'pending' || s === 'preparing' || s === 'ready';
    });
  }, [orders]);

  const laneOrders = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const lane of LANES) {
      map[lane.status] = activeOrders
        .filter((o) => getOrderStatus(o) === lane.status)
        .sort((a, b) => {
          const ta = orderPlacedAt(a) ? new Date(orderPlacedAt(a)!).getTime() : 0;
          const tb = orderPlacedAt(b) ? new Date(orderPlacedAt(b)!).getTime() : 0;
          return ta - tb;
        });
    }
    return map;
  }, [activeOrders]);

  const historyOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = getOrderStatus(o);
      return s === 'delivered' || s === 'cancelled';
    }).slice(0, 10);
  }, [orders]);

  const handleAdvance = async (orderId: string, currentStatus: OrderStatus) => {
    const lane = LANES.find((l) => l.status === currentStatus);
    if (!lane || !lane.next) return;
    try {
      await updateOrderStatus(orderId, lane.next);
      toast.success(`Order ${orderId} moved to ${lane.next}`);
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const handleUndo = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'preparing');
      toast.success(`Order ${orderId} returned to preparing`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <AdminLayout title="Kitchen Display System (KDS)">
      <div className="space-y-4 w-full max-w-full">
        <PageHeader
          title="Kitchen Display System (KDS)"
          subtitle="Live order queue for chefs & line cooks — oldest tickets first"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-8 rounded-xl text-xs font-bold"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 mr-1.5 text-emerald-500" /> : <VolumeX className="w-4 h-4 mr-1.5" />}
                {soundEnabled ? 'Chime ON' : 'Mute Chime'}
              </Button>
              <Button
                variant={showHistory ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className={`h-8 rounded-xl text-xs font-bold ${showHistory ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}`}
              >
                <History className="w-4 h-4 mr-1.5" />
                {showHistory ? 'Hide Completed' : 'Completed Log'}
              </Button>
            </div>
          }
        />

        {/* 3 Metric Stat Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Pending in Queue"
            value={orders.filter((o) => getOrderStatus(o) === 'pending').length}
            sub="Orders waiting to start"
            accent="#D97706"
          />
          <StatCard
            icon={<Flame className="w-4 h-4" />}
            label="Currently Cooking"
            value={orders.filter((o) => getOrderStatus(o) === 'preparing').length}
            sub="Dishes on the burners"
            accent="#EA580C"
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Ready for Pass"
            value={orders.filter((o) => getOrderStatus(o) === 'ready').length}
            sub="Awaiting pickup / delivery"
            accent="#059669"
          />
        </div>

        {showHistory ? (
          /* ── Completed log ────────────────────────────────────────────── */
          <SectionCard>
            <h3 className="font-extrabold text-base mb-4 text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600" /> Recently Completed Kitchen Orders
            </h3>
            <div className="space-y-3">
              {historyOrders.length === 0 && (
                <p className="py-6 text-center text-xs font-medium text-stone-400">
                  No completed orders yet.
                </p>
              )}
              {historyOrders.map((o) => (
                <div key={o.id} className="flex justify-between items-center gap-3 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm text-stone-900 dark:text-stone-100 truncate">{o.id} · {o.customerName || 'Walk-in'}</div>
                    <div className="text-xs text-stone-500 font-medium truncate">
                      {o.items?.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant="outline" className="capitalize text-xs font-bold">
                      {getOrderStatus(o)}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleUndo(o.id)} className="text-xs font-bold text-amber-600">
                      <Undo2 className="w-3.5 h-3.5 mr-1" /> Re-open
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : (
          /* ── Dark full-width kitchen board ────────────────────────────── */
          <div className="rounded-3xl bg-stone-950 p-3 sm:p-4 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LANES.map((lane) => {
                const laneList = laneOrders[lane.status] || [];
                return (
                  <div key={lane.status} className="flex flex-col min-w-0">
                    {/* Lane header */}
                    <div className={cn('mb-3 flex items-center justify-between rounded-xl border px-3 py-2.5', lane.lane)}>
                      <div className="flex items-center gap-2 text-sm font-black">
                        {lane.icon}
                        <span>{lane.label}</span>
                      </div>
                      <span className="rounded-full bg-stone-900 px-2.5 py-0.5 text-sm font-extrabold text-white tabular-nums ring-1 ring-white/10">
                        {laneList.length}
                      </span>
                    </div>

                    {/* Lane body */}
                    <div className="space-y-3">
                      {laneList.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-stone-800 px-4 py-8 text-center text-xs font-bold text-stone-600">
                          All clear
                        </div>
                      ) : (
                        laneList.map((o) => {
                          const items = o.items || [];
                          const totalUnits = items.reduce((s, it) => s + (it.quantity || 0), 0);
                          return (
                            <div
                              key={o.id}
                              className="rounded-2xl border border-stone-800 bg-stone-900 p-4 shadow-lg transition-all hover:border-stone-700"
                            >
                              {/* Ticket header */}
                              <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                                <div className="min-w-0">
                                  <div className="truncate text-base font-black text-white">{o.id}</div>
                                  <div className="mt-0.5 truncate text-[11px] font-bold text-stone-400">
                                    {o.customerName || 'Walk-in'}
                                    <span className="mx-1 text-stone-600">·</span>
                                    <span className="uppercase text-amber-500">{o.orderType}</span>
                                    {o.tableNumber && (
                                      <>
                                        <span className="mx-1 text-stone-600">·</span>
                                        <span className="text-emerald-400">T{o.tableNumber}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <ElapsedTime placedAt={orderPlacedAt(o)} />
                              </div>

                              {/* Items — the part a cook actually reads */}
                              <div className="mt-2.5 space-y-2">
                                {items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 truncate text-sm font-bold text-stone-100">
                                      {item.name}
                                      {item.selectedPortion && (
                                        <span className="ml-1.5 text-[10px] font-black uppercase text-stone-500">
                                          {item.selectedPortion}
                                        </span>
                                      )}
                                    </span>
                                    <span className="shrink-0 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-black text-amber-400 tabular-nums">
                                      x{item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Footer */}
                              <div className="mt-3 flex items-center justify-between border-t border-stone-800 pt-2.5">
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-400">
                                  <Utensils className="size-3.5" />
                                  {items.length} items · {totalUnits} units
                                </span>
                                <span className="font-black text-amber-400 tabular-nums">
                                  ₹{o.grandTotal}
                                </span>
                              </div>

                              {lane.next && (
                                <Button
                                  onClick={() => handleAdvance(o.id, getOrderStatus(o))}
                                  className={cn(
                                    'mt-3 w-full h-10 rounded-xl text-sm font-black shadow-md transition-all hover:shadow-lg',
                                    CTA_STYLES[lane.status]
                                  )}
                                >
                                  <Check className="size-4 mr-1.5" />
                                  {lane.cta}
                                  <ArrowRight className="size-4 ml-1.5" />
                                </Button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
