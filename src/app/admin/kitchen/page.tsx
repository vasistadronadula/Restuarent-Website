'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';
import { HairlineGrid, StatCell } from '@/components/admin/ui';
import {
  Volume2, VolumeX, Flame, CheckCircle2, Clock,
  Check, History, Undo2, Utensils,
  Maximize2, Minimize2, Search, X,
  AlertTriangle, RotateCcw, ChefHat, ListFilter,
  CheckSquare, Square, Hourglass, Phone,
  Sparkles, Layers, Coffee, Settings, HelpCircle,
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

/* ================================================================== */
/*  Web Audio API Synthesis — Multi-Tone Crystal Clear Chimes         */
/* ================================================================== */

function playKitchenChime(type: 'new_order' | 'ready' | 'alert' = 'new_order') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'new_order') {
      const playNote = (freq: number, delay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };
      playNote(523.25, 0, 0.18);      // C5
      playNote(659.25, 0.12, 0.22);   // E5
      playNote(783.99, 0.24, 0.25);   // G5
      playNote(1046.50, 0.38, 0.4);   // C6
    } else if (type === 'ready') {
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
      playNote(880.00, 0, 0.2);       // A5
      playNote(1174.66, 0.15, 0.35);  // D6
    } else {
      // Alert chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    /* AudioContext blocked by browser policy */
  }
}

/* ================================================================== */
/*  Helpers & Time Calculations                                       */
/* ================================================================== */

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

/**
 * Order type is context, not urgency, so it renders as a plain outline tag.
 * The only colour on a ticket is the accent, and the accent means "late".
 */
function getOrderTypeBadge() {
  return 'ad-tag ad-tag-outline';
}

/* Keyboard commands, printed by the cheat-sheet dialog and bound in an effect. */
const SHORTCUTS: readonly [string, string][] = [
  ['Switch to new orders', '1'],
  ['Switch to in preparation', '2'],
  ['Switch to ready to pass', '3'],
  ['Focus search', '/'],
  ['Toggle fullscreen', 'F'],
  ['Toggle sound alerts', 'M'],
  ['Toggle batch prep', 'B'],
];

/* Kitchen Stations definition */
const STATIONS = [
  { id: 'all', label: 'All Stations', icon: Layers },
  { id: 'biryani', label: 'Biryani & Rice', match: ['biryani', 'rice', 'pulao'], icon: Flame },
  { id: 'starters', label: 'Starters & Tandoor', match: ['starter', 'tandoor', 'kebab', 'tikka', 'fry', 'chinese'], icon: Utensils },
  { id: 'curries', label: 'Curries & Gravies', match: ['curry', 'gravy', 'masala', 'dal', 'paneer'], icon: Sparkles },
  { id: 'beverages', label: 'Drinks & Desserts', match: ['beverage', 'drink', 'dessert', 'sweet', 'ice cream', 'coffee', 'tea'], icon: Coffee },
];

/* ================================================================== */
/*  Lane Configurations — Crisp High-Contrast Light Theme             */
/* ================================================================== */

/**
 * The three lanes.
 *
 * Lanes are told apart by position and by their count chip, not by a colour
 * each — the accent is reserved for the pass (where a plate is going cold) and
 * for late tickets. `isPass` drives both.
 */
const LANES: {
  status: OrderStatus;
  label: string;
  tabLabel: string;
  icon: React.ReactNode;
  ctaText: string;
  next: OrderStatus;
  isPass: boolean;
}[] = [
  {
    status: 'pending',
    label: 'New orders',
    tabLabel: 'New tickets',
    icon: <Clock className="size-4" />,
    ctaText: 'Start cooking',
    next: 'preparing',
    isPass: false,
  },
  {
    status: 'preparing',
    label: 'In preparation',
    tabLabel: 'On the stove',
    icon: <Flame className="size-4" />,
    ctaText: 'Mark ready',
    next: 'ready',
    isPass: false,
  },
  {
    status: 'ready',
    label: 'Ready to pass',
    tabLabel: 'Ready for pickup',
    icon: <CheckCircle2 className="size-4" />,
    ctaText: 'Serve / hand over',
    next: 'delivered',
    isPass: true,
  },
];

/* ================================================================== */
/*  KitchenTimer Component — High-Visibility Progress Dial            */
/* ================================================================== */

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
  const targetSecs = Math.max(targetMinutes * 60, 1);
  const pct = Math.min(100, (seconds / targetSecs) * 100);
  const isOverdue = mins >= targetMinutes;
  const isUrgent = !isOverdue && mins >= targetMinutes - 3;

  // On target the dial is ink; from three minutes out it goes accent. Two
  // states, both readable across a hot kitchen at arm's length.
  const ringColor = isOverdue || isUrgent ? 'var(--ad-accent)' : 'var(--ad-ink)';
  const bgRingColor = isOverdue || isUrgent ? 'var(--ad-a200)' : 'var(--ad-n200)';

  const r = 19;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <button
      type="button"
      onClick={onAdjust}
      title="Tap to extend or adjust prep time"
      className="flex flex-col items-center gap-0.5 shrink-0 select-none transition-transform active:scale-95 group"
    >
      <div className="relative size-13.5">
        <svg className="size-13.5 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4.5" stroke={bgRingColor} />
          <circle
            cx="24"
            cy="24"
            r={r}
            fill="none"
            strokeWidth="4.5"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            stroke={ringColor}
            className={cn('transition-all duration-1000', isOverdue && 'animate-pulse')}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="ad-num text-[13px] leading-none"
            style={{ color: isOverdue || isUrgent ? 'var(--ad-a700)' : 'var(--ad-ink)' }}
          >
            {timeStr}
          </span>
          <span className="text-[9px] ad-muted leading-none mt-0.5">/{targetMinutes}m</span>
        </div>
      </div>
      {isOverdue && (
        <span className="ad-tag ad-tag-accent text-[9px] px-2 animate-pulse">Late</span>
      )}
      {isUrgent && !isOverdue && (
        <span className="ad-tag ad-tag-accent text-[9px] px-2">Expediting</span>
      )}
    </button>
  );
}

/* ================================================================== */
/*  Main Kitchen Display System (Light Theme Only)                    */
/* ================================================================== */

export default function KitchenDisplayPage() {
  const { orders, menuItems, updateOrderStatus, updateOrderPrepTime, isLoadingDB } = useAdmin();
  const { userRole } = useAuth();
  const isChef = userRole === 'chef';

  /* UI State */
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dine-in' | 'takeaway'>('all');
  const [sortMode, setSortMode] = useState<'fifo' | 'waiting' | 'table'>('fifo');
  const [viewLayout, setViewLayout] = useState<'kanban' | 'dense_grid'>('kanban');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});
  const [mobileLaneIdx, setMobileLaneIdx] = useState(0);

  /* Live Clock */
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  /* Delay / Prep Extension Dialog */
  const [delayDialogOpen, setDelayDialogOpen] = useState(false);
  const [selectedOrderForDelay, setSelectedOrderForDelay] = useState<Order | null>(null);
  const [customDelayMins, setCustomDelayMins] = useState<number>(10);
  const [delayReason, setDelayReason] = useState<string>('');
  const [isSavingDelay, setIsSavingDelay] = useState(false);

  /* Chef Notes Dialog */
  const [chefNoteDialogOpen, setChefNoteDialogOpen] = useState(false);
  const [selectedOrderForNote, setSelectedOrderForNote] = useState<Order | null>(null);
  const [chefNoteText, setChefNoteText] = useState<string>('');

  /* Sound & Notification tracker */
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
    if (soundEnabled) playKitchenChime('new_order');
    toast.success(`🔔 New ticket #${newOrders[0].id.slice(-4)} arrived in kitchen!`, {
      description: `${newOrders[0].items?.length || 1} items · ${newOrders[0].orderType || 'dine-in'}`,
    });
  }, [orders, isLoadingDB, soundEnabled]);

  /* Keyboard Shortcuts */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (isInput) return;

      if (e.key === '1') setMobileLaneIdx(0);
      else if (e.key === '2') setMobileLaneIdx(1);
      else if (e.key === '3') setMobileLaneIdx(2);
      else if (e.key.toLowerCase() === 'f') toggleFullscreen();
      else if (e.key.toLowerCase() === 'm') setSoundEnabled((prev) => !prev);
      else if (e.key.toLowerCase() === 'b') setShowBatch((prev) => !prev);
      else if (e.key.toLowerCase() === 'h') setShowHistory((prev) => !prev);
      else if (e.key === '?') setShowShortcuts((prev) => !prev);
      else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('kds-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  /* Filtered & Sorted Active Orders */
  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const s = getOrderStatus(o);
        if (s !== 'pending' && s !== 'preparing' && s !== 'ready') return false;

        // Order Type filter
        if (typeFilter !== 'all') {
          const type = (o.orderType || 'takeaway').toLowerCase();
          if (typeFilter === 'dine-in' && !type.includes('dine')) return false;
          if (typeFilter === 'takeaway' && !type.includes('take') && !type.includes('pick') && !type.includes('counter')) return false;
        }

        // Station filter
        if (selectedStation !== 'all') {
          const stationObj = STATIONS.find((st) => st.id === selectedStation);
          if (stationObj && stationObj.match) {
            const matchesStation = o.items?.some((item) => {
              const nameLower = (item.name || '').toLowerCase();
              return stationObj.match?.some((keyword) => nameLower.includes(keyword));
            });
            if (!matchesStation) return false;
          }
        }

        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          o.id.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.customerPhone && o.customerPhone.includes(q)) ||
          (o.tableNumber && o.tableNumber.toString().includes(q)) ||
          o.items?.some((i) => i.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortMode === 'waiting') {
          const aTime = parseOrderTimestamp(a);
          const bTime = parseOrderTimestamp(b);
          return aTime - bTime; // Oldest waiting longest first
        }
        if (sortMode === 'table') {
          return (a.tableNumber || 999) - (b.tableNumber || 999);
        }
        return parseOrderTimestamp(a) - parseOrderTimestamp(b); // Standard FIFO
      });
  }, [orders, searchQuery, typeFilter, selectedStation, sortMode]);

  /* Lanes grouping */
  const laneOrders = useMemo(() => {
    const map: Record<string, Order[]> = { pending: [], preparing: [], ready: [] };
    for (const order of activeOrders) {
      const s = getOrderStatus(order);
      if (map[s]) map[s].push(order);
    }
    return map;
  }, [activeOrders]);

  /* Batch Prep Matrix */
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

  /* Completed History Orders */
  const historyOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const s = getOrderStatus(o);
        return s === 'delivered' || s === 'cancelled';
      })
      .sort((a, b) => parseOrderTimestamp(b) - parseOrderTimestamp(a))
      .slice(0, 35);
  }, [orders]);

  /* Real-time KPI Stats Calculation */
  const stats = useMemo(() => {
    const totalActive = activeOrders.length;
    const pendingCount = laneOrders.pending.length;
    const preparingCount = laneOrders.preparing.length;
    const readyCount = laneOrders.ready.length;

    // Delayed tickets calculation
    const delayedCount = activeOrders.filter((o) => {
      const targetMins = getTargetPrepMinutes(o, prepTimeMap);
      const elapsedMins = Math.floor((Date.now() - parseOrderTimestamp(o)) / 60000);
      return elapsedMins >= targetMins;
    }).length;

    // Active Revenue in pipeline
    const activeRevenue = activeOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    // Total today count
    const completedToday = historyOrders.filter((o) => getOrderStatus(o) === 'delivered').length;
    const totalToday = totalActive + completedToday;

    // Avg Prep Time
    const avgPrep = Math.round(
      activeOrders.reduce((acc, o) => acc + getTargetPrepMinutes(o, prepTimeMap), 0) / (totalActive || 1)
    );

    // Kitchen Efficiency %
    const onTimeRate = totalToday > 0 ? Math.min(100, Math.round(((totalToday - delayedCount) / totalToday) * 100)) : 98;

    return {
      totalActive,
      pendingCount,
      preparingCount,
      readyCount,
      delayedCount,
      activeRevenue,
      totalToday,
      avgPrep: avgPrep || 14,
      onTimeRate,
    };
  }, [activeOrders, laneOrders, historyOrders, prepTimeMap]);

  /* Status Advance & Regress Handlers */
  const handleAdvance = async (orderId: string, currentStatus: OrderStatus) => {
    const lane = LANES.find((l) => l.status === currentStatus);
    if (!lane) return;
    try {
      await updateOrderStatus(orderId, lane.next);
      if (soundEnabled) {
        if (lane.next === 'ready') playKitchenChime('ready');
        else playKitchenChime('new_order');
      }
      toast.success(`Ticket #${orderId.slice(-4)} advanced to ${lane.next.toUpperCase()}! ⚡`);
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
      toast.info(`Ticket #${orderId.slice(-4)} recalled back to ${target}`);
    } catch {
      toast.error('Failed to recall status');
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
      toast.success(`Ticket #${selectedOrderForDelay.id.slice(-4)} extended by +${customDelayMins}m`);
      setDelayDialogOpen(false);
    } catch {
      toast.error('Failed to update prep delay');
    } finally {
      setIsSavingDelay(false);
    }
  };

  const openChefNoteModal = (order: Order) => {
    setSelectedOrderForNote(order);
    setChefNoteText(order.notes || '');
    setChefNoteDialogOpen(true);
  };

  const handleSaveChefNote = async () => {
    if (!selectedOrderForNote) return;
    try {
      await updateOrderPrepTime(selectedOrderForNote.id, selectedOrderForNote.delayMinutes || 0, chefNoteText);
      toast.success(`Chef note saved for ticket #${selectedOrderForNote.id.slice(-4)}`);
      setChefNoteDialogOpen(false);
    } catch {
      toast.error('Failed to save chef note');
    }
  };

  const mobileLane = LANES[mobileLaneIdx];
  const mobileLaneList = laneOrders[mobileLane.status] || [];

  return (
    <AdminLayout title="Kitchen Display System (KDS)">
      <div className="flex flex-col w-full min-h-[calc(100vh-var(--ad-header-h))] bg-ad-bg text-ad-ink select-none pb-8">

        {/* ========================================================== */}
        {/*  TOP FIXED COMMAND & CONTROL HEADER                        */}
        {/* ========================================================== */}
        <header className="sticky top-0 z-20 bg-ad-bg border-b-2 border-ad-line px-4 sm:px-6 py-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 max-w-[1720px] mx-auto">

            {/* Left: Branding + Live Clock + Status Badges */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 grid place-items-center bg-ad-ink text-ad-bg shrink-0">
                  <ChefHat className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="ad-h text-[18px]">The pass</h1>
                    <span className="ad-tag ad-tag-accent">
                      <span className="size-1.5 bg-ad-accent animate-pulse" /> Live
                    </span>
                  </div>
                  <div className="ad-kicker mt-1">
                    {currentDate} · {currentTime || '00:00:00'}
                  </div>
                </div>
              </div>

              {/* Status Metric Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setSelectedStation('all'); setTypeFilter('all'); }}
                  className="ad-tag ad-tag-solid"
                >
                  Active <span className="ad-num text-[12px]">{stats.totalActive}</span>
                </button>
                <span className="ad-tag ad-tag-outline">
                  New <span className="ad-num text-[12px]">{stats.pendingCount}</span>
                </span>
                <span className="ad-tag ad-tag-outline">
                  Cooking <span className="ad-num text-[12px]">{stats.preparingCount}</span>
                </span>
                <span className="ad-tag ad-tag-outline">
                  Ready <span className="ad-num text-[12px]">{stats.readyCount}</span>
                </span>
                {stats.delayedCount > 0 && (
                  <span className="ad-tag ad-tag-accent animate-pulse">
                    Delayed <span className="ad-num text-[12px]">{stats.delayedCount}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Right: Station Selector + Search + Action Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Search input */}
              <div className="relative w-44 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-ad-muted" />
                <input
                  id="kds-search-input"
                  className="ad-input pl-8.5 pr-7"
                  placeholder="Search ticket or dish… (/)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ad-muted hover:text-ad-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Station Filter Dropdown */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATIONS.map((station) => {
                  const Icon = station.icon;
                  return (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => setSelectedStation(station.id)}
                      className="ad-tab flex items-center gap-1.5"
                      data-active={selectedStation === station.id}
                      title={station.label}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="hidden md:inline">{station.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Batch Prep Trigger */}
              <button
                type="button"
                onClick={() => setShowBatch(!showBatch)}
                className="ad-tab flex items-center gap-1.5"
                data-active={showBatch}
                title="View consolidated batch prep list"
              >
                <ListFilter className="size-4" />
                <span className="hidden sm:inline">Batch prep</span>
                {prepMatrix.length > 0 && <span className="tabular-nums opacity-70">{prepMatrix.length}</span>}
              </button>

              {/* History / Completed Drawer */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="ad-tab flex items-center gap-1.5"
                data-active={showHistory}
              >
                <History className="size-4" />
                <span className="hidden sm:inline">History</span>
                <span className="tabular-nums opacity-70">{historyOrders.length}</span>
              </button>

              {/* Audio Chime Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) playKitchenChime('new_order');
                }}
                className="ad-btn ad-btn-secondary ad-btn-icon"
                data-active={soundEnabled}
                title={soundEnabled ? 'Kitchen chime on (tap to mute)' : 'Muted (tap to enable)'}
              >
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="ad-btn ad-btn-secondary ad-btn-icon"
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================== */}
        {/*  TOP ANALYTICS / KPI DASHBOARD WIDGETS                     */}
        {/* ========================================================== */}
        <section className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 pt-4 pb-2">
          <HairlineGrid cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <StatCell label="Tickets today" value={stats.totalToday} />
            <StatCell label="Avg prep target" value={`${stats.avgPrep} min`} />
            <StatCell label="On time" value={`${stats.onTimeRate}%`} />
            <StatCell label="Overdue" value={stats.delayedCount} alert={stats.delayedCount > 0} />
            <StatCell label="In flight" value={formatCurrency(stats.activeRevenue)} />
          </HairlineGrid>
        </section>

        {/* ========================================================== */}
        {/*  BATCH PREPARATION CONSOLIDATED RIBBON                     */}
        {/* ========================================================== */}
        {showBatch && prepMatrix.length > 0 && !showHistory && (
          <section className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-2">
            <div className="p-4 border-2 border-ad-line bg-ad-surface">
              <div className="ad-section-head">
                <span className="ad-num text-[13px] tracking-widest uppercase">Batch prep</span>
                <span className="text-[12px] ad-muted">
                  {prepMatrix.length} unique items across all live tickets
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {prepMatrix.map((item) => (
                  <div key={item.name} className="flex items-center gap-2.5 px-3 py-1.5 bg-ad-bg border border-ad-hairline">
                    <span className="text-[13px] font-semibold">{item.name}</span>
                    <span className="ad-num text-[13px] px-2 bg-ad-ink text-ad-bg">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================== */}
        {/*  FILTER CONTROLS & SORT BAR                                */}
        {/* ========================================================== */}
        <section className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center justify-between gap-3 flex-wrap border-y-2 border-ad-line py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="ad-kicker">Type</span>
              {(['all', 'dine-in', 'takeaway'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className="ad-tab"
                  data-active={typeFilter === t}
                >
                  {t === 'all' ? 'All orders' : t === 'dine-in' ? 'Dine-in' : 'Takeaway'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="ad-kicker hidden sm:inline">Sort</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="ad-input w-auto"
              >
                <option value="fifo">Oldest first</option>
                <option value="waiting">Longest waiting</option>
                <option value="table">Table number</option>
              </select>

              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="ad-btn ad-btn-secondary ad-btn-icon"
                title="Keyboard shortcuts"
              >
                <HelpCircle className="size-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  MAIN CONTENT AREA: KANBAN LANES OR COMPLETED HISTORY      */}
        {/* ========================================================== */}
        <main className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 pt-2 flex-1 flex flex-col">

          {showHistory ? (
            /* ====================================================== */
            /*  HISTORY / COMPLETED TICKETS DRAWER                    */
            /* ====================================================== */
            <div className="border-2 border-ad-line overflow-hidden flex-1 flex flex-col">
              <div className="px-5 py-3.5 border-b-2 border-ad-line flex items-center justify-between gap-3 bg-ad-surface">
                <div className="flex items-center gap-2.5">
                  <History className="size-4" />
                  <h2 className="ad-h text-[17px]">Recently completed</h2>
                  <span className="ad-tag ad-tag-outline">{historyOrders.length} orders</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="ad-btn ad-btn-secondary ad-btn-sm"
                >
                  Close
                </button>
              </div>

              <div className="overflow-y-auto max-h-175">
                {historyOrders.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="ad-h text-[16px]">No completed tickets</p>
                    <p className="text-[13px] ad-muted mt-1.5">Bumped tickets land here.</p>
                  </div>
                ) : (
                  historyOrders.map((o) => {
                    const s = getOrderStatus(o);
                    return (
                      <div
                        key={o.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-ad-hairline last:border-0 ad-hover"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="ad-num text-[17px]">#{o.id.slice(-4)}</span>
                            <span className={getOrderTypeBadge()}>{o.orderType || 'takeaway'}</span>
                            {o.tableNumber && (
                              <span className="ad-tag ad-tag-outline">Table {o.tableNumber}</span>
                            )}
                            <span className={cn('ad-tag', s === 'delivered' ? 'ad-tag-ok' : 'ad-tag-accent')}>
                              {s}
                            </span>
                            <span className="ad-kicker">{o.orderDate} · {o.orderTime}</span>
                          </div>
                          <p className="text-[13px] ad-muted mt-2 m-0">
                            <strong className="text-ad-ink">{o.customerName || 'Walk-in'}</strong>
                            {o.customerPhone ? ` · ${o.customerPhone}` : ''} —{' '}
                            {o.items?.map((i) => `${i.name} ×${i.quantity || 1}`).join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="ad-num text-[15px]">{formatCurrency(o.grandTotal)}</span>
                          <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => handleRegress(o.id, s)}>
                            <Undo2 className="size-3.5" /> Recall to ready
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* ====================================================== */
            /*  ENTERPRISE KANBAN LANES                               */
            /* ====================================================== */
            <>
              {/* Desktop: 3 Side-by-Side Responsive Columns */}
              <div className="hidden lg:grid lg:grid-cols-3 ad-grid flex-1">
                {LANES.map((lane) => {
                  const laneList = laneOrders[lane.status] || [];
                  return (
                    <div key={lane.status} className="flex flex-col min-w-0 p-3.5 gap-3">
                      {/* Lane header */}
                      <div className="flex items-center justify-between gap-2 border-b-2 border-ad-line pb-2.5">
                        <div className="flex items-center gap-2 ad-num text-[14px] tracking-widest uppercase">
                          {lane.icon}
                          <span>{lane.label}</span>
                        </div>
                        <span
                          className="ad-num text-[12px] px-2 py-0.5 text-ad-bg"
                          style={{ background: lane.isPass ? 'var(--ad-accent)' : 'var(--ad-ink)' }}
                        >
                          {laneList.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-300px)] pr-1 scrollbar-none">
                        {laneList.length === 0 ? (
                          <div className="px-4 py-16 text-center">
                            <p className="text-[13px] ad-muted m-0">No tickets in this stage</p>
                          </div>
                        ) : (
                          laneList.map((order) => (
                            <OrderTicketCard
                              key={order.id}
                              order={order}
                              lane={lane}
                              targetMinutes={getTargetPrepMinutes(order, prepTimeMap)}
                              checkedItems={checkedItems[order.id] || new Set()}
                              onToggleItemCheck={(idx) => toggleItemCheck(order.id, idx)}
                              onAdvance={() => handleAdvance(order.id, getOrderStatus(order))}
                              onRegress={() => handleRegress(order.id, getOrderStatus(order))}
                              onOpenDelay={() => openDelayModal(order)}
                              onOpenChefNote={() => openChefNoteModal(order)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tablet & Mobile: Fast Tab Switcher Navigation */}
              <div className="lg:hidden flex flex-col flex-1">
                {/* Mobile Tab Header */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {LANES.map((lane, idx) => {
                    const count = (laneOrders[lane.status] || []).length;
                    return (
                      <button
                        key={lane.status}
                        type="button"
                        onClick={() => setMobileLaneIdx(idx)}
                        className="ad-tab flex flex-col items-center justify-center gap-1 py-3"
                        data-active={mobileLaneIdx === idx}
                      >
                        <span className="truncate">{lane.label}</span>
                        <span className="ad-num text-[14px]">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Lane Ticket Cards */}
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {mobileLaneList.length === 0 ? (
                    <div className="border-2 border-ad-line p-16 text-center">
                      <p className="ad-h text-[16px]">Nothing in {mobileLane.label}</p>
                    </div>
                  ) : (
                    mobileLaneList.map((order) => (
                      <OrderTicketCard
                        key={order.id}
                        order={order}
                        lane={mobileLane}
                        targetMinutes={getTargetPrepMinutes(order, prepTimeMap)}
                        checkedItems={checkedItems[order.id] || new Set()}
                        onToggleItemCheck={(idx) => toggleItemCheck(order.id, idx)}
                        onAdvance={() => handleAdvance(order.id, getOrderStatus(order))}
                        onRegress={() => handleRegress(order.id, getOrderStatus(order))}
                        onOpenDelay={() => openDelayModal(order)}
                        onOpenChefNote={() => openChefNoteModal(order)}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        {/* ========================================================== */}
        {/*  DELAY / PREPARATION TIME EXTENSION MODAL                  */}
        {/* ========================================================== */}
        <Dialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="ad-h text-[18px] flex items-center gap-2">
                <Hourglass className="size-5 text-ad-accent" />
                Extend prep time
              </DialogTitle>
              <DialogDescription className="text-[12px] ad-muted">
                Ticket #{selectedOrderForDelay?.id.slice(-4)}. Live customer tracking updates straight away.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <label className="ad-kicker block mb-2">Quick extend</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 25].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setCustomDelayMins(mins)}
                      className="ad-tab py-3"
                      data-active={customDelayMins === mins}
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="ad-field">
                <label htmlFor="kds-delay-mins">Custom extra minutes</label>
                <input
                  id="kds-delay-mins"
                  className="ad-input tabular-nums"
                  type="number"
                  min={0}
                  max={120}
                  value={customDelayMins}
                  onChange={(e) => setCustomDelayMins(parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div className="ad-field">
                <label htmlFor="kds-delay-reason">Message to the diner</label>
                <input
                  id="kds-delay-reason"
                  className="ad-input"
                  placeholder="e.g. Slow dum cooking for quality"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setDelayDialogOpen(false)}>
                Cancel
              </button>
              <button type="button" className="ad-btn ad-btn-primary" onClick={handleSaveDelay} disabled={isSavingDelay}>
                {isSavingDelay ? 'Saving…' : 'Save and notify'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================== */}
        {/*  CHEF INTERNAL NOTES MODAL                                 */}
        {/* ========================================================== */}
        <Dialog open={chefNoteDialogOpen} onOpenChange={setChefNoteDialogOpen}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="ad-h text-[18px] flex items-center gap-2">
                <ChefHat className="size-5" />
                Kitchen note · #{selectedOrderForNote?.id.slice(-4)}
              </DialogTitle>
              <DialogDescription className="text-[12px] ad-muted">
                Prep remarks, portion alerts, or a note for the server.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3">
              <textarea
                rows={4}
                value={chefNoteText}
                onChange={(e) => setChefNoteText(e.target.value)}
                placeholder="e.g. Extra spicy, pack without peanuts."
                className="ad-input"
              />
            </div>

            <DialogFooter className="gap-2">
              <button type="button" className="ad-btn ad-btn-secondary" onClick={() => setChefNoteDialogOpen(false)}>
                Cancel
              </button>
              <button type="button" className="ad-btn ad-btn-primary" onClick={handleSaveChefNote}>
                Save note
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================== */}
        {/*  KEYBOARD SHORTCUTS CHEAT SHEET MODAL                      */}
        {/* ========================================================== */}
        <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="ad-h text-[18px] flex items-center gap-2">
                <Settings className="size-5" />
                Keyboard shortcuts
              </DialogTitle>
              <DialogDescription className="text-[12px] ad-muted">
                For touchscreens with a keyboard on the pass.
              </DialogDescription>
            </DialogHeader>

            <table className="ad-table my-3">
              <tbody>
                {SHORTCUTS.map(([action, key]) => (
                  <tr key={key}>
                    <td>{action}</td>
                    <td className="text-right">
                      <kbd className="ad-num text-[13px] px-2 py-0.5 border border-ad-line bg-ad-surface">{key}</kbd>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <DialogFooter>
              <button type="button" className="ad-btn ad-btn-primary w-full" onClick={() => setShowShortcuts(false)}>
                Got it
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

/* ================================================================== */
/*  OrderTicketCard Component — High-Legibility Light Mode Card       */
/* ================================================================== */

function OrderTicketCard({
  order,
  lane,
  targetMinutes,
  checkedItems,
  onToggleItemCheck,
  onAdvance,
  onRegress,
  onOpenDelay,
  onOpenChefNote,
}: {
  order: Order;
  lane: typeof LANES[number];
  targetMinutes: number;
  checkedItems: Set<number>;
  onToggleItemCheck: (idx: number) => void;
  onAdvance: () => void;
  onRegress: () => void;
  onOpenDelay: () => void;
  onOpenChefNote: () => void;
}) {
  const items = order.items || [];
  const totalUnits = items.reduce((s, it) => s + (it.quantity || 1), 0);
  const checkedCount = checkedItems.size;
  const allChecked = checkedCount === items.length && items.length > 0;
  const status = getOrderStatus(order);
  const hasDelay = (order.delayMinutes || 0) > 0;
  const tokenNumber = order.id.slice(-4);

  // Time elapsed
  const orderTimestamp = parseOrderTimestamp(order);
  const elapsedMinutes = Math.floor((Date.now() - orderTimestamp) / 60000);
  const isLate = elapsedMinutes >= targetMinutes;

  return (
    <div
      className="bg-ad-surface flex flex-col justify-between transition-colors"
      style={{ borderLeft: `4px solid ${isLate ? 'var(--ad-accent)' : 'var(--ad-ink)'}` }}
    >
      {/* ── CARD HEADER ── */}
      <div className="p-4 border-b border-ad-hairline">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="ad-num text-[24px] leading-none">#{tokenNumber}</span>
              <span className={getOrderTypeBadge()}>{order.orderType || 'takeaway'}</span>
              {order.tableNumber && (
                <span className="ad-tag ad-tag-solid">Table {order.tableNumber}</span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold">{order.customerName || 'Walk-in'}</span>
              {order.customerPhone && (
                <span className="ad-kicker flex items-center gap-1">
                  <Phone className="size-3" /> {order.customerPhone}
                </span>
              )}
            </div>
          </div>

          <KitchenTimer order={order} targetMinutes={targetMinutes} onAdjust={onOpenDelay} />
        </div>

        {/* Prep checklist progress */}
        {items.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between ad-kicker mb-1.5">
              <span>{checkedCount} of {items.length} prepped</span>
              {allChecked && <span style={{ color: 'var(--ad-ok)' }}>All done</span>}
            </div>
            <div className="h-2 bg-ad-n200">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${(checkedCount / items.length) * 100}%`,
                  background: allChecked ? 'var(--ad-ok)' : 'var(--ad-ink)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── CARD BODY ── */}
      <div className="p-4 space-y-2.5 flex-1">
        {hasDelay && (
          <div className="flex items-center gap-2 p-2.5 bg-ad-accent-soft text-ad-accent-deep text-[13px] font-semibold">
            <Hourglass className="size-4 shrink-0" />
            <span>Prep extended by {order.delayMinutes} min</span>
          </div>
        )}

        {order.notes && (
          <div
            className="flex items-start gap-2 p-3 bg-ad-bg text-[13px]"
            style={{ borderLeft: '4px solid var(--ad-accent)' }}
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-ad-accent" />
            <div>
              <span className="ad-kicker block mb-0.5">Special instructions</span>
              <span>{order.notes}</span>
            </div>
          </div>
        )}

        {/* Dish checklist */}
        <div className="flex flex-col">
          {items.map((item, idx) => {
            const isChecked = checkedItems.has(idx);
            const qty = item.quantity || 1;
            const isVeg = item.vegStatus === 'veg';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleItemCheck(idx)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 py-2.5 text-left border-b border-ad-hairline last:border-0 select-none',
                  isChecked ? 'opacity-45 line-through' : 'ad-hover'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {isChecked ? (
                    <CheckSquare className="size-5 shrink-0" style={{ color: 'var(--ad-ok)' }} />
                  ) : (
                    <Square className="size-5 shrink-0 text-ad-muted" />
                  )}

                  {/* Veg mark — the one place a second colour is not optional. */}
                  <span
                    className="size-3.5 border-2 grid place-items-center shrink-0"
                    style={{ borderColor: isVeg ? 'var(--ad-ok)' : 'var(--ad-accent)' }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: isVeg ? 'var(--ad-ok)' : 'var(--ad-accent)' }}
                    />
                  </span>

                  <div className="min-w-0">
                    <span className="text-[15px] font-semibold block truncate leading-tight">
                      {item.name}
                    </span>
                    {item.selectedPortion && (
                      <span className="ad-kicker">{item.selectedPortion}</span>
                    )}
                  </div>
                </div>

                <span
                  className="shrink-0 ad-num text-[15px] px-2.5 py-1"
                  style={{
                    background: isChecked ? 'var(--ad-n300)' : 'var(--ad-ink)',
                    color: isChecked ? 'var(--ad-n700)' : 'var(--ad-bg)',
                  }}
                >
                  ×{qty}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CARD FOOTER — 48px touch targets ── */}
      <div className="p-4 border-t border-ad-hairline space-y-3">
        <div className="flex items-center justify-between">
          <span className="ad-kicker flex items-center gap-1.5">
            <Utensils className="size-3.5" />
            {items.length} items · {totalUnits} units
          </span>
          <span className="ad-num text-[15px]">{formatCurrency(order.grandTotal)}</span>
        </div>

        <div className="flex items-center gap-2">
          {status !== 'pending' && (
            <button
              type="button"
              onClick={onRegress}
              title="Step this ticket back"
              className="ad-btn ad-btn-secondary h-12 w-12 p-0 shrink-0"
            >
              <RotateCcw className="size-4.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenChefNote}
            title="Add a kitchen note"
            className="ad-btn ad-btn-secondary h-12 w-12 p-0 shrink-0"
          >
            <ChefHat className="size-4.5" />
          </button>

          <button
            type="button"
            onClick={onAdvance}
            className={cn('ad-btn flex-1 h-12 text-[14px]', lane.isPass ? 'ad-btn-primary' : 'ad-btn-dark')}
          >
            <Check className="size-4.5" />
            <span>{lane.ctaText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
