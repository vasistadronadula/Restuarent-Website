'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { StatCard } from '@/components/admin/ui';
import { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Volume2, VolumeX, Flame, CheckCircle2, Clock,
  ArrowRight, Check, History, Undo2, Timer, Utensils,
  Maximize2, Minimize2, Columns, Grid, Search,
  AlertTriangle, RotateCcw, ChefHat, ListFilter,
  CheckSquare, Square
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Sound chime synthesizer using Web Audio API
function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Double beep notification chime
    const playNote = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    playNote(659.25, 0, 0.25); // E5
    playNote(880.00, 0.15, 0.4); // A5
  } catch {
    // Audio Context blocked or unsupported
  }
}

const getOrderStatus = (o: Order): OrderStatus => o.orderStatus || o.status || 'pending';
const orderPlacedAt = (o: Order) => o.createdAt || o.orderTime || o.orderDate;

/** Live count-up timer formatted as MM:SS with strict urgency escalation */
function KitchenTimer({ placedAt }: { placedAt?: string }) {
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    if (!placedAt) return;
    const updateTime = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(placedAt).getTime()) / 1000));
      setSeconds(elapsed);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [placedAt]);

  if (!placedAt) return <span className="text-xs font-bold text-stone-500">—</span>;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  // Urgency styling thresholds
  const isOverdue = mins >= 15;
  const isUrgent = mins >= 10 && mins < 15;
  const isWarning = mins >= 5 && mins < 10;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-black tracking-wider transition-all',
        isOverdue
          ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40 ring-2 ring-rose-400'
          : isUrgent
          ? 'bg-amber-500 text-stone-950 font-black ring-1 ring-amber-400'
          : isWarning
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          : 'bg-stone-800 text-stone-300 border border-stone-700/60'
      )}
    >
      <Timer className={cn('size-3.5', isOverdue && 'animate-spin')} />
      <span>{timeStr}</span>
    </div>
  );
}

const LANES: { status: OrderStatus; label: string; icon: React.ReactNode; badgeBg: string; cta: string; next: OrderStatus }[] = [
  {
    status: 'pending',
    label: 'New Received',
    icon: <Clock className="size-4 text-amber-400" />,
    badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    cta: 'Start Cooking',
    next: 'preparing',
  },
  {
    status: 'preparing',
    label: 'Cooking Now',
    icon: <Flame className="size-4 text-orange-400" />,
    badgeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
    cta: 'Mark Ready',
    next: 'ready',
  },
  {
    status: 'ready',
    label: 'Ready for Pass',
    icon: <CheckCircle2 className="size-4 text-emerald-400" />,
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    cta: 'Mark Served',
    next: 'delivered',
  },
];

export default function KitchenDisplayPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showPrepMatrix, setShowPrepMatrix] = useState(true);
  const [viewMode, setViewMode] = useState<'lanes' | 'grid'>('lanes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});
  const [lastOrderCount, setLastOrderCount] = useState(orders.length);

  // Audio alert on new incoming orders
  useEffect(() => {
    if (orders.length > lastOrderCount) {
      if (soundEnabled) playKitchenChime();
      toast.success('🔔 New Order Arrived in Kitchen!');
    }
    setLastOrderCount(orders.length);
  }, [orders.length, lastOrderCount, soundEnabled]);

  // Fullscreen API Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Toggle item cross-off on ticket
  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    setCheckedItems((prev) => {
      const orderSet = new Set(prev[orderId] || []);
      if (orderSet.has(itemIdx)) {
        orderSet.delete(itemIdx);
      } else {
        orderSet.add(itemIdx);
      }
      return { ...prev, [orderId]: orderSet };
    });
  };

  // Active Kitchen Orders (Pending, Preparing, Ready)
  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const s = getOrderStatus(o);
        const matchesStatus = s === 'pending' || s === 'preparing' || s === 'ready';
        if (!matchesStatus) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.tableNumber && o.tableNumber.toString().includes(q)) ||
          o.items?.some((i) => i.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const ta = orderPlacedAt(a) ? new Date(orderPlacedAt(a)!).getTime() : 0;
        const tb = orderPlacedAt(b) ? new Date(orderPlacedAt(b)!).getTime() : 0;
        return ta - tb; // Oldest ticket first
      });
  }, [orders, searchQuery]);

  // Group active orders by lane
  const laneOrders = useMemo(() => {
    const map: Record<string, Order[]> = { pending: [], preparing: [], ready: [] };
    for (const order of activeOrders) {
      const s = getOrderStatus(order);
      if (map[s]) map[s].push(order);
    }
    return map;
  }, [activeOrders]);

  // Live Prep Summary Matrix — Combined total quantity of dishes to prepare right now
  const prepMatrix = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; pendingCount: number }> = {};
    for (const o of activeOrders) {
      if (getOrderStatus(o) === 'ready') continue; // Only count pending & cooking items
      for (const item of o.items || []) {
        const key = `${item.name}${item.selectedPortion ? ` (${item.selectedPortion})` : ''}`;
        if (!counts[key]) {
          counts[key] = { name: key, quantity: 0, pendingCount: 0 };
        }
        counts[key].quantity += item.quantity || 1;
        counts[key].pendingCount += 1;
      }
    }
    return Object.values(counts).sort((a, b) => b.quantity - a.quantity);
  }, [activeOrders]);

  // Recently completed / delivered orders for recall
  const historyOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const s = getOrderStatus(o);
        return s === 'delivered' || s === 'cancelled';
      })
      .slice(0, 15);
  }, [orders]);

  const handleAdvance = async (orderId: string, currentStatus: OrderStatus) => {
    const lane = LANES.find((l) => l.status === currentStatus);
    if (!lane) return;
    try {
      await updateOrderStatus(orderId, lane.next);
      if (soundEnabled && lane.next === 'ready') playKitchenChime();
      toast.success(`Order ${orderId} updated to ${lane.next}`);
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const handleRegress = async (orderId: string, currentStatus: OrderStatus) => {
    const prevStatus: Record<string, OrderStatus> = {
      preparing: 'pending',
      ready: 'preparing',
      delivered: 'ready',
    };
    const target = prevStatus[currentStatus];
    if (!target) return;
    try {
      await updateOrderStatus(orderId, target);
      toast.info(`Order ${orderId} moved back to ${target}`);
    } catch {
      toast.error('Failed to update order status');
    }
  };

  return (
    <AdminLayout title="Kitchen Display System (KDS)">
      <div className="space-y-4 w-full max-w-full">
        {/* KDS Header & Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-stone-900 border border-stone-800 text-stone-100 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ChefHat className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">Kitchen Display System</h1>
                <Badge className="bg-stone-800 text-stone-300 border-stone-700 font-mono text-xs">
                  {activeOrders.length} Active Tickets
                </Badge>
              </div>
              <p className="text-xs text-stone-400 font-medium">Real-time order queue for kitchen staff & line cooks</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
              <Input
                placeholder="Search ticket / table / dish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 text-xs bg-stone-950 border-stone-800 text-stone-100 placeholder:text-stone-500 rounded-xl focus-visible:ring-amber-500"
              />
            </div>

            {/* Prep Summary Matrix Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrepMatrix(!showPrepMatrix)}
              className={cn(
                'h-9 rounded-xl text-xs font-black transition-all border-stone-800',
                showPrepMatrix ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-stone-950 text-stone-400 hover:text-stone-200'
              )}
            >
              <ListFilter className="size-3.5 mr-1.5" />
              Prep Matrix ({prepMatrix.length})
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
              <button
                onClick={() => setViewMode('lanes')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                  viewMode === 'lanes' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
                )}
              >
                <Columns className="size-3.5" /> Lanes
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                  viewMode === 'grid' ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
                )}
              >
                <Grid className="size-3.5" /> Grid
              </button>
            </div>

            {/* Sound Chime Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playKitchenChime();
              }}
              className={cn(
                'h-9 rounded-xl text-xs font-bold border-stone-800 bg-stone-950',
                soundEnabled ? 'text-emerald-400' : 'text-stone-500'
              )}
            >
              {soundEnabled ? <Volume2 className="size-4 mr-1 text-emerald-400" /> : <VolumeX className="size-4 mr-1" />}
              {soundEnabled ? 'Sound ON' : 'Muted'}
            </Button>

            {/* Completed Log Toggle */}
            <Button
              variant={showHistory ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'h-9 rounded-xl text-xs font-bold border-stone-800',
                showHistory ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-stone-950 text-stone-300 hover:text-white'
              )}
            >
              <History className="size-4 mr-1.5" />
              {showHistory ? 'Active Queue' : 'Recall Log'}
            </Button>

            {/* Fullscreen Mode */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-9 px-2.5 rounded-xl border-stone-800 bg-stone-950 text-stone-300 hover:text-white"
              title="Toggle KDS Fullscreen Terminal"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </div>

        {/* 3 Metric Quick Counters */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Pending Queue"
            value={laneOrders['pending'].length}
            sub="Tickets waiting to start"
            accent="#D97706"
          />
          <StatCard
            icon={<Flame className="w-4 h-4" />}
            label="Cooking Now"
            value={laneOrders['preparing'].length}
            sub="On the burners"
            accent="#EA580C"
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Ready for Pass"
            value={laneOrders['ready'].length}
            sub="Awaiting pickup/server"
            accent="#059669"
          />
        </div>

        {/* Live Prep Matrix (Batching Bar for Cooks) */}
        {showPrepMatrix && prepMatrix.length > 0 && !showHistory && (
          <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/25 text-amber-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                <ChefHat className="size-4 text-amber-400" />
                <span>Live Batch Prep Summary (Total Dishes to Cook Across All Active Tickets)</span>
              </div>
              <span className="text-[10px] font-bold text-amber-400/80">Batch cooking overview</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {prepMatrix.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900 border border-amber-500/30 shadow-sm"
                >
                  <span className="text-xs font-bold text-white">{item.name}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-stone-950 text-xs font-black tabular-nums">
                    x{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Display */}
        {showHistory ? (
          /* ── Completed / Recall History Drawer ───────────────────────────── */
          <div className="p-5 rounded-3xl bg-stone-900 border border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <History className="size-5 text-amber-500" /> Recently Bumped / Completed Tickets
              </h3>
              <p className="text-xs text-stone-400">Tap "Recall" to return a ticket to active cooking</p>
            </div>
            <div className="space-y-2.5">
              {historyOrders.length === 0 ? (
                <p className="py-8 text-center text-xs font-medium text-stone-500">No recently completed tickets.</p>
              ) : (
                historyOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-wrap justify-between items-center gap-3 p-3.5 rounded-2xl border border-stone-800 bg-stone-950 hover:border-stone-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{o.id}</span>
                        <span className="text-xs font-bold text-amber-400 uppercase">{o.orderType}</span>
                        {o.tableNumber && <span className="text-xs font-bold text-emerald-400">Table #{o.tableNumber}</span>}
                      </div>
                      <div className="text-xs text-stone-400 font-medium truncate mt-0.5">
                        {o.customerName || 'Walk-in'} — {o.items?.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="capitalize text-xs font-bold border-stone-700 text-stone-300">
                        {getOrderStatus(o)}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleRegress(o.id, getOrderStatus(o))}
                        className="h-8 rounded-xl text-xs font-black bg-amber-600 text-white hover:bg-amber-700"
                      >
                        <Undo2 className="size-3.5 mr-1" /> Recall Ticket
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : viewMode === 'lanes' ? (
          /* ── Kanban Column Lanes Mode ────────────────────────────────────── */
          <div className="rounded-3xl bg-stone-950 p-3 sm:p-4 border border-stone-900 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LANES.map((lane) => {
                const laneList = laneOrders[lane.status] || [];
                return (
                  <div key={lane.status} className="flex flex-col min-w-0">
                    {/* Lane Header */}
                    <div className={cn('mb-3 flex items-center justify-between rounded-2xl border px-4 py-3 shadow-md', lane.badgeBg)}>
                      <div className="flex items-center gap-2 text-sm font-black tracking-tight">
                        {lane.icon}
                        <span>{lane.label}</span>
                      </div>
                      <span className="rounded-full bg-stone-900 px-3 py-0.5 text-xs font-black text-white tabular-nums border border-stone-800">
                        {laneList.length}
                      </span>
                    </div>

                    {/* Lane Body */}
                    <div className="space-y-3.5 flex-1 min-h-[400px]">
                      {laneList.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-stone-900 px-4 py-12 text-center text-xs font-bold text-stone-600 flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="size-6 text-stone-800" />
                          <span>No orders in this column</span>
                        </div>
                      ) : (
                        laneList.map((order) => (
                          <TicketCard
                            key={order.id}
                            order={order}
                            lane={lane}
                            checkedItems={checkedItems[order.id] || new Set()}
                            onToggleItemCheck={(idx) => toggleItemCheck(order.id, idx)}
                            onAdvance={() => handleAdvance(order.id, getOrderStatus(order))}
                            onRegress={() => handleRegress(order.id, getOrderStatus(order))}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Grid Board Mode (All Active Tickets sorted by Urgency) ──────── */
          <div className="rounded-3xl bg-stone-950 p-4 border border-stone-900 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeOrders.length === 0 ? (
                <div className="col-span-full py-16 text-center text-stone-600 font-bold text-sm">
                  All clear! No active kitchen orders.
                </div>
              ) : (
                activeOrders.map((order) => {
                  const status = getOrderStatus(order);
                  const lane = LANES.find((l) => l.status === status) || LANES[0];
                  return (
                    <TicketCard
                      key={order.id}
                      order={order}
                      lane={lane}
                      checkedItems={checkedItems[order.id] || new Set()}
                      onToggleItemCheck={(idx) => toggleItemCheck(order.id, idx)}
                      onAdvance={() => handleAdvance(order.id, status)}
                      onRegress={() => handleRegress(order.id, status)}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/** Individual Touch-Optimized Kitchen Ticket Card Component */
function TicketCard({
  order,
  lane,
  checkedItems,
  onToggleItemCheck,
  onAdvance,
  onRegress,
}: {
  order: Order;
  lane: typeof LANES[number];
  checkedItems: Set<number>;
  onToggleItemCheck: (idx: number) => void;
  onAdvance: () => void;
  onRegress: () => void;
}) {
  const items = order.items || [];
  const totalUnits = items.reduce((s, it) => s + (it.quantity || 0), 0);
  const status = getOrderStatus(order);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-stone-900 p-4 shadow-xl transition-all duration-150 flex flex-col justify-between',
        status === 'pending'
          ? 'border-amber-500/40 hover:border-amber-500/70'
          : status === 'preparing'
          ? 'border-orange-500/40 hover:border-orange-500/70'
          : 'border-emerald-500/40 hover:border-emerald-500/70'
      )}
    >
      <div>
        {/* Ticket Top Header */}
        <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white tracking-tight truncate">{order.id}</span>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 uppercase text-[10px] font-extrabold px-2 py-0.5">
                {order.orderType}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs font-bold text-stone-400 truncate">
              <span>{order.customerName || 'Walk-in Guest'}</span>
              {order.tableNumber && (
                <>
                  <span className="text-stone-600">·</span>
                  <span className="text-emerald-400 font-extrabold">Table #{order.tableNumber}</span>
                </>
              )}
            </div>
          </div>
          {/* Live Timer */}
          <KitchenTimer placedAt={orderPlacedAt(order)} />
        </div>

        {/* Special Instructions / Notes Banner */}
        {order.notes && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2 text-amber-300 text-xs font-bold">
            <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <span>Note: {order.notes}</span>
          </div>
        )}

        {/* Item List Checklist */}
        <div className="mt-3.5 space-y-2">
          {items.map((item, idx) => {
            const isChecked = checkedItems.has(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleItemCheck(idx)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left transition-all border',
                  isChecked
                    ? 'bg-stone-950/60 border-stone-800 text-stone-500 line-through'
                    : 'bg-stone-950/90 border-stone-800/80 text-stone-100 hover:border-stone-700'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isChecked ? (
                    <CheckSquare className="size-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Square className="size-4 text-stone-600 shrink-0" />
                  )}
                  <span className={cn('text-xs font-extrabold truncate', isChecked ? 'text-stone-500' : 'text-white')}>
                    {item.name}
                    {item.selectedPortion && (
                      <span className="ml-1 text-[10px] font-black uppercase text-amber-400/90">
                        ({item.selectedPortion})
                      </span>
                    )}
                  </span>
                </div>
                <span
                  className={cn(
                    'shrink-0 px-2 py-0.5 rounded-lg text-xs font-black tabular-nums',
                    isChecked ? 'bg-stone-800 text-stone-500' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  )}
                >
                  x{item.quantity}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ticket Footer & Actions */}
      <div className="mt-4 pt-3 border-t border-stone-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-stone-400">
          <span className="flex items-center gap-1.5">
            <Utensils className="size-3.5 text-amber-500" />
            {items.length} items ({totalUnits} units)
          </span>
          <span className="font-black text-amber-400 tabular-nums">₹{order.grandTotal}</span>
        </div>

        {/* Action Bump Buttons */}
        <div className="flex items-center gap-2">
          {status !== 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegress}
              className="h-10 px-2.5 rounded-xl border-stone-800 bg-stone-950 text-stone-400 hover:text-white"
              title="Move order back"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
          {lane.next && (
            <Button
              onClick={onAdvance}
              className={cn(
                'flex-1 h-10 rounded-xl text-xs font-black shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]',
                status === 'pending'
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black'
                  : status === 'preparing'
                  ? 'bg-orange-500 hover:bg-orange-400 text-stone-950 font-black'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black'
              )}
            >
              <Check className="size-4 mr-1.5" />
              {lane.cta}
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
