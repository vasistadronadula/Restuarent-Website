'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Volume2, VolumeX, Flame, CheckCircle2, Clock,
  Check, History, Undo2, Timer, Utensils,
  Maximize2, Minimize2, Search,
  AlertTriangle, RotateCcw, ChefHat, ListFilter,
  CheckSquare, Square, Hourglass, Phone, Calendar,
  TrendingUp,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

/* ------------------------------------------------------------------ */
/*  Audio                                                               */
/* ------------------------------------------------------------------ */

function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const playNote = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };
    playNote(659.25, 0, 0.2);
    playNote(880.00, 0.12, 0.35);
    playNote(1046.5, 0.28, 0.4);
  } catch {
    /* AudioContext blocked — silent */
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const getOrderStatus = (o: Order): OrderStatus => o.orderStatus || o.status || 'pending';

function parseOrderTimestamp(order: Order): number {
  if (order.createdAt) {
    const t = new Date(order.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (order.orderDate && order.orderTime) {
    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(order.orderDate);
    if (isIsoDate) {
      const timeClean = order.orderTime.includes(' ') ? order.orderTime : order.orderTime.padStart(5, '0');
      const t1 = new Date(`${order.orderDate}T${timeClean}`).getTime();
      if (!isNaN(t1) && t1 > 0) return t1;
    }
    const t2 = new Date(`${order.orderDate} ${order.orderTime}`).getTime();
    if (!isNaN(t2) && t2 > 0) return t2;
  }
  if (order.orderDate) {
    const t = new Date(order.orderDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (order.id && order.id.startsWith('PPR-ORD-')) {
    const parts = order.id.split('-');
    if (parts[2] && parts[2].length === 8) {
      const y = parts[2].slice(0, 4);
      const m = parts[2].slice(4, 6);
      const d = parts[2].slice(6, 8);
      const t = new Date(`${y}-${m}-${d}`).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
  }
  return Date.now();
}

function getTargetPrepMinutes(order: Order, prepTimeMap: Map<string, number>): number {
  const prepTimes = (order.items || []).map((item) => prepTimeMap.get(item.menuItemId) ?? 15);
  const basePrep = Math.max(...prepTimes, 12);
  return basePrep + (order.delayMinutes || 0);
}

/* ------------------------------------------------------------------ */
/*  KitchenTimer — per-card elapsed timer with colour stages           */
/* ------------------------------------------------------------------ */

function KitchenTimer({
  order,
  targetMinutes,
  onAdjust,
}: {
  order: Order;
  targetMinutes: number;
  onAdjust: () => void;
}) {
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    const orderTimestamp = parseOrderTimestamp(order);
    const update = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - orderTimestamp) / 1000));
      setSeconds(isNaN(elapsed) ? 0 : elapsed);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [order]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const targetSecs = targetMinutes * 60;
  const pct = Math.min(100, (seconds / Math.max(targetSecs, 1)) * 100);
  const isOverdue = mins >= targetMinutes;
  const isUrgent = !isOverdue && mins >= targetMinutes - 4;

  const ringColor = isOverdue
    ? 'stroke-rose-500'
    : isUrgent
    ? 'stroke-amber-500'
    : 'stroke-emerald-500';

  const bgRingColor = isOverdue ? 'stroke-rose-100' : isUrgent ? 'stroke-amber-100' : 'stroke-emerald-100';

  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <button
      type="button"
      onClick={onAdjust}
      title="Tap to adjust prep time"
      className={cn(
        'flex flex-col items-center gap-0.5 shrink-0 select-none transition-transform active:scale-95',
      )}
    >
      <div className="relative size-14">
        <svg className="size-14 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" className={bgRingColor} />
          <circle
            cx="24"
            cy="24"
            r={r}
            fill="none"
            strokeWidth="4"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-1000', ringColor, isOverdue && 'animate-pulse')}
          />
        </svg>
        <div className={cn(
          'absolute inset-0 flex flex-col items-center justify-center',
          isOverdue ? 'text-rose-700' : isUrgent ? 'text-amber-700' : 'text-stone-700',
        )}>
          <span className="font-mono text-[11px] font-black tabular-nums leading-none">{timeStr}</span>
          <span className="text-[8px] font-bold text-stone-400 leading-none mt-0.5">/{targetMinutes}m</span>
        </div>
      </div>
      {isOverdue && (
        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 rounded-full border border-rose-200 leading-4 animate-pulse">
          LATE
        </span>
      )}
      {isUrgent && !isOverdue && (
        <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 rounded-full border border-amber-200 leading-4">
          SOON
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Lane config                                                         */
/* ------------------------------------------------------------------ */

const LANES: {
  status: OrderStatus;
  label: string;
  icon: React.ReactNode;
  borderStyle: string;
  headerBg: string;
  dotColor: string;
  cta: string;
  next: OrderStatus;
  ctaClass: string;
}[] = [
  {
    status: 'pending',
    label: 'New Orders',
    icon: <Clock className="size-4" />,
    borderStyle: 'border-sky-200',
    headerBg: 'bg-sky-50 border-sky-200',
    dotColor: 'bg-sky-500',
    cta: 'Start Cooking',
    next: 'preparing',
    ctaClass: 'bg-sky-600 hover:bg-sky-700',
  },
  {
    status: 'preparing',
    label: 'Cooking on Stove',
    icon: <Flame className="size-4" />,
    borderStyle: 'border-amber-200',
    headerBg: 'bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
    cta: 'Mark Ready',
    next: 'ready',
    ctaClass: 'bg-amber-600 hover:bg-amber-700',
  },
  {
    status: 'ready',
    label: 'Ready for Pass',
    icon: <CheckCircle2 className="size-4" />,
    borderStyle: 'border-emerald-200',
    headerBg: 'bg-emerald-50 border-emerald-200',
    dotColor: 'bg-emerald-500',
    cta: 'Serve / Handover',
    next: 'delivered',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700',
  },
];

function getOrderTypeBadge(orderType?: string) {
  const type = (orderType || 'takeaway').toLowerCase();
  if (type.includes('dine')) return 'bg-emerald-100 text-emerald-900 border-emerald-300';
  if (type.includes('take') || type.includes('pick')) return 'bg-purple-100 text-purple-900 border-purple-300';
  return 'bg-blue-100 text-blue-900 border-blue-300';
}

/* ------------------------------------------------------------------ */
/*  Main KDS Page                                                       */
/* ------------------------------------------------------------------ */

export default function KitchenDisplayPage() {
  const { orders, menuItems, updateOrderStatus, updateOrderPrepTime, isLoadingDB } = useAdmin();
  const { userRole } = useAuth();
  const isChef = userRole === 'chef';

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showPrepMatrix, setShowPrepMatrix] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dine-in' | 'takeaway'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});

  // Live clock
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Delay dialog state
  const [delayDialogOpen, setDelayDialogOpen] = useState(false);
  const [selectedOrderForDelay, setSelectedOrderForDelay] = useState<Order | null>(null);
  const [customDelayMins, setCustomDelayMins] = useState<number>(10);
  const [delayReason, setDelayReason] = useState<string>('');
  const [isSavingDelay, setIsSavingDelay] = useState(false);

  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const hasSeededRef = useRef(false);

  useEffect(() => {
    if (isLoadingDB) return;
    if (!hasSeededRef.current) {
      orders.forEach((o) => seenOrderIdsRef.current.add(o.id));
      hasSeededRef.current = true;
      return;
    }
    const newOrders = orders.filter((o) => !seenOrderIdsRef.current.has(o.id));
    if (newOrders.length === 0) return;
    newOrders.forEach((o) => seenOrderIdsRef.current.add(o.id));
    if (isChef) {
      if (soundEnabled) playKitchenChime();
      toast.success('🔔 New ticket received in Kitchen');
    }
  }, [orders, isLoadingDB, isChef, soundEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    setCheckedItems((prev) => {
      const s = new Set(prev[orderId] || []);
      if (s.has(itemIdx)) s.delete(itemIdx); else s.add(itemIdx);
      return { ...prev, [orderId]: s };
    });
  };

  const prepTimeMap = useMemo(() => {
    const map = new Map<string, number>();
    menuItems.forEach((mi) => { if (mi.prepTime) map.set(mi.id, mi.prepTime); });
    return map;
  }, [menuItems]);

  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const s = getOrderStatus(o);
        if (s !== 'pending' && s !== 'preparing' && s !== 'ready') return false;
        if (typeFilter !== 'all') {
          const type = (o.orderType || 'takeaway').toLowerCase();
          if (typeFilter === 'dine-in' && !type.includes('dine')) return false;
          if (typeFilter === 'takeaway' && !type.includes('take') && !type.includes('pick')) return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.customerPhone && o.customerPhone.includes(q)) ||
          (o.tableNumber && o.tableNumber.toString().includes(q)) ||
          o.items?.some((i) => i.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => parseOrderTimestamp(a) - parseOrderTimestamp(b));
  }, [orders, searchQuery, typeFilter]);

  const laneOrders = useMemo(() => {
    const map: Record<string, Order[]> = { pending: [], preparing: [], ready: [] };
    for (const order of activeOrders) {
      const s = getOrderStatus(order);
      if (map[s]) map[s].push(order);
    }
    return map;
  }, [activeOrders]);

  const prepMatrix = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number }> = {};
    for (const o of activeOrders) {
      if (getOrderStatus(o) === 'ready') continue;
      for (const item of o.items || []) {
        const key = `${item.name}${item.selectedPortion ? ` (${item.selectedPortion})` : ''}`;
        if (!counts[key]) counts[key] = { name: key, quantity: 0 };
        counts[key].quantity += item.quantity || 1;
      }
    }
    return Object.values(counts).sort((a, b) => b.quantity - a.quantity);
  }, [activeOrders]);

  const historyOrders = useMemo(() => {
    return orders
      .filter((o) => { const s = getOrderStatus(o); return s === 'delivered' || s === 'cancelled'; })
      .slice(0, 20);
  }, [orders]);

  const handleAdvance = async (orderId: string, currentStatus: OrderStatus) => {
    const lane = LANES.find((l) => l.status === currentStatus);
    if (!lane) return;
    try {
      await updateOrderStatus(orderId, lane.next);
      if (soundEnabled && lane.next === 'ready') playKitchenChime();
      toast.success(`Order #${orderId.slice(-4)} → ${lane.next}`);
    } catch {
      toast.error('Failed to update status');
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
      toast.success(`Order #${orderId.slice(-4)} moved back to ${target}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const openDelayModal = (order: Order) => {
    setSelectedOrderForDelay(order);
    setCustomDelayMins(order.delayMinutes ? order.delayMinutes + 5 : 10);
    setDelayReason(order.notes || '');
    setDelayDialogOpen(true);
  };

  const handleSaveDelay = async () => {
    if (!selectedOrderForDelay) return;
    setIsSavingDelay(true);
    try {
      await updateOrderPrepTime(selectedOrderForDelay.id, customDelayMins, delayReason);
      toast.success(`#${selectedOrderForDelay.id.slice(-4)} prep time → +${customDelayMins}m. Customer notified!`);
      setDelayDialogOpen(false);
    } catch {
      toast.error('Failed to set delay');
    } finally {
      setIsSavingDelay(false);
    }
  };

  return (
    <AdminLayout title="Kitchen Display System">
      <div className="space-y-4 w-full max-w-full text-stone-900">

        {/* ── Top KDS Command Bar ── */}
        <div className="bg-stone-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-stone-800">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">

            {/* Left — branding + live clock + stat pills */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-md shrink-0">
                  <ChefHat className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black tracking-tight text-white">Kitchen Display</h1>
                    <span className="font-mono text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full animate-pulse">
                      LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Calendar className="size-3 text-stone-400" />
                    <span className="text-xs text-stone-400 font-medium">{currentDate}</span>
                    <span className="text-stone-600">·</span>
                    <span className="font-mono text-sm text-amber-300 font-black tabular-nums">{currentTime || '00:00:00'}</span>
                  </div>
                </div>
              </div>

              {/* Stat Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-sky-500/15 border border-sky-500/30 rounded-xl px-3 py-1.5">
                  <Clock className="size-3.5 text-sky-400" />
                  <span className="text-xs font-black text-sky-300 tabular-nums">{laneOrders.pending?.length ?? 0}</span>
                  <span className="text-[10px] text-sky-400/70 font-semibold">New</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-1.5">
                  <Flame className="size-3.5 text-amber-400" />
                  <span className="text-xs font-black text-amber-300 tabular-nums">{laneOrders.preparing?.length ?? 0}</span>
                  <span className="text-[10px] text-amber-400/70 font-semibold">Cooking</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3 py-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-300 tabular-nums">{laneOrders.ready?.length ?? 0}</span>
                  <span className="text-[10px] text-emerald-400/70 font-semibold">Ready</span>
                </div>
              </div>

              {/* Type Filter */}
              <div className="flex bg-stone-800 p-1 rounded-xl border border-stone-700">
                {(['all', 'dine-in', 'takeaway'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all',
                      typeFilter === t ? 'bg-amber-500 text-stone-950 shadow-xs' : 'text-stone-400 hover:text-white'
                    )}
                  >
                    {t === 'all' ? 'All' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Right — search + controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                <Input
                  placeholder="Search ticket, dish, table…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 pr-3 text-xs bg-stone-800 border-stone-700 text-white rounded-xl focus-visible:ring-amber-500 placeholder:text-stone-500"
                />
              </div>

              <button
                onClick={() => setShowPrepMatrix(!showPrepMatrix)}
                title="Batch Prep Summary"
                className={cn(
                  'h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5',
                  showPrepMatrix ? 'bg-amber-500 text-stone-950 border-amber-400' : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-700'
                )}
              >
                <ListFilter className="size-4" />
                Batch ({prepMatrix.length})
              </button>

              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  'h-10 px-3.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5',
                  showHistory ? 'bg-amber-600 text-white border-amber-500' : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-700'
                )}
              >
                <History className="size-4" /> History
              </button>

              <button
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) playKitchenChime();
                }}
                title={soundEnabled ? 'Chime on — tap to mute' : 'Muted — tap to enable'}
                className={cn(
                  'h-10 px-3 rounded-xl border transition-all',
                  soundEnabled ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-stone-700 bg-stone-800 text-stone-500'
                )}
              >
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>

              <button
                onClick={toggleFullscreen}
                title="Fullscreen"
                className="h-10 px-3 rounded-xl border border-stone-700 bg-stone-800 text-stone-400 hover:bg-stone-700"
              >
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Batch Prep Ribbon ── */}
        {showPrepMatrix && prepMatrix.length > 0 && !showHistory && (
          <div className="p-4 rounded-3xl bg-amber-500/10 border-2 border-amber-400/40 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="size-4 text-amber-700" />
              <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                Batch Prep — combined counts across active tickets
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {prepMatrix.map((item) => (
                <div key={item.name} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-amber-200 shadow-2xs">
                  <span className="text-xs font-bold text-stone-900">{item.name}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-stone-950 text-xs font-black tabular-nums font-mono">
                    ×{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Display ── */}
        {showHistory ? (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <History className="size-4 text-stone-500" /> Recently Completed Tickets
              </h3>
              <span className="text-xs text-stone-400 font-semibold">{historyOrders.length} orders</span>
            </div>
            <div className="divide-y divide-stone-100">
              {historyOrders.length === 0 ? (
                <p className="py-12 text-center text-sm text-stone-400">No recently completed tickets.</p>
              ) : (
                historyOrders.map((o) => {
                  const s = getOrderStatus(o);
                  return (
                    <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-stone-50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg">
                            #{o.id.slice(-4)}
                          </span>
                          <span className="font-mono text-xs text-stone-400">{o.id}</span>
                          <Badge variant="outline" className={cn('uppercase text-[10px] font-bold border', getOrderTypeBadge(o.orderType))}>
                            {o.orderType}
                          </Badge>
                          {o.tableNumber && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              Table #{o.tableNumber}
                            </span>
                          )}
                          <span className={cn(
                            'text-[10px] font-black uppercase px-2 py-0.5 rounded-full border',
                            s === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          )}>
                            {s}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1.5 truncate max-w-lg">
                          <span className="font-bold text-stone-700">{o.customerName || 'Walk-in'}</span>
                          {o.customerPhone ? ` · ${o.customerPhone}` : ''} —{' '}
                          {o.items?.map((i) => `${i.name} ×${i.quantity || 1}`).join(', ')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRegress(o.id, s)}
                        variant="outline"
                        className="h-9 rounded-xl text-xs font-bold shrink-0 border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        <Undo2 className="size-3.5 mr-1" /> Recall Ticket
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {LANES.map((lane) => {
              const laneList = laneOrders[lane.status] || [];
              return (
                <div key={lane.status} className="flex flex-col min-w-0">
                  {/* Lane Header */}
                  <div className={cn('mb-4 flex items-center justify-between px-4 py-3 rounded-2xl border', lane.headerBg)}>
                    <div className="flex items-center gap-2">
                      <span className={cn('flex size-2 rounded-full', lane.dotColor)} />
                      <div className="flex items-center gap-1.5 text-sm font-black text-stone-900">
                        {lane.icon}
                        {lane.label}
                      </div>
                    </div>
                    <span className="text-xs font-black tabular-nums font-mono bg-white/70 border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs">
                      {laneList.length}
                    </span>
                  </div>

                  {/* Lane Cards */}
                  <div className="space-y-4 min-h-[380px]">
                    {laneList.length === 0 ? (
                      <div className="rounded-3xl border-2 border-dashed border-stone-200 px-4 py-16 text-center">
                        <div className="text-2xl mb-1">🍽️</div>
                        <p className="text-xs text-stone-400 font-medium">No orders in this stage</p>
                      </div>
                    ) : (
                      laneList.map((order) => (
                        <TicketCard
                          key={order.id}
                          order={order}
                          lane={lane}
                          targetMinutes={getTargetPrepMinutes(order, prepTimeMap)}
                          checkedItems={checkedItems[order.id] || new Set()}
                          onToggleItemCheck={(idx) => toggleItemCheck(order.id, idx)}
                          onAdvance={() => handleAdvance(order.id, getOrderStatus(order))}
                          onRegress={() => handleRegress(order.id, getOrderStatus(order))}
                          onOpenDelay={() => openDelayModal(order)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delay / Prep Time Dialog ── */}
      <Dialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-950 font-black">
              <Hourglass className="size-5 text-amber-600" />
              Extend Cooking / Prep Time
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Set additional prep time for ticket #{selectedOrderForDelay?.id.slice(-4)}.
              This instantly updates the customer live tracking screen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black text-stone-700 block mb-2">Quick Extend</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 25].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCustomDelayMins(mins)}
                    className={cn(
                      'py-3 rounded-xl text-xs font-black border transition-all',
                      customDelayMins === mins
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    )}
                  >
                    +{mins}m
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">Custom Extension (Minutes)</label>
              <Input
                type="number"
                min={0}
                max={120}
                value={customDelayMins}
                onChange={(e) => setCustomDelayMins(parseInt(e.target.value, 10) || 0)}
                className="h-10 text-sm font-bold text-stone-900 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-black text-stone-700 block mb-1.5">Kitchen Note (Optional)</label>
              <Input
                placeholder="e.g. High rush / Slow simmering spices"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDelayDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDelay}
              disabled={isSavingDelay}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black shadow-xs"
            >
              {isSavingDelay ? 'Updating…' : 'Save & Notify Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  TicketCard                                                          */
/* ------------------------------------------------------------------ */

function TicketCard({
  order,
  lane,
  targetMinutes,
  checkedItems,
  onToggleItemCheck,
  onAdvance,
  onRegress,
  onOpenDelay,
}: {
  order: Order;
  lane: typeof LANES[number];
  targetMinutes: number;
  checkedItems: Set<number>;
  onToggleItemCheck: (idx: number) => void;
  onAdvance: () => void;
  onRegress: () => void;
  onOpenDelay: () => void;
}) {
  const items = order.items || [];
  const totalUnits = items.reduce((s, it) => s + (it.quantity || 1), 0);
  const checkedCount = checkedItems.size;
  const allChecked = checkedCount === items.length && items.length > 0;
  const status = getOrderStatus(order);
  const hasDelay = (order.delayMinutes || 0) > 0;
  const tokenNumber = order.id.slice(-4);

  return (
    <div className={cn(
      'rounded-3xl bg-white flex flex-col justify-between shadow-xs transition-all hover:shadow-md border-2',
      status === 'pending' ? 'border-sky-200' : status === 'preparing' ? 'border-amber-200' : 'border-emerald-200'
    )}>
      {/* Card Header */}
      <div className={cn(
        'px-4 pt-4 pb-3 border-b',
        status === 'pending' ? 'border-sky-100' : status === 'preparing' ? 'border-amber-100' : 'border-emerald-100'
      )}>
        <div className="flex items-start justify-between gap-3">
          {/* Token + customer info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Large token badge */}
              <span className={cn(
                'font-mono text-xl font-black px-3 py-1 rounded-xl border-2 tracking-tight',
                status === 'pending' ? 'text-sky-700 bg-sky-50 border-sky-200'
                : status === 'preparing' ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              )}>
                #{tokenNumber}
              </span>
              <Badge variant="outline" className={cn('uppercase text-[10px] font-black px-2 py-0.5 rounded-lg border', getOrderTypeBadge(order.orderType))}>
                {order.orderType || 'takeaway'}
              </Badge>
              {order.tableNumber && (
                <span className="text-emerald-900 font-black bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300 text-xs">
                  Table #{order.tableNumber}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-600">
              <span className="font-black text-stone-900 text-sm">{order.customerName || 'Walk-in'}</span>
              {order.customerPhone && (
                <span className="text-stone-400 flex items-center gap-0.5 font-mono">
                  <Phone className="size-2.5" /> {order.customerPhone}
                </span>
              )}
            </div>
          </div>

          {/* Circular timer */}
          <KitchenTimer order={order} targetMinutes={targetMinutes} onAdjust={onOpenDelay} />
        </div>

        {/* Progress bar — dish checklist completion */}
        {items.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 mb-1">
              <span>{checkedCount} of {items.length} dishes checked</span>
              {allChecked && <span className="text-emerald-600">✓ All done</span>}
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  allChecked ? 'bg-emerald-500' : 'bg-amber-500'
                )}
                style={{ width: `${(checkedCount / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 space-y-2 flex-1">
        {/* Delay banner */}
        {hasDelay && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
            <Hourglass className="size-3.5 text-amber-600 shrink-0" />
            Delay Active: +{order.delayMinutes} mins
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
            <AlertTriangle className="size-3.5 shrink-0 text-rose-500 mt-0.5" />
            <span className="font-bold">{order.notes}</span>
          </div>
        )}

        {/* Dish Checklist */}
        <div className="space-y-1.5">
          {items.map((item, idx) => {
            const isChecked = checkedItems.has(idx);
            const qty = item.quantity || 1;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleItemCheck(idx)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all border',
                  isChecked
                    ? 'bg-stone-50 border-stone-200 opacity-60 line-through'
                    : 'bg-white border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isChecked
                    ? <CheckSquare className="size-4.5 text-emerald-600 shrink-0" />
                    : <Square className="size-4.5 text-stone-300 shrink-0" />
                  }
                  <span className="text-sm font-bold text-stone-900 truncate">
                    {item.name}
                    {item.selectedPortion && (
                      <span className="ml-1.5 text-[9px] uppercase bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 font-black">
                        {item.selectedPortion}
                      </span>
                    )}
                  </span>
                </div>
                <span className={cn(
                  'shrink-0 text-xs font-black tabular-nums px-2.5 py-1 rounded-lg font-mono',
                  isChecked ? 'bg-stone-200 text-stone-400' : 'bg-amber-500 text-stone-950'
                )}>
                  ×{qty}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 pb-4 pt-3 border-t border-stone-100 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400 flex items-center gap-1 font-medium">
            <Utensils className="size-3.5" />
            {items.length} dishes · {totalUnits} items
          </span>
          <span className="font-black text-stone-900 tabular-nums text-sm">
            {formatCurrency(order.grandTotal)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Regress */}
          {status !== 'pending' && (
            <button
              type="button"
              onClick={onRegress}
              title="Move back"
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-100 transition-all shrink-0"
            >
              <RotateCcw className="size-4" />
            </button>
          )}

          {/* Advance CTA */}
          <button
            type="button"
            onClick={onAdvance}
            className={cn(
              'flex-1 h-10 rounded-xl text-xs font-black text-white transition-all flex items-center justify-center gap-1.5 shadow-xs',
              lane.ctaClass
            )}
          >
            <Check className="size-4" />
            {lane.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
