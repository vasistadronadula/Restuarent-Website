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

  if (!placedAt) return <span className="text-xs font-bold text-stone-400">—</span>;

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
          ? 'bg-rose-600 text-white animate-pulse shadow-md ring-2 ring-rose-300'
          : isUrgent
          ? 'bg-amber-500 text-stone-950 font-black ring-1 ring-amber-300'
          : isWarning
          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
          : 'bg-stone-100 text-stone-700 border border-stone-200 font-extrabold'
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
    icon: <Clock className="size-4 text-sky-700" />,
    badgeBg: 'bg-sky-100 border-sky-300 text-sky-900 font-black',
    cta: 'Start Cooking',
    next: 'preparing',
  },
  {
    status: 'preparing',
    label: 'Cooking Now',
    icon: <Flame className="size-4 text-amber-700" />,
    badgeBg: 'bg-amber-100 border-amber-300 text-amber-900 font-black',
    cta: 'Mark Ready',
    next: 'ready',
  },
  {
    status: 'ready',
    label: 'Ready for Pass',
    icon: <CheckCircle2 className="size-4 text-emerald-700" />,
    badgeBg: 'bg-emerald-100 border-emerald-300 text-emerald-900 font-black',
    cta: 'Mark Served',
    next: 'delivered',
  },
];

function getOrderTypeStyle(orderType?: string) {
  const type = (orderType || 'dine-in').toLowerCase();
  if (type.includes('dine') || type.includes('table')) {
    return 'bg-sky-50 text-sky-800 border-sky-200';
  }
  if (type.includes('takeaway') || type.includes('pickup') || type.includes('pack')) {
    return 'bg-purple-50 text-purple-800 border-purple-200';
  }
  if (type.includes('delivery') || type.includes('swiggy') || type.includes('zomato')) {
    return 'bg-rose-50 text-rose-800 border-rose-200';
  }
  return 'bg-stone-100 text-stone-800 border-stone-200';
}

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
        {/* KDS Header & Toolbar (Light Theme) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-stone-200 text-stone-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <ChefHat className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-stone-900">Kitchen Display System</h1>
                <Badge className="bg-stone-100 text-stone-700 border-stone-200 font-mono text-xs">
                  {activeOrders.length} Active Tickets
                </Badge>
              </div>
              <p className="text-xs text-stone-500 font-medium">Real-time order queue for kitchen staff & line cooks</p>
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
                className="h-9 pl-8 pr-3 text-xs bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400 rounded-xl focus-visible:ring-amber-500"
              />
            </div>

            {/* Prep Summary Matrix Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrepMatrix(!showPrepMatrix)}
              className={cn(
                'h-9 rounded-xl text-xs font-black transition-all border-stone-200',
                showPrepMatrix ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white text-stone-600 hover:bg-stone-50'
              )}
            >
              <ListFilter className="size-3.5 mr-1.5" />
              Prep Matrix ({prepMatrix.length})
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setViewMode('lanes')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                  viewMode === 'lanes' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                )}
              >
                <Columns className="size-3.5" /> Lanes
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                  viewMode === 'grid' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
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
                'h-9 rounded-xl text-xs font-bold border-stone-200 bg-white',
                soundEnabled ? 'text-emerald-700' : 'text-stone-500'
              )}
            >
              {soundEnabled ? <Volume2 className="size-4 mr-1 text-emerald-600" /> : <VolumeX className="size-4 mr-1" />}
              {soundEnabled ? 'Sound ON' : 'Muted'}
            </Button>

            {/* Completed Log Toggle */}
            <Button
              variant={showHistory ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'h-9 rounded-xl text-xs font-bold border-stone-200',
                showHistory ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-white text-stone-700 hover:bg-stone-50'
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
              className="h-9 px-2.5 rounded-xl border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              title="Toggle KDS Fullscreen Terminal"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </div>

        {/* 3 Metric Quick Counters (Light Theme) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-stone-200 text-stone-900 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-700" /> Pending Queue
              </span>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-1 tabular-nums">
                {laneOrders['pending'].length}
              </div>
              <p className="text-[11px] font-medium text-stone-500 mt-0.5">Tickets waiting to start</p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 font-black text-sm tracking-wide">
              NEW
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 text-stone-900 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-700" /> Cooking Now
              </span>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-1 tabular-nums">
                {laneOrders['preparing'].length}
              </div>
              <p className="text-[11px] font-medium text-stone-500 mt-0.5">On the burners</p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-black text-sm tracking-wide">
              COOK
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 text-stone-900 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Ready for Pass
              </span>
              <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-1 tabular-nums">
                {laneOrders['ready'].length}
              </div>
              <p className="text-[11px] font-medium text-stone-500 mt-0.5">Awaiting pickup/server</p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-sm tracking-wide">
              PASS
            </div>
          </div>
        </div>

        {/* Live Prep Matrix (Light Theme) */}
        {showPrepMatrix && prepMatrix.length > 0 && !showHistory && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800">
                <ChefHat className="size-4 text-amber-700" />
                <span>Live Batch Prep Summary (Total Dishes to Cook Across Active Tickets)</span>
              </div>
              <span className="text-[10px] font-bold text-amber-700">Batch cooking overview</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {prepMatrix.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-amber-200 shadow-xs"
                >
                  <span className="text-xs font-extrabold text-stone-900">{item.name}</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-white text-xs font-black tabular-nums shadow-xs">
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
          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                <History className="size-5 text-amber-600" /> Recently Bumped / Completed Tickets
              </h3>
              <p className="text-xs text-stone-500">Tap "Recall" to return a ticket to active cooking</p>
            </div>
            <div className="space-y-2.5">
              {historyOrders.length === 0 ? (
                <p className="py-8 text-center text-xs font-medium text-stone-400">No recently completed tickets.</p>
              ) : (
                historyOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-wrap justify-between items-center gap-3 p-3.5 rounded-2xl border border-stone-200 bg-stone-50 hover:border-stone-300 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-stone-900">{o.id}</span>
                        <Badge className={cn('uppercase text-[10px] font-extrabold px-2 py-0.5', getOrderTypeStyle(o.orderType))}>
                          {o.orderType}
                        </Badge>
                        {o.tableNumber && <span className="text-xs font-bold text-emerald-700">Table #{o.tableNumber}</span>}
                      </div>
                      <div className="text-xs text-stone-500 font-medium truncate mt-0.5">
                        {o.customerName || 'Walk-in'} — {o.items?.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="capitalize text-xs font-bold border-stone-200 text-stone-700">
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
          /* ── Kanban Column Lanes Mode (Light Theme) ───────────────────────── */
          <div className="rounded-3xl bg-stone-100/70 p-3 sm:p-4 border border-stone-200/80 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {LANES.map((lane) => {
                const laneList = laneOrders[lane.status] || [];
                return (
                  <div key={lane.status} className="flex flex-col min-w-0">
                    {/* Lane Header */}
                    <div className={cn('mb-3 flex items-center justify-between rounded-2xl border px-4 py-3 shadow-xs', lane.badgeBg)}>
                      <div className="flex items-center gap-2 text-sm font-black tracking-tight">
                        {lane.icon}
                        <span>{lane.label}</span>
                      </div>
                      <span className="rounded-full bg-white px-3 py-0.5 text-xs font-black text-stone-900 tabular-nums border border-stone-200 shadow-2xs">
                        {laneList.length}
                      </span>
                    </div>

                    {/* Lane Body */}
                    <div className="space-y-3.5 flex-1 min-h-[400px]">
                      {laneList.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white/60 px-4 py-12 text-center text-xs font-bold text-stone-400 flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="size-6 text-stone-300" />
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
          /* ── Grid Board Mode (Light Theme) ────────────────────────────────── */
          <div className="rounded-3xl bg-stone-100/70 p-4 border border-stone-200/80 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeOrders.length === 0 ? (
                <div className="col-span-full py-16 text-center text-stone-500 font-bold text-sm">
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

/** Individual Touch-Optimized Kitchen Ticket Card Component (Light Theme) */
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
        'rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between',
        status === 'pending'
          ? 'border-sky-300 shadow-sky-500/5'
          : status === 'preparing'
          ? 'border-amber-300 shadow-amber-500/5'
          : 'border-emerald-300 shadow-emerald-500/5'
      )}
    >
      <div>
        {/* Ticket Top Header */}
        <div className="flex items-start justify-between gap-2 border-b border-stone-200 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-stone-900 tracking-tight truncate">{order.id}</span>
              <Badge className={cn('uppercase text-[10px] font-extrabold px-2 py-0.5', getOrderTypeStyle(order.orderType))}>
                {order.orderType}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs font-bold text-stone-600 truncate">
              <span>{order.customerName || 'Walk-in Guest'}</span>
              {order.tableNumber && (
                <>
                  <span className="text-stone-400">·</span>
                  <span className="text-emerald-700 font-black">Table #{order.tableNumber}</span>
                </>
              )}
            </div>
          </div>
          {/* Live Timer */}
          <KitchenTimer placedAt={orderPlacedAt(order)} />
        </div>

        {/* Special Instructions / Notes Banner */}
        {order.notes && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-2 text-xs font-bold shadow-2xs">
            <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
            <span>Note: {order.notes}</span>
          </div>
        )}

        {/* Item List Checklist */}
        <div className="mt-3.5 space-y-2">
          {items.map((item, idx) => {
            const isChecked = checkedItems.has(idx);
            const qty = item.quantity || 1;
            const isMultiQty = qty > 1;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleItemCheck(idx)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-left transition-all border',
                  isChecked
                    ? 'bg-stone-100/60 border-stone-200 text-stone-400 line-through opacity-60'
                    : 'bg-stone-50/80 border-stone-200 text-stone-900 hover:border-stone-300 hover:bg-stone-100/80 shadow-2xs'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isChecked ? (
                    <CheckSquare className="size-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="size-4 text-stone-400 shrink-0" />
                  )}
                  <span className={cn('text-xs sm:text-sm font-extrabold truncate', isChecked ? 'text-stone-400' : 'text-stone-900')}>
                    {item.name}
                    {item.selectedPortion && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300 rounded-md">
                        {item.selectedPortion}
                      </span>
                    )}
                  </span>
                </div>
                <span
                  className={cn(
                    'shrink-0 font-black tabular-nums transition-transform',
                    isChecked
                      ? 'bg-stone-200 text-stone-500 text-xs px-2 py-0.5 rounded-md'
                      : isMultiQty
                      ? 'bg-amber-500 text-white text-xs px-2.5 py-0.5 rounded-lg shadow-xs border border-amber-600'
                      : 'bg-stone-100 text-stone-700 border border-stone-200 text-xs px-2.5 py-0.5 rounded-lg'
                  )}
                >
                  x{qty}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ticket Footer & Actions */}
      <div className="mt-4 pt-3 border-t border-stone-200 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-stone-500">
          <span className="flex items-center gap-1.5">
            <Utensils className="size-3.5 text-amber-600" />
            {items.length} items ({totalUnits} units)
          </span>
          <span className="font-black text-amber-800 tabular-nums">₹{order.grandTotal}</span>
        </div>

        {/* Action Bump Buttons */}
        <div className="flex items-center gap-2">
          {status !== 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegress}
              className="h-10 px-2.5 rounded-xl border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900"
              title="Move order back"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
          {lane.next && (
            <Button
              onClick={onAdvance}
              className={cn(
                'flex-1 h-10 rounded-xl text-xs font-black shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]',
                status === 'pending'
                  ? 'bg-sky-600 hover:bg-sky-700 text-white font-black'
                  : status === 'preparing'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white font-black'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white font-black'
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
