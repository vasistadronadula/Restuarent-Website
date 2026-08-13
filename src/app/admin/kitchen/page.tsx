'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Volume2, VolumeX, Flame, CheckCircle2, Clock,
  Check, History, Undo2, Timer, Utensils,
  Maximize2, Minimize2, Search, X,
  AlertTriangle, RotateCcw, ChefHat, ListFilter,
  CheckSquare, Square, Hourglass, Phone, Calendar,
  TrendingUp, Sparkles, Filter, ArrowRight, Zap,
  Layers, Coffee, ShieldAlert, Settings, HelpCircle,
  BarChart3, RefreshCw, ChevronRight, Eye, ChevronDown
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

function getOrderTypeBadge(orderType?: string) {
  const type = (orderType || 'takeaway').toLowerCase();
  if (type.includes('dine')) return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black';
  if (type.includes('take') || type.includes('pick') || type.includes('counter')) return 'bg-purple-50 text-purple-800 border-purple-300 font-black';
  return 'bg-blue-50 text-blue-800 border-blue-300 font-black';
}

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

const LANES: {
  status: OrderStatus;
  label: string;
  tabLabel: string;
  icon: React.ReactNode;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  ctaText: string;
  ctaBg: string;
  next: OrderStatus;
  accentBorder: string;
}[] = [
  {
    status: 'pending',
    label: 'New Orders',
    tabLabel: 'New Tickets',
    icon: <Clock className="size-4.5" />,
    headerBg: 'bg-blue-600 text-white',
    headerText: 'text-blue-950',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    ctaText: 'Start Cooking',
    ctaBg: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-500/20',
    next: 'preparing',
    accentBorder: 'border-blue-200',
  },
  {
    status: 'preparing',
    label: 'In Preparation',
    tabLabel: 'Cooking on Stove',
    icon: <Flame className="size-4.5" />,
    headerBg: 'bg-amber-500 text-slate-950',
    headerText: 'text-amber-950',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
    ctaText: 'Mark Ready for Pass',
    ctaBg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 shadow-md shadow-amber-500/20 font-black',
    next: 'ready',
    accentBorder: 'border-amber-200',
  },
  {
    status: 'ready',
    label: 'Ready for Pass',
    tabLabel: 'Ready for Pickup',
    icon: <CheckCircle2 className="size-4.5" />,
    headerBg: 'bg-emerald-600 text-white',
    headerText: 'text-emerald-950',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ctaText: 'Serve / Handover',
    ctaBg: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/20',
    next: 'delivered',
    accentBorder: 'border-emerald-200',
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

  const ringColor = isOverdue
    ? 'stroke-rose-600'
    : isUrgent
    ? 'stroke-amber-500'
    : 'stroke-emerald-600';

  const bgRingColor = isOverdue
    ? 'stroke-rose-100'
    : isUrgent
    ? 'stroke-amber-100'
    : 'stroke-emerald-100';

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
          <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4.5" className={bgRingColor} />
          <circle
            cx="24"
            cy="24"
            r={r}
            fill="none"
            strokeWidth="4.5"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-1000', ringColor, isOverdue && 'animate-pulse')}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            'font-mono text-xs font-black tabular-nums leading-none tracking-tight',
            isOverdue ? 'text-rose-700' : isUrgent ? 'text-amber-800' : 'text-slate-900'
          )}>
            {timeStr}
          </span>
          <span className="text-[9px] font-bold text-slate-500 leading-none mt-0.5">
            /{targetMinutes}m
          </span>
        </div>
      </div>
      {isOverdue && (
        <span className="text-[9px] font-black text-rose-700 bg-rose-50 px-2 rounded-full border border-rose-200 leading-4 animate-pulse">
          LATE
        </span>
      )}
      {isUrgent && !isOverdue && (
        <span className="text-[9px] font-black text-amber-800 bg-amber-50 px-2 rounded-full border border-amber-200 leading-4">
          EXPEDITING
        </span>
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
      <div className="flex flex-col w-full min-h-[calc(100vh-64px)] bg-[#F8FAFC] text-slate-900 font-sans antialiased select-none pb-8">

        {/* ========================================================== */}
        {/*  TOP FIXED COMMAND & CONTROL HEADER                        */}
        {/* ========================================================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-3 shadow-xs">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 max-w-[1720px] mx-auto">

            {/* Left: Branding + Live Clock + Status Badges */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  <ChefHat className="size-5.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-black tracking-tight text-slate-950">
                      Kitchen Display
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span>{currentDate}</span>
                    <span>•</span>
                    <span className="font-mono font-black text-blue-600 text-sm">{currentTime || '00:00:00'}</span>
                  </div>
                </div>
              </div>

              {/* Status Metric Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setSelectedStation('all'); setTypeFilter('all'); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs font-bold transition-all"
                >
                  <span>Active:</span>
                  <span className="font-mono text-sm font-black text-slate-950">{stats.totalActive}</span>
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                  <Clock className="size-3.5 text-blue-600" />
                  <span>New:</span>
                  <span className="font-mono text-sm font-black text-blue-900">{stats.pendingCount}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                  <Flame className="size-3.5 text-amber-600" />
                  <span>Cooking:</span>
                  <span className="font-mono text-sm font-black text-amber-950">{stats.preparingCount}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>Ready:</span>
                  <span className="font-mono text-sm font-black text-emerald-950">{stats.readyCount}</span>
                </div>
                {stats.delayedCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-pulse">
                    <AlertTriangle className="size-3.5 text-rose-600" />
                    <span>Delayed:</span>
                    <span className="font-mono text-sm font-black text-rose-950">{stats.delayedCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Station Selector + Search + Action Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Search input */}
              <div className="relative w-44 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <Input
                  id="kds-search-input"
                  placeholder="Search ticket or dish… (/)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9.5 pl-8.5 pr-7 text-xs bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Station Filter Dropdown */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {STATIONS.map((station) => {
                  const Icon = station.icon;
                  const isSelected = selectedStation === station.id;
                  return (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => setSelectedStation(station.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                        isSelected
                          ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                      )}
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
                className={cn(
                  'h-9.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all',
                  showBatch
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                )}
                title="View consolidated batch ingredient list"
              >
                <ListFilter className="size-4" />
                <span className="hidden sm:inline">Batch Prep</span>
                {prepMatrix.length > 0 && (
                  <span className={cn('px-1.5 py-0.2 rounded-full text-[10px] font-black', showBatch ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-700')}>
                    {prepMatrix.length}
                  </span>
                )}
              </button>

              {/* History / Completed Drawer */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  'h-9.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all',
                  showHistory
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                )}
              >
                <History className="size-4" />
                <span className="hidden sm:inline">History</span>
                <span className="text-[10px] opacity-70">({historyOrders.length})</span>
              </button>

              {/* Audio Chime Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  if (next) playKitchenChime('new_order');
                }}
                className={cn(
                  'size-9.5 rounded-xl border flex items-center justify-center transition-all',
                  soundEnabled
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-400 hover:text-slate-700'
                )}
                title={soundEnabled ? 'Kitchen chime ON (tap to mute)' : 'Muted (tap to enable)'}
              >
                {soundEnabled ? <Volume2 className="size-4.5" /> : <VolumeX className="size-4.5" />}
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="size-9.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-all"
                title="Toggle Fullscreen Display"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Widget 1: Today's Orders */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Tickets Today</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">{stats.totalToday}</p>
              </div>
              <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Utensils className="size-5" />
              </div>
            </div>

            {/* Widget 2: Avg Preparation Time */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Avg Prep Target</p>
                <p className="text-2xl font-black text-blue-600 tabular-nums mt-0.5">{stats.avgPrep} <span className="text-xs font-bold text-slate-600">mins</span></p>
              </div>
              <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Timer className="size-5" />
              </div>
            </div>

            {/* Widget 3: Efficiency Rate */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Kitchen On-Time %</p>
                <p className="text-2xl font-black text-emerald-600 tabular-nums mt-0.5">{stats.onTimeRate}%</p>
              </div>
              <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Zap className="size-5" />
              </div>
            </div>

            {/* Widget 4: Delayed / Overdue */}
            <div className={cn(
              'p-3.5 rounded-2xl border shadow-xs flex items-center justify-between transition-colors',
              stats.delayedCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
            )}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Overdue / Rush</p>
                <p className={cn('text-2xl font-black tabular-nums mt-0.5', stats.delayedCount > 0 ? 'text-rose-600' : 'text-slate-900')}>
                  {stats.delayedCount}
                </p>
              </div>
              <div className={cn('size-10 rounded-xl flex items-center justify-center', stats.delayedCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500')}>
                <AlertTriangle className="size-5" />
              </div>
            </div>

            {/* Widget 5: Active Queue Value */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">In-Flight Total</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">{formatCurrency(stats.activeRevenue)}</p>
              </div>
              <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="size-5" />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================== */}
        {/*  BATCH PREPARATION CONSOLIDATED RIBBON                     */}
        {/* ========================================================== */}
        {showBatch && prepMatrix.length > 0 && !showHistory && (
          <section className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-2">
            <div className="p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-blue-700" />
                  <span className="text-xs font-black text-blue-950 uppercase tracking-wide">
                    Consolidated Kitchen Batch Aggregator — Combined Active Prep Quantities
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-800 bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                  {prepMatrix.length} unique items in prep
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {prepMatrix.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 shadow-2xs"
                  >
                    <span className="text-xs font-bold text-slate-900">{item.name}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-xs font-black font-mono tabular-nums">
                      ×{item.quantity}
                    </span>
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
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* Left: Order Type Filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider px-2">Type:</span>
              {(['all', 'dine-in', 'takeaway'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border',
                    typeFilter === t
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {t === 'all' ? 'All Orders' : t === 'dine-in' ? '🍽️ Dine-In' : '🛍️ Takeaway / Counter'}
                </button>
              ))}
            </div>

            {/* Right: Sort Order & Shortcuts */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider hidden sm:inline">Sort:</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="h-8.5 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="fifo">Oldest First (FIFO)</option>
                <option value="waiting">Longest Waiting Time</option>
                <option value="table">Table Number</option>
              </select>

              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="size-8.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 flex items-center justify-center"
                title="Keyboard Shortcuts"
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
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <History className="size-5 text-slate-600" />
                  <h2 className="text-base font-black text-slate-900">
                    Recently Completed Tickets
                  </h2>
                  <Badge variant="outline" className="bg-white text-slate-700 font-bold border-slate-200">
                    {historyOrders.length} orders
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  ✕ Close History
                </button>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[700px]">
                {historyOrders.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <Utensils className="size-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold text-slate-600">No recently completed tickets</p>
                  </div>
                ) : (
                  historyOrders.map((o) => {
                    const s = getOrderStatus(o);
                    return (
                      <div
                        key={o.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-base font-black text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
                              #{o.id.slice(-4)}
                            </span>
                            <Badge variant="outline" className={cn('uppercase text-[11px] font-black border', getOrderTypeBadge(o.orderType))}>
                              {o.orderType || 'takeaway'}
                            </Badge>
                            {o.tableNumber && (
                              <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                Table #{o.tableNumber}
                              </span>
                            )}
                            <span className={cn(
                              'text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border',
                              s === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                            )}>
                              {s}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{o.orderDate} · {o.orderTime}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-2">
                            <strong className="text-slate-900">{o.customerName || 'Walk-in Customer'}</strong>
                            {o.customerPhone ? ` · ${o.customerPhone}` : ''} —{' '}
                            {o.items?.map((i) => `${i.name} ×${i.quantity || 1}`).join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-slate-900 text-sm font-mono">{formatCurrency(o.grandTotal)}</span>
                          <Button
                            size="sm"
                            onClick={() => handleRegress(o.id, s)}
                            variant="outline"
                            className="h-9 rounded-xl text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            <Undo2 className="size-3.5 mr-1.5" /> Recall to Ready
                          </Button>
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
              <div className="hidden lg:grid lg:grid-cols-3 gap-5 flex-1">
                {LANES.map((lane) => {
                  const laneList = laneOrders[lane.status] || [];
                  return (
                    <div
                      key={lane.status}
                      className="flex flex-col min-w-0 bg-slate-100/60 rounded-3xl p-3 border border-slate-200/80 shadow-2xs"
                    >
                      {/* Lane Header Bar */}
                      <div className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-2xl mb-3 shadow-xs',
                        lane.headerBg
                      )}>
                        <div className="flex items-center gap-2.5 font-black text-sm tracking-tight">
                          {lane.icon}
                          <span>{lane.label}</span>
                        </div>
                        <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-full bg-white/20 text-inherit backdrop-blur-xs">
                          {laneList.length} tickets
                        </span>
                      </div>

                      {/* Cards Container */}
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-[calc(100vh-270px)] pr-1 scrollbar-none">
                        {laneList.length === 0 ? (
                          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 px-4 py-20 text-center">
                            <div className="text-3xl mb-2">🍽️</div>
                            <p className="text-xs font-bold text-slate-400">No tickets in this stage</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Orders automatically queue up here</p>
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
                    const isActive = mobileLaneIdx === idx;
                    return (
                      <button
                        key={lane.status}
                        type="button"
                        onClick={() => setMobileLaneIdx(idx)}
                        className={cn(
                          'flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1',
                          isActive
                            ? `${lane.headerBg} border-transparent shadow-md scale-[1.02]`
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-black">
                          {lane.icon}
                          <span className="truncate">{lane.label}</span>
                        </div>
                        <span className={cn(
                          'text-xs font-black font-mono px-2 py-0.5 rounded-full',
                          isActive ? 'bg-white/20 text-inherit' : 'bg-slate-100 text-slate-900'
                        )}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Lane Ticket Cards */}
                <div className="space-y-4 flex-1 overflow-y-auto">
                  {mobileLaneList.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-16 text-center">
                      <div className="text-4xl mb-2">🍽️</div>
                      <p className="text-sm font-bold text-slate-600">No orders in {mobileLane.label}</p>
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
          <DialogContent className="sm:max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-950 font-black text-lg">
                <Hourglass className="size-5.5 text-amber-600" />
                Extend Prep / Cooking Time
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Ticket #{selectedOrderForDelay?.id.slice(-4)}. Adjusting prep time updates live customer tracking instantly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-2">Quick Time Extend</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 25].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setCustomDelayMins(mins)}
                      className={cn(
                        'py-3 rounded-xl text-xs font-black border transition-all',
                        customDelayMins === mins
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      +{mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5">Custom Extra Minutes</label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={customDelayMins}
                  onChange={(e) => setCustomDelayMins(parseInt(e.target.value, 10) || 0)}
                  className="h-10 text-sm font-bold bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5">Customer Message / Reason</label>
                <Input
                  placeholder="e.g. Rush hour simmering / Slow dum cooking for quality"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="h-10 text-xs bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDelayDialogOpen(false)}
                className="rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveDelay}
                disabled={isSavingDelay}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-sm"
              >
                {isSavingDelay ? 'Saving…' : 'Save & Update Customer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================== */}
        {/*  CHEF INTERNAL NOTES MODAL                                 */}
        {/* ========================================================== */}
        <Dialog open={chefNoteDialogOpen} onOpenChange={setChefNoteDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-950 font-black text-lg">
                <ChefHat className="size-5.5 text-blue-600" />
                Kitchen Notes for Ticket #{selectedOrderForNote?.id.slice(-4)}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Special prep remarks, portion alerts, or server coordination notes.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3">
              <textarea
                rows={4}
                value={chefNoteText}
                onChange={(e) => setChefNoteText(e.target.value)}
                placeholder="e.g. Customer requested extra spicy & packaging without peanuts."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChefNoteDialogOpen(false)}
                className="rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveChefNote}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save Kitchen Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================== */}
        {/*  KEYBOARD SHORTCUTS CHEAT SHEET MODAL                      */}
        {/* ========================================================== */}
        <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
          <DialogContent className="sm:max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-950 font-black text-lg">
                <Settings className="size-5 text-blue-600" />
                KDS Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                High-speed kitchen commands for touchscreens and physical keyboards.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 py-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700">Switch to New Orders</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-black text-slate-900">1</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700">Switch to In Preparation</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-black text-slate-900">2</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700">Switch to Ready for Pass</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-black text-slate-900">3</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700">Focus Search Bar</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-black text-slate-900">/</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700">Toggle Fullscreen Display</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-black text-slate-900">F</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700">Toggle Sound Alerts</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-black text-slate-900">M</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700">Toggle Batch Prep Aggregator</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-black text-slate-900">B</kbd>
              </div>
            </div>

            <DialogFooter>
              <Button
                size="sm"
                onClick={() => setShowShortcuts(false)}
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                Got It
              </Button>
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
    <div className={cn(
      'rounded-3xl bg-white flex flex-col justify-between border-2 transition-all hover:shadow-lg duration-200 overflow-hidden',
      isLate ? 'border-rose-400 ring-2 ring-rose-300/30' : lane.accentBorder
    )}>
      {/* ── CARD HEADER ── */}
      <div className={cn(
        'p-4 border-b transition-colors',
        status === 'pending' ? 'bg-blue-50/50 border-blue-100'
          : status === 'preparing' ? 'bg-amber-50/50 border-amber-100'
          : 'bg-emerald-50/50 border-emerald-100'
      )}>
        <div className="flex items-start justify-between gap-3">
          {/* Token & Tags */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'font-mono text-2xl font-black px-3 py-1 rounded-2xl border-2 tracking-tight shadow-2xs',
                status === 'pending' ? 'text-blue-800 bg-white border-blue-300'
                  : status === 'preparing' ? 'text-amber-900 bg-white border-amber-300'
                  : 'text-emerald-800 bg-white border-emerald-300'
              )}>
                #{tokenNumber}
              </span>

              <Badge variant="outline" className={cn('uppercase text-[11px] font-black px-2.5 py-1 rounded-xl border', getOrderTypeBadge(order.orderType))}>
                {order.orderType || 'takeaway'}
              </Badge>

              {order.tableNumber && (
                <span className="text-emerald-950 font-black bg-emerald-100/90 px-3 py-1 rounded-xl border border-emerald-300 text-xs shadow-2xs">
                  Table #{order.tableNumber}
                </span>
              )}
            </div>

            {/* Customer Name & Phone */}
            <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-600 flex-wrap">
              <span className="font-black text-slate-900 text-sm">{order.customerName || 'Walk-in Diner'}</span>
              {order.customerPhone && (
                <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                  <Phone className="size-3 text-slate-400" /> {order.customerPhone}
                </span>
              )}
            </div>
          </div>

          {/* Dial Timer */}
          <KitchenTimer order={order} targetMinutes={targetMinutes} onAdjust={onOpenDelay} />
        </div>

        {/* Item Checklist Completion Progress Bar */}
        {items.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
              <span>{checkedCount} of {items.length} items prepped</span>
              {allChecked && <span className="text-emerald-600 font-black">✓ All Items Done</span>}
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  allChecked ? 'bg-emerald-500' : 'bg-blue-500'
                )}
                style={{ width: `${(checkedCount / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── CARD BODY (DISHES & NOTES) ── */}
      <div className="p-4 space-y-2.5 flex-1 bg-white">
        {/* Delay Banner */}
        {hasDelay && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
            <Hourglass className="size-4 text-amber-600 shrink-0" />
            <span>Prep Extended: +{order.delayMinutes} mins</span>
          </div>
        )}

        {/* Special Instructions / Notes */}
        {order.notes && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs font-medium">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-amber-900 uppercase text-[10px] block mb-0.5">Special Instructions:</span>
              <span>{order.notes}</span>
            </div>
          </div>
        )}

        {/* Dish List with High Contrast Checkboxes */}
        <div className="space-y-2 pt-1">
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
                  'w-full flex items-center justify-between gap-3 p-3 rounded-2xl text-left transition-all border-2 select-none group',
                  isChecked
                    ? 'bg-slate-50 border-slate-200 opacity-55 line-through'
                    : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30'
                )}
              >
                {/* Checkbox & Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {isChecked ? (
                    <CheckSquare className="size-5.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="size-5.5 text-slate-300 group-hover:text-blue-500 shrink-0" />
                  )}

                  {/* Veg / Non-Veg Indicator */}
                  <span className={cn(
                    'size-3.5 rounded-[3px] border-2 flex items-center justify-center shrink-0',
                    isVeg ? 'border-emerald-600' : 'border-rose-600'
                  )}>
                    <span className={cn('size-1.5 rounded-full', isVeg ? 'bg-emerald-600' : 'bg-rose-600')} />
                  </span>

                  <div className="min-w-0">
                    <span className="text-[15px] font-black text-slate-900 block truncate leading-tight">
                      {item.name}
                    </span>
                    {item.selectedPortion && (
                      <span className="mt-0.5 inline-block text-[10px] uppercase bg-slate-100 text-slate-700 border border-slate-200 rounded-md px-1.5 font-bold">
                        Portion: {item.selectedPortion}
                      </span>
                    )}
                  </div>
                </div>

                {/* Big Quantity Pill */}
                <span className={cn(
                  'shrink-0 text-sm font-black tabular-nums px-3 py-1.5 rounded-xl font-mono shadow-2xs',
                  isChecked ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'
                )}>
                  ×{qty}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CARD FOOTER (48px+ TOUCH BUTTONS) ── */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <Utensils className="size-3.5" />
            {items.length} items ({totalUnits} total)
          </span>
          <span className="font-mono text-sm font-black text-slate-900">{formatCurrency(order.grandTotal)}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Regress / Step Back Button */}
          {status !== 'pending' && (
            <button
              type="button"
              onClick={onRegress}
              title="Recall step back"
              className="h-12 w-12 flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
            >
              <RotateCcw className="size-4.5" />
            </button>
          )}

          {/* Add Chef Note Button */}
          <button
            type="button"
            onClick={onOpenChefNote}
            title="Add Kitchen Note"
            className="h-12 w-12 flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
          >
            <ChefHat className="size-4.5" />
          </button>

          {/* Primary Advance CTA Button (48px+ touch target) */}
          <button
            type="button"
            onClick={onAdvance}
            className={cn(
              'flex-1 h-12 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 active:scale-[0.98]',
              lane.ctaBg
            )}
          >
            <Check className="size-4.5" />
            <span>{lane.ctaText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
