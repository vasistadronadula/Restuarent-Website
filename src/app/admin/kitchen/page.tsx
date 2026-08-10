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
  ArrowRight, Check, History, Undo2, Timer, Utensils,
  Maximize2, Minimize2, Columns, Grid, Search,
  AlertTriangle, RotateCcw, ChefHat, ListFilter,
  CheckSquare, Square
} from 'lucide-react';
import { cn } from '@/lib/utils';

function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const playNote = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    playNote(659.25, 0, 0.2); // E5
    playNote(880.00, 0.1, 0.3); // A5
  } catch {
    // Audio Context blocked
  }
}

const getOrderStatus = (o: Order): OrderStatus => o.orderStatus || o.status || 'pending';
const orderPlacedAt = (o: Order) => o.createdAt || o.orderTime || o.orderDate;

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

  if (!placedAt) return <span className="text-xs text-stone-400">—</span>;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const isOverdue = mins >= 15;
  const isUrgent = mins >= 10 && mins < 15;

  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-semibold',
      isOverdue ? 'bg-rose-50 text-rose-700 border border-rose-200'
        : isUrgent ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'bg-stone-50 text-stone-600 border border-stone-200'
    )}>
      <Timer className="size-3" />
      <span>{timeStr}</span>
    </div>
  );
}

const LANES: { status: OrderStatus; label: string; icon: React.ReactNode; borderStyle: string; cta: string; next: OrderStatus }[] = [
  {
    status: 'pending',
    label: 'New Orders',
    icon: <Clock className="size-4 text-sky-600" />,
    borderStyle: 'border-sky-200',
    cta: 'Start Cooking',
    next: 'preparing',
  },
  {
    status: 'preparing',
    label: 'Cooking',
    icon: <Flame className="size-4 text-amber-600" />,
    borderStyle: 'border-amber-200',
    cta: 'Mark Ready',
    next: 'ready',
  },
  {
    status: 'ready',
    label: 'Ready to Pass',
    icon: <CheckCircle2 className="size-4 text-emerald-600" />,
    borderStyle: 'border-emerald-200',
    cta: 'Serve',
    next: 'delivered',
  },
];

function getOrderTypeStyle(orderType?: string) {
  const type = (orderType || 'dine-in').toLowerCase();
  if (type.includes('dine')) return 'bg-sky-50 text-sky-700 border-sky-100';
  if (type.includes('take') || type.includes('pick')) return 'bg-purple-50 text-purple-700 border-purple-100';
  return 'bg-rose-50 text-rose-700 border-rose-100';
}

export default function KitchenDisplayPage() {
  const { orders, updateOrderStatus, isLoadingDB } = useAdmin();
  const { userRole } = useAuth();
  const isChef = userRole === 'chef';
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showPrepMatrix, setShowPrepMatrix] = useState(true);
  const [viewMode, setViewMode] = useState<'lanes' | 'grid'>('lanes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});

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
      toast.success('🔔 New order received');
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
      const orderSet = new Set(prev[orderId] || []);
      if (orderSet.has(itemIdx)) {
        orderSet.delete(itemIdx);
      } else {
        orderSet.add(itemIdx);
      }
      return { ...prev, [orderId]: orderSet };
    });
  };

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
        return ta - tb;
      });
  }, [orders, searchQuery]);

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
        if (!counts[key]) {
          counts[key] = { name: key, quantity: 0 };
        }
        counts[key].quantity += item.quantity || 1;
      }
    }
    return Object.values(counts).sort((a, b) => b.quantity - a.quantity);
  }, [activeOrders]);

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
      toast.success(`Order ${orderId} status updated`);
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
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <AdminLayout title="Kitchen Display System">
      <div className="space-y-4 w-full max-w-full">
        {/* Header Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
              Kitchen Display System
              <Badge className="bg-stone-100 text-stone-750 font-medium text-xs border-none">
                {activeOrders.length} active
              </Badge>
            </h1>
            <p className="text-sm text-stone-500 mt-0.5">Live tickets and batch preparation overview</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:flex-none md:min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
              <Input
                placeholder="Search ticket, dish…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 pr-3 text-xs bg-stone-50 border-stone-200 text-stone-900 rounded-lg focus-visible:ring-amber-500"
              />
            </div>

            {/* Batch toggle */}
            <button
              onClick={() => setShowPrepMatrix(!showPrepMatrix)}
              className={cn(
                'h-9 px-3 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5',
                showPrepMatrix ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              )}
            >
              <ListFilter className="size-3.5" />
              Batch ({prepMatrix.length})
            </button>

            {/* View switcher */}
            <div className="flex bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('lanes')}
                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1', viewMode === 'lanes' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700')}
              >
                <Columns className="size-3.5" /> Lanes
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1', viewMode === 'grid' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700')}
              >
                <Grid className="size-3.5" /> Grid
              </button>
            </div>

            {/* Sound */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playKitchenChime();
              }}
              className={cn(
                'h-9 px-3 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5',
                soundEnabled ? 'border-emerald-250 bg-emerald-50/30 text-emerald-800' : 'border-stone-200 bg-white text-stone-500'
              )}
            >
              {soundEnabled ? <Volume2 className="size-4 text-emerald-600" /> : <VolumeX className="size-4" />}
              {soundEnabled ? 'Sound ON' : 'Muted'}
            </button>

            {/* History Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'h-9 px-3 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5',
                showHistory ? 'bg-amber-600 hover:bg-amber-700 text-white border-transparent' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              )}
            >
              <History className="size-4" /> Recall
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="h-9 px-3 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>

        {/* Batch Prep Summary */}
        {showPrepMatrix && prepMatrix.length > 0 && !showHistory && (
          <div className="p-3.5 rounded-lg bg-amber-50/50 border border-amber-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-amber-800">
              <span className="flex items-center gap-1.5">
                <ChefHat className="size-4" />
                Live Batch cooking summary
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {prepMatrix.map((item) => (
                <div key={item.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white border border-amber-100 shadow-2xs">
                  <span className="text-xs font-medium text-stone-850">{item.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white text-xs font-semibold tabular-nums">
                    {item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Display */}
        {showHistory ? (
          <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-1.5 pb-2 border-b border-stone-150">
              <History className="size-4 text-stone-500" /> Recently completed tickets
            </h3>
            <div className="divide-y divide-stone-100">
              {historyOrders.length === 0 ? (
                <p className="py-8 text-center text-xs text-stone-400">No recently completed tickets.</p>
              ) : (
                historyOrders.map((o) => (
                  <div key={o.id} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-stone-900">{o.id}</span>
                        <Badge variant="outline" className={cn('uppercase text-[10px] font-medium', getOrderTypeStyle(o.orderType))}>
                          {o.orderType}
                        </Badge>
                        {o.tableNumber && <span className="text-xs text-stone-500">Table #{o.tableNumber}</span>}
                      </div>
                      <div className="text-xs text-stone-550 mt-1 truncate max-w-lg">
                        {o.customerName || 'Walk-in'} · {o.items?.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRegress(o.id, getOrderStatus(o))}
                      className="h-8 rounded-lg text-xs bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Undo2 className="size-3.5 mr-1" /> Recall
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : viewMode === 'lanes' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LANES.map((lane) => {
              const laneList = laneOrders[lane.status] || [];
              return (
                <div key={lane.status} className="flex flex-col min-w-0">
                  {/* Lane Header */}
                  <div className={cn('mb-3 flex items-center justify-between px-3 py-2 rounded-lg border bg-white', lane.borderStyle)}>
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                      {lane.icon}
                      <span>{lane.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-stone-600 tabular-nums">{laneList.length}</span>
                  </div>

                  {/* Lane Body */}
                  <div className="space-y-3 min-h-[400px]">
                    {laneList.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-stone-200 px-4 py-12 text-center text-sm text-stone-400">
                        No orders in this column
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeOrders.length === 0 ? (
              <div className="col-span-full py-16 text-center text-stone-500 text-sm">
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
        )}
      </div>
    </AdminLayout>
  );
}

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
    <div className="rounded-xl border border-stone-200 bg-white p-4 flex flex-col justify-between hover:shadow-xs transition-all">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-semibold text-stone-900 truncate">{order.id}</span>
              <Badge variant="outline" className={cn('uppercase text-[10px] font-medium px-2 py-0.5 border-none', getOrderTypeStyle(order.orderType))}>
                {order.orderType}
              </Badge>
            </div>
            <div className="mt-0.5 text-xs text-stone-500 truncate">
              {order.customerName || 'Walk-in'}
              {order.tableNumber && <span className="text-emerald-700 font-semibold ml-1">· Table {order.tableNumber}</span>}
            </div>
          </div>
          <KitchenTimer placedAt={orderPlacedAt(order)} />
        </div>

        {/* Note */}
        {order.notes && (
          <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 flex items-start gap-1.5 text-xs">
            <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
            <span>Note: {order.notes}</span>
          </div>
        )}

        {/* Checklist */}
        <div className="mt-3.5 space-y-1.5">
          {items.map((item, idx) => {
            const isChecked = checkedItems.has(idx);
            const qty = item.quantity || 1;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleItemCheck(idx)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left transition-colors border',
                  isChecked
                    ? 'bg-stone-50 border-transparent text-stone-400 line-through opacity-70'
                    : 'bg-stone-50/50 border-stone-100 text-stone-900 hover:bg-stone-100/50'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isChecked ? (
                    <CheckSquare className="size-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="size-4 text-stone-400 shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-medium truncate">
                    {item.name}
                    {item.selectedPortion && (
                      <span className="ml-1 text-[10px] uppercase bg-amber-50 text-amber-800 border border-amber-100 rounded px-1">
                        {item.selectedPortion}
                      </span>
                    )}
                  </span>
                </div>
                <span className={cn(
                  'shrink-0 text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded',
                  isChecked ? 'bg-stone-100 text-stone-450' : 'bg-stone-100 text-stone-600'
                )}>
                  ×{qty}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-stone-100 space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-stone-500">
          <span className="flex items-center gap-1"><Utensils className="size-3.5" /> {items.length} dishes ({totalUnits} units)</span>
          <span className="font-semibold text-stone-900 tabular-nums">₹{order.grandTotal}</span>
        </div>

        <div className="flex items-center gap-2">
          {status !== 'pending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegress}
              className="h-9 px-2 rounded-lg border-stone-200 text-stone-550 hover:bg-stone-100"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
          {lane.next && (
            <Button
              onClick={onAdvance}
              className={cn(
                'flex-1 h-9 rounded-lg text-xs font-medium text-white shadow-2xs',
                status === 'pending' ? 'bg-sky-600 hover:bg-sky-700'
                  : status === 'preparing' ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              <Check className="size-4 mr-1" />
              {lane.cta}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
