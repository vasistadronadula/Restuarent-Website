'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';

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
    /* AudioContext blocked */
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

function getOrderTypeBadge(orderType?: string) {
  const type = (orderType || 'takeaway').toLowerCase();
  if (type.includes('dine')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (type.includes('take') || type.includes('pick')) return 'bg-purple-100 text-purple-800 border-purple-300';
  return 'bg-blue-100 text-blue-800 border-blue-300';
}

/* ------------------------------------------------------------------ */
/*  KitchenTimer — compact circular timer                              */
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

  const ringColor = isOverdue ? 'stroke-rose-500' : isUrgent ? 'stroke-amber-500' : 'stroke-emerald-500';
  const bgRingColor = isOverdue ? 'stroke-rose-100' : isUrgent ? 'stroke-amber-100' : 'stroke-emerald-100';
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <button
      type="button"
      onClick={onAdjust}
      title="Tap to adjust prep time"
      className="flex flex-col items-center gap-0.5 shrink-0 select-none transition-transform active:scale-95"
    >
      <div className="relative size-12">
        <svg className="size-12 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className={bgRingColor} />
          <circle
            cx="22" cy="22" r={r}
            fill="none" strokeWidth="4"
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
          <span className="font-mono text-[10px] font-black tabular-nums leading-none">{timeStr}</span>
          <span className="text-[8px] font-bold text-stone-400 leading-none">{targetMinutes}m</span>
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
  tabLabel: string;
  icon: React.ReactNode;
  cardBg: string;
  headerBg: string;
  headerText: string;
  dotColor: string;
  cta: string;
  next: OrderStatus;
  ctaBg: string;
}[] = [
  {
    status: 'pending',
    label: 'New Orders',
    tabLabel: 'New',
    icon: <Clock className="size-4" />,
    cardBg: 'bg-white border-sky-200',
    headerBg: 'bg-sky-500',
    headerText: 'text-white',
    dotColor: 'bg-sky-500',
    cta: 'Start Cooking',
    next: 'preparing',
    ctaBg: 'bg-sky-500 hover:bg-sky-600 active:bg-sky-700',
  },
  {
    status: 'preparing',
    label: 'Cooking',
    tabLabel: 'Cooking',
    icon: <Flame className="size-4" />,
    cardBg: 'bg-white border-amber-200',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    dotColor: 'bg-amber-500',
    cta: 'Mark Ready',
    next: 'ready',
    ctaBg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
  },
  {
    status: 'ready',
    label: 'Ready',
    tabLabel: 'Ready',
    icon: <CheckCircle2 className="size-4" />,
    cardBg: 'bg-white border-emerald-200',
    headerBg: 'bg-emerald-500',
    headerText: 'text-white',
    dotColor: 'bg-emerald-500',
    cta: 'Serve / Handover',
    next: 'delivered',
    ctaBg: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700',
  },
];

/* ------------------------------------------------------------------ */
/*  Main KDS Page                                                       */
/* ------------------------------------------------------------------ */

export default function KitchenDisplayPage() {
  const { orders, menuItems, updateOrderStatus, updateOrderPrepTime, isLoadingDB } = useAdmin();
  const { userRole } = useAuth();
  const isChef = userRole === 'chef';

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dine-in' | 'takeaway'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});
  // Mobile lane tab (0=pending, 1=preparing, 2=ready)
  const [mobileLaneIdx, setMobileLaneIdx] = useState(0);

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

  // Delay dialog
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
      .slice(0, 30);
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
      toast.success(`#${orderId.slice(-4)} moved back to ${target}`);
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

  /* ---------------------------------------------------------------- */
  /*  Mobile active lane                                               */
  /* ---------------------------------------------------------------- */
  const mobileLane = LANES[mobileLaneIdx];
  const mobileLaneList = laneOrders[mobileLane.status] || [];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <AdminLayout title="Kitchen Display">
      <div className="flex flex-col h-[var(--admin-content-h)] w-full bg-gray-950 text-white overflow-hidden">

        {/* ── Slim Top Bar ── */}
        <div className="bg-gray-900 border-b border-gray-800 px-3 sm:px-5 py-3 flex items-center justify-between gap-3 shrink-0">

          {/* Left: Branding + clock + lane counts */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-gray-950 flex items-center justify-center shrink-0">
              <ChefHat className="size-5" />
            </div>

            {/* Clock — hidden on very small screens */}
            <div className="hidden sm:block shrink-0">
              <div className="font-mono text-lg font-black text-amber-300 tabular-nums leading-none">
                {currentTime || '00:00:00'}
              </div>
              <div className="text-[10px] text-gray-500 font-medium">{currentDate}</div>
            </div>

            {/* Lane count pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {LANES.map((lane) => {
                const count = (laneOrders[lane.status] || []).length;
                return (
                  <div
                    key={lane.status}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-black',
                      lane.status === 'pending'
                        ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                        : lane.status === 'preparing'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    )}
                  >
                    {lane.icon}
                    <span className="tabular-nums">{count}</span>
                    <span className="hidden sm:inline text-[10px] opacity-70">{lane.tabLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Type filter */}
            <div className="hidden sm:flex bg-gray-800 rounded-xl p-1 border border-gray-700 gap-0.5">
              {(['all', 'dine-in', 'takeaway'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all',
                    typeFilter === t ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-white'
                  )}
                >
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-500" />
              <Input
                placeholder="Search ticket…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs w-36 bg-gray-800 border-gray-700 text-white rounded-xl placeholder:text-gray-600 focus-visible:ring-amber-500/50"
              />
            </div>

            {/* Batch */}
            <button
              onClick={() => setShowBatch(!showBatch)}
              className={cn(
                'h-8 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all',
                showBatch ? 'bg-amber-500 text-gray-950 border-amber-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              )}
            >
              <ListFilter className="size-3.5" />
              <span className="hidden sm:inline">Batch</span>
              {prepMatrix.length > 0 && (
                <span className="bg-white/20 text-inherit rounded-full px-1 text-[10px]">{prepMatrix.length}</span>
              )}
            </button>

            {/* History */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'h-8 px-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all',
                showHistory ? 'bg-amber-600 text-white border-amber-500' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              )}
            >
              <History className="size-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Sound */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playKitchenChime();
              }}
              className={cn(
                'h-8 w-8 rounded-xl border flex items-center justify-center transition-all',
                soundEnabled ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-gray-700 bg-gray-800 text-gray-500'
              )}
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="h-8 w-8 rounded-xl border border-gray-700 bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition-all"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>

        {/* ── Batch Prep Strip ── */}
        {showBatch && prepMatrix.length > 0 && !showHistory && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="size-3.5 text-amber-400" />
              <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                Batch Cook — totals across active tickets
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {prepMatrix.map((item) => (
                <div key={item.name} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800 border border-amber-500/30">
                  <span className="text-xs font-bold text-white">{item.name}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-gray-950 text-xs font-black tabular-nums">
                    ×{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <div className="flex-1 min-h-0 overflow-hidden">

          {showHistory ? (
            /* ── History View ── */
            <div className="h-full overflow-y-auto p-4">
              <div className="max-w-4xl mx-auto bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <History className="size-4 text-gray-400" />
                    Recently Completed Tickets
                  </h3>
                  <span className="text-xs text-gray-500">{historyOrders.length} orders</span>
                </div>
                <div className="divide-y divide-gray-800">
                  {historyOrders.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-500">No recently completed tickets.</p>
                  ) : (
                    historyOrders.map((o) => {
                      const s = getOrderStatus(o);
                      return (
                        <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-gray-800/50 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-base font-black text-white bg-gray-800 px-2.5 py-1 rounded-lg">
                                #{o.id.slice(-4)}
                              </span>
                              <span className={cn(
                                'text-[10px] font-black uppercase px-2 py-0.5 rounded-full border',
                                s === 'delivered' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              )}>
                                {s}
                              </span>
                              <span className={cn('text-[10px] font-bold border px-2 py-0.5 rounded-lg', getOrderTypeBadge(o.orderType))}>
                                {o.orderType || 'takeaway'}
                              </span>
                              {o.tableNumber && (
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                                  Table #{o.tableNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5 truncate max-w-lg">
                              <span className="font-bold text-gray-300">{o.customerName || 'Walk-in'}</span>
                              {' '}— {o.items?.map((i) => `${i.name} ×${i.quantity || 1}`).join(', ')}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRegress(o.id, s)}
                            className="h-9 px-4 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                          >
                            <Undo2 className="size-3.5" /> Recall
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Desktop: 3-column Kanban ── */}
              <div className="hidden md:grid md:grid-cols-3 h-full gap-0 divide-x divide-gray-800">
                {LANES.map((lane) => {
                  const laneList = laneOrders[lane.status] || [];
                  return (
                    <div key={lane.status} className="flex flex-col h-full min-w-0">
                      {/* Lane header */}
                      <div className={cn('px-4 py-3 flex items-center justify-between shrink-0', lane.headerBg)}>
                        <div className="flex items-center gap-2 font-black text-sm text-white">
                          {lane.icon}
                          {lane.label}
                        </div>
                        <span className="font-mono text-base font-black text-white/90 bg-white/20 px-2.5 py-0.5 rounded-full">
                          {laneList.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-gray-950/50">
                        {laneList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                            <div className="text-3xl mb-2">🍽️</div>
                            <p className="text-xs font-medium">No orders here</p>
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

              {/* ── Mobile: Tab switcher ── */}
              <div className="md:hidden flex flex-col h-full">
                {/* Tab bar */}
                <div className="flex bg-gray-900 border-b border-gray-800 shrink-0">
                  {LANES.map((lane, idx) => {
                    const count = (laneOrders[lane.status] || []).length;
                    const isActive = mobileLaneIdx === idx;
                    return (
                      <button
                        key={lane.status}
                        onClick={() => setMobileLaneIdx(idx)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-b-2',
                          isActive
                            ? lane.status === 'pending'
                              ? 'border-sky-500 text-sky-300'
                              : lane.status === 'preparing'
                              ? 'border-amber-500 text-amber-300'
                              : 'border-emerald-500 text-emerald-300'
                            : 'border-transparent text-gray-500'
                        )}
                      >
                        {lane.icon}
                        {lane.tabLabel}
                        {count > 0 && (
                          <span className={cn(
                            'text-[10px] font-black px-1.5 py-0.5 rounded-full',
                            isActive
                              ? lane.status === 'pending' ? 'bg-sky-500 text-white'
                                : lane.status === 'preparing' ? 'bg-amber-500 text-gray-950'
                                : 'bg-emerald-500 text-white'
                              : 'bg-gray-700 text-gray-400'
                          )}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active lane cards */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-gray-950/60">
                  {mobileLaneList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                      <div className="text-3xl mb-2">🍽️</div>
                      <p className="text-xs font-medium">No orders in {mobileLane.label}</p>
                    </div>
                  ) : (
                    mobileLaneList.map((order) => (
                      <TicketCard
                        key={order.id}
                        order={order}
                        lane={mobileLane}
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
            </>
          )}
        </div>
      </div>

      {/* ── Delay Dialog ── */}
      <Dialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white font-black">
              <Hourglass className="size-5 text-amber-500" />
              Extend Prep Time
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              For ticket #{selectedOrderForDelay?.id.slice(-4)}. Customer tracking is updated instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-black text-gray-300 block mb-2">Quick Extend</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 25].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCustomDelayMins(mins)}
                    className={cn(
                      'py-3 rounded-xl text-sm font-black border transition-all',
                      customDelayMins === mins
                        ? 'bg-amber-500 text-gray-950 border-amber-500 shadow-md'
                        : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                    )}
                  >
                    +{mins}m
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-gray-300 block mb-1.5">Custom Minutes</label>
              <Input
                type="number"
                min={0}
                max={120}
                value={customDelayMins}
                onChange={(e) => setCustomDelayMins(parseInt(e.target.value, 10) || 0)}
                className="h-10 text-sm font-bold bg-gray-800 border-gray-700 text-white rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-300 block mb-1.5">Kitchen Note (Optional)</label>
              <Input
                placeholder="e.g. Rush hour / Slow-simmering spices"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="h-10 text-xs bg-gray-800 border-gray-700 text-white rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setDelayDialogOpen(false)}
              className="flex-1 h-10 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDelay}
              disabled={isSavingDelay}
              className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-sm transition-all disabled:opacity-50"
            >
              {isSavingDelay ? 'Saving…' : 'Save & Notify'}
            </button>
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
    <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shadow-lg">

      {/* Card Header */}
      <div className={cn('px-4 py-3', lane.headerBg)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Large token */}
            <span className="font-mono text-2xl font-black text-white tracking-tight">
              #{tokenNumber}
            </span>
            <span className={cn('text-[10px] font-black uppercase border px-2 py-0.5 rounded-lg', getOrderTypeBadge(order.orderType))}>
              {order.orderType || 'takeaway'}
            </span>
            {order.tableNumber && (
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg">
                Table #{order.tableNumber}
              </span>
            )}
          </div>
          <KitchenTimer order={order} targetMinutes={targetMinutes} onAdjust={onOpenDelay} />
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/70">
          <span className="font-bold text-white/90">{order.customerName || 'Walk-in'}</span>
          {order.customerPhone && (
            <span className="flex items-center gap-0.5 font-mono">
              <Phone className="size-2.5" /> {order.customerPhone}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', allChecked ? 'bg-white' : 'bg-white/60')}
                style={{ width: `${(checkedCount / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 space-y-2">
        {/* Banners */}
        {hasDelay && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Hourglass className="size-3.5 shrink-0" />
            Delay Active: +{order.delayMinutes} mins
          </div>
        )}
        {order.notes && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
            <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
            {order.notes}
          </div>
        )}

        {/* Dish checklist */}
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
                    ? 'bg-gray-800/50 border-gray-700 opacity-60 line-through'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isChecked
                    ? <CheckSquare className="size-5 text-emerald-500 shrink-0" />
                    : <Square className="size-5 text-gray-600 shrink-0" />
                  }
                  <span className="text-sm font-bold text-gray-100 truncate">
                    {item.name}
                    {item.selectedPortion && (
                      <span className="ml-1.5 text-[9px] uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 font-black">
                        {item.selectedPortion}
                      </span>
                    )}
                  </span>
                </div>
                <span className={cn(
                  'shrink-0 text-sm font-black tabular-nums px-2.5 py-1 rounded-lg font-mono',
                  isChecked ? 'bg-gray-700 text-gray-500' : 'bg-amber-500 text-gray-950'
                )}>
                  ×{qty}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Utensils className="size-3.5" />
            {items.length} dishes · {totalUnits} items
          </span>
          <span className="font-black text-gray-300 tabular-nums text-sm">
            {formatCurrency(order.grandTotal)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status !== 'pending' && (
            <button
              type="button"
              onClick={onRegress}
              title="Move back"
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all shrink-0"
            >
              <RotateCcw className="size-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onAdvance}
            className={cn(
              'flex-1 h-11 rounded-xl text-sm font-black text-white transition-all flex items-center justify-center gap-2 shadow-md',
              lane.ctaBg
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
