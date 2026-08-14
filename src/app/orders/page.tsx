'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ReceiptText, RotateCcw, Search, ShoppingBag,
  ArrowRight, X, Copy, Check,
  Flame, CheckCircle2, CookingPot, Clock,
  Hourglass, Phone, AlertCircle,
  PackageOpen, TrendingUp, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import OrderTracker from '@/components/customer/OrderTracker';
import ViewBillDialog from '@/components/bill/ViewBillDialog';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCartStore } from '@/store/useCartStore';
import { useGuestOrders } from '@/lib/queries';
import { queryKeys } from '@/lib/queries/keys';
import { supabase } from '@/lib/supabase';
import { playOrderChimeSound } from '@/lib/audio';
import type { Order, OrderItem, OrderStatus } from '@/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

/* ------------------------------------------------------------------ */
/*  Constants & Helpers                                                 */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Live' },
  { value: 'delivered', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const STATUS_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; colors: string }
> = {
  delivered:  { label: 'Completed',        icon: CheckCircle2, colors: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  preparing:  { label: 'Cooking on Stove', icon: Flame,        colors: 'text-amber-700  bg-amber-50  border-amber-200' },
  ready:      { label: 'Ready for Pickup', icon: CookingPot,   colors: 'text-sky-700    bg-sky-50    border-sky-200' },
  cancelled:  { label: 'Cancelled',        icon: AlertCircle,  colors: 'text-rose-700   bg-rose-50   border-rose-200' },
  pending:    { label: 'Order Confirmed',  icon: Clock,        colors: 'text-violet-700 bg-violet-50 border-violet-200' },
};

function isActiveStatus(status: string): boolean {
  return ['pending', 'preparing', 'ready'].includes(status);
}

/* ------------------------------------------------------------------ */
/*  ETA live countdown — shown in active order card                    */
/* ------------------------------------------------------------------ */

function EtaCountdown({ minutes }: { minutes: number }) {
  const [remaining, setRemaining] = useState(minutes * 60);

  useEffect(() => {
    // Deferred a tick, not called directly in the effect body, so resetting
    // the countdown when `minutes` changes doesn't fire setState
    // synchronously within the effect.
    const reset = setTimeout(() => setRemaining(minutes * 60), 0);
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => {
      clearTimeout(reset);
      clearInterval(id);
    };
  }, [minutes]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div className="flex flex-col items-end shrink-0">
      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Est. Ready</span>
      <span className="font-mono text-xl font-black tabular-nums text-stone-900 leading-tight">
        {m}:{s < 10 ? '0' : ''}{s}
      </span>
      <span className="text-[10px] text-stone-400">mins</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Orders Page                                                    */
/* ------------------------------------------------------------------ */

export default function OrderHistoryPage() {
  const { orders: allOrders, menuItems, isLoadingDB: adminLoading } = useAdmin();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [guestOrderIds, setGuestOrderIds] = useState<string[]>([]);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const previousStatusMapRef = useRef<Map<string, OrderStatus>>(new Map());
  const previousDelayMapRef  = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Reading localStorage is the external-system sync an effect is for;
    // the setState that reports the result back is deferred a tick so it
    // isn't called directly (synchronously) within the effect body.
    const id = setTimeout(() => {
      if (!user) {
        try {
          const ids = JSON.parse(localStorage.getItem('ppr:guestOrderIds') || '[]');
          setGuestOrderIds(ids);
        } catch {
          setGuestOrderIds([]);
        }
      } else {
        setGuestOrderIds([]);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [user]);

  const { data: guestOrders = [], isLoading: guestLoading } = useGuestOrders(guestOrderIds);

  const orders     = user ? allOrders : guestOrders;
  const isLoadingDB = user ? adminLoading : guestLoading;

  // Real-time listener
  useEffect(() => {
    const channel = supabase
      .channel('orders_page_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders });
        queryClient.invalidateQueries({ queryKey: ['guest-orders'] });

        if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedOrder = payload.new;
          const orderId  = updatedOrder.id as string;
          const newStatus = updatedOrder.status as OrderStatus;
          const newDelay  = Number(updatedOrder.delay_minutes) || 0;

          const isRelevant = user
            ? updatedOrder.user_id === user.id
            : guestOrderIds.includes(orderId);

          if (isRelevant) {
            const oldStatus = previousStatusMapRef.current.get(orderId);
            const oldDelay  = previousDelayMapRef.current.get(orderId) || 0;

            if (oldStatus && oldStatus !== newStatus) {
              playOrderChimeSound();
              if (newStatus === 'preparing') {
                toast.success(`🔥 Kitchen Update: Order #${orderId}`, {
                  description: 'Your dish is now cooking fresh on the stove!',
                  duration: 6000,
                });
              } else if (newStatus === 'ready') {
                toast.success(`🍲 Order Ready: #${orderId}`, {
                  description: 'Your food is hot & packed — come pick up!',
                  duration: 7000,
                });
              } else if (newStatus === 'delivered') {
                toast.success(`✓ Order Completed: #${orderId}`, {
                  description: 'Thank you for dining with Pala Pitta Ruchulu!',
                  duration: 6000,
                });
              }
            }

            if (newDelay > oldDelay) {
              playOrderChimeSound();
              toast.info(`🕒 Kitchen update for #${orderId}`, {
                description: `Prep time extended by +${newDelay - oldDelay} mins for fresh simmering & quality.`,
                duration: 7000,
              });
            }

            previousStatusMapRef.current.set(orderId, newStatus);
            previousDelayMapRef.current.set(orderId, newDelay);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, user, guestOrderIds]);

  useEffect(() => {
    orders.forEach((o) => {
      previousStatusMapRef.current.set(o.id, o.status);
      previousDelayMapRef.current.set(o.id, o.delayMinutes || 0);
    });
  }, [orders]);

  const prepTimeMap = useMemo(() => {
    const map = new Map<string, number>();
    menuItems.forEach((mi) => { if (mi.prepTime) map.set(mi.id, mi.prepTime); });
    return map;
  }, [menuItems]);

  const getEstimatedMinutes = (order: Order): number | undefined => {
    if (order.status === 'delivered' || order.status === 'cancelled') return undefined;
    const prepTimes = order.items.map((item) => prepTimeMap.get(item.menuItemId) ?? 15);
    const basePrep  = Math.max(...prepTimes, 12);
    const totalPrep = basePrep + (order.delayMinutes || 0);
    if (order.status === 'preparing') return Math.max(5, totalPrep - 5);
    if (order.status === 'ready') return 0;
    return totalPrep;
  };

  const myOrders = useMemo(() => {
    return orders.filter((o) => user ? o.userId === user.id : guestOrderIds.includes(o.id));
  }, [orders, user, guestOrderIds]);

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const sorted = [...myOrders].sort((a, b) => {
      const aDate = new Date(`${a.orderDate} ${a.orderTime}`).getTime();
      const bDate = new Date(`${b.orderDate} ${b.orderTime}`).getTime();
      return bDate - aDate;
    });
    return sorted.filter((order) => {
      const matchesSearch = !needle ||
        order.id.toLowerCase().includes(needle) ||
        order.customerName.toLowerCase().includes(needle) ||
        order.customerPhone?.includes(needle) ||
        order.items.some((item) => item.name.toLowerCase().includes(needle));

      let matchesStatus: boolean;
      if (filterStatus === 'all') matchesStatus = true;
      else if (filterStatus === 'active') matchesStatus = isActiveStatus(order.status);
      else matchesStatus = order.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [myOrders, search, filterStatus]);

  const activeOrders = useMemo(() => filteredOrders.filter((o) => isActiveStatus(o.status)), [filteredOrders]);
  const pastOrders   = useMemo(() => filteredOrders.filter((o) => !isActiveStatus(o.status)), [filteredOrders]);

  const totalSpent = useMemo(() =>
    myOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.grandTotal || 0), 0),
    [myOrders]
  );

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    toast.success(`Order ID copied`);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleReorder = (items: OrderItem[]) => {
    let addedCount = 0;
    const addItem = useCartStore.getState().addItem;
    items.forEach((item) => {
      addItem({
        id: item.menuItemId,
        name: item.name,
        category: 'starters',
        price: item.price,
        image: FALLBACK_DISH_IMAGE,
        vegStatus: item.vegStatus || 'non-veg',
        rating: 4.8,
        reviewCount: 50,
        isPopular: true,
        isSpecial: false,
        isAvailable: true,
        description: item.name,
        prepTime: 20,
        tags: [],
      });
      addedCount += item.quantity || 1;
    });
    toast.success(`${addedCount} item${addedCount === 1 ? '' : 's'} added to cart`);
    router.push('/checkout');
  };

  const liveCount      = myOrders.filter((o) => isActiveStatus(o.status)).length;
  const completedCount = myOrders.filter((o) => o.status === 'delivered').length;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FDFBF7] pb-24 text-stone-900">

        {/* ── Sticky Header ── */}
        <div className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-[56px] z-20 shadow-xs">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-300/40 flex items-center justify-center text-amber-600 shrink-0">
                  <ReceiptText className="size-5" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-stone-950 tracking-tight flex items-center gap-2">
                    My Orders
                    {filteredOrders.length > 0 && (
                      <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full tabular-nums">
                        {filteredOrders.length}
                      </span>
                    )}
                  </h1>
                  <p className="text-xs text-stone-500 hidden sm:block">Live kitchen tracking & complete order history</p>
                </div>
              </div>

              {/* Search + Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search orders…"
                    className="h-9 pl-9 pr-8 text-xs rounded-xl border-stone-200 bg-stone-50 focus-visible:ring-amber-400/30"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                <div className="flex gap-1 bg-stone-100 p-1 rounded-xl">
                  {STATUS_FILTERS.map((f) => {
                    const isActive = filterStatus === f.value;
                    const count = f.value === 'all' ? myOrders.length
                      : f.value === 'active' ? liveCount
                      : myOrders.filter((o) => o.status === f.value).length;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setFilterStatus(f.value)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1',
                          isActive ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-500 hover:text-stone-900'
                        )}
                      >
                        {f.label}
                        {count > 0 && (
                          <span className={cn(
                            'text-[10px] font-mono px-1 rounded-md tabular-nums',
                            isActive ? 'text-white/70' : 'text-stone-400'
                          )}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 mt-6 space-y-8">

          {/* Stats row */}
          {!isLoadingDB && myOrders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total Orders" value={myOrders.length.toString()} icon={ShoppingBag} color="stone" />
              <StatCard label="Live In-Kitchen" value={liveCount.toString()} icon={Flame} color="amber" />
              <StatCard label="Completed" value={completedCount.toString()} icon={CheckCircle2} color="emerald" />
              <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={Wallet} color="violet" />
            </div>
          )}

          {/* Loading */}
          {isLoadingDB ? (
            <div className="space-y-4" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-3xl" />
              ))}
            </div>

          // Empty
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-xs">
              <EmptyState
                icon={ShoppingBag}
                title={myOrders.length === 0 ? 'No orders yet' : 'No matching orders found'}
                description={
                  myOrders.length === 0
                    ? 'You haven\'t placed any orders yet. Explore our authentic menu and order delicious Telugu dishes now!'
                    : 'We couldn\'t find any orders matching your search or filters.'
                }
                action={
                  myOrders.length === 0 ? (
                    <Button asChild variant="brand" className="rounded-xl font-bold h-11 px-6">
                      <Link href="/menu">
                        Explore Menu <ArrowRight className="size-4 ml-1.5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="rounded-xl font-bold h-10 px-5"
                      onClick={() => { setSearch(''); setFilterStatus('all'); }}
                    >
                      Reset filters
                    </Button>
                  )
                }
              />
            </div>

          ) : (
            <div className="space-y-10">

              {/* ── Active Orders Section ── */}
              {activeOrders.length > 0 && filterStatus !== 'delivered' && filterStatus !== 'cancelled' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                      </span>
                      <h2 className="text-lg font-black text-stone-900">
                        Live Tracking ({activeOrders.length})
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      Auto-updated
                    </span>
                  </div>

                  <div className="space-y-4">
                    {activeOrders.map((order) => (
                      <ActiveOrderCard
                        key={order.id}
                        order={order}
                        estimatedMinutes={getEstimatedMinutes(order)}
                        onReorder={handleReorder}
                        onCopyId={handleCopyOrderId}
                        isCopied={copiedOrderId === order.id}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Order History Section ── */}
              {pastOrders.length > 0 && filterStatus !== 'active' && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <h2 className="text-lg font-black text-stone-900">
                      Order History ({pastOrders.length})
                    </h2>
                  </div>

                  <div className="rounded-3xl border border-stone-200 bg-white shadow-xs overflow-hidden divide-y divide-stone-100">
                    {pastOrders.map((order) => (
                      <HistoryOrderRow
                        key={order.id}
                        order={order}
                        onReorder={handleReorder}
                        onCopyId={handleCopyOrderId}
                        isCopied={copiedOrderId === order.id}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'stone' | 'amber' | 'emerald' | 'violet';
}) {
  const palette = {
    stone:   { bg: 'bg-white border-stone-200',   icon: 'text-stone-500',   value: 'text-stone-900' },
    amber:   { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-600',   value: 'text-amber-800' },
    emerald: { bg: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600', value: 'text-emerald-800' },
    violet:  { bg: 'bg-violet-50 border-violet-200', icon: 'text-violet-600', value: 'text-violet-800' },
  }[color];

  return (
    <div className={cn('rounded-2xl border p-4 shadow-2xs flex flex-col gap-2', palette.bg)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</span>
        <Icon className={cn('size-4', palette.icon)} />
      </div>
      <span className={cn('text-2xl font-black tabular-nums leading-none', palette.value)}>
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active Order Card — full-width hero with tracker                   */
/* ------------------------------------------------------------------ */

function ActiveOrderCard({
  order,
  estimatedMinutes,
  onReorder,
  onCopyId,
  isCopied,
}: {
  order: Order;
  estimatedMinutes?: number;
  onReorder: (items: OrderItem[]) => void;
  onCopyId: (id: string) => void;
  isCopied: boolean;
}) {
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  const StatusIcon = meta.icon;
  const isPaid = order.paymentStatus === 'paid';
  const hasDelay = (order.delayMinutes || 0) > 0;
  const showEta = estimatedMinutes != null && estimatedMinutes > 0;

  return (
    <div className="rounded-3xl border-2 border-amber-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-50/30 px-5 py-4 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Token */}
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
            #{order.id.slice(-4)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-stone-700 select-all">
                {order.id}
              </span>
              <button
                type="button"
                onClick={() => onCopyId(order.id)}
                className="text-stone-400 hover:text-stone-700 transition-colors"
                title="Copy order ID"
              >
                {isCopied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-stone-500">
              <span>{order.orderDate} · {order.orderTime}</span>
              <span className="font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded uppercase text-[10px]">
                {order.orderType || 'Takeaway'}
              </span>
              {order.customerName && (
                <span className="text-stone-600 font-medium">{order.customerName}</span>
              )}
              {order.customerPhone && (
                <span className="flex items-center gap-0.5 text-stone-400">
                  <Phone className="size-2.5" /> {order.customerPhone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {showEta && <EtaCountdown minutes={estimatedMinutes!} />}
          <div className={cn('flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl border', meta.colors)}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <StatusIcon className="size-3.5" />
            {meta.label}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Delay banner */}
        {hasDelay && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
            <Hourglass className="size-4 text-amber-600 shrink-0" />
            Kitchen added +{order.delayMinutes} mins to ensure slow-simmered freshness.
          </div>
        )}

        {/* OrderTracker stepper */}
        <OrderTracker status={order.status} estimatedMinutes={estimatedMinutes} />

        {/* Dishes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
              Dishes ({order.items.reduce((s, i) => s + (i.quantity || 1), 0)} items)
            </span>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-stone-50/60 divide-y divide-stone-100 overflow-hidden max-h-48 overflow-y-auto">
            {order.items.map((item, idx) => (
              <div
                key={`${item.menuItemId}-${idx}`}
                className="flex items-center justify-between px-3 py-2.5 gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    'size-3 shrink-0 rounded-sm border-[1.5px] flex items-center justify-center',
                    item.vegStatus === 'veg' ? 'border-emerald-600' : 'border-rose-600'
                  )}>
                    <span className={cn('size-1.5 rounded-full', item.vegStatus === 'veg' ? 'bg-emerald-600' : 'bg-rose-600')} />
                  </span>
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                    {item.quantity}×
                  </span>
                  <span className="font-bold text-stone-900 text-sm truncate">{item.name}</span>
                  {item.selectedPortion && (
                    <span className="text-[9px] font-black uppercase bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded shrink-0">
                      {item.selectedPortion}
                    </span>
                  )}
                </div>
                <span className="font-bold text-stone-900 tabular-nums text-sm shrink-0">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-stone-100">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-stone-950 tabular-nums">{formatCurrency(order.grandTotal)}</span>
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full border',
              isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            )}>
              {isPaid ? 'Paid' : 'Pay at Counter'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ViewBillDialog order={order} className="rounded-xl h-9 px-4 font-bold text-xs border-stone-200" />
            <Button
              variant="brand"
              size="sm"
              className="rounded-xl h-9 px-4 font-bold text-xs shadow-xs"
              onClick={() => onReorder(order.items)}
            >
              <RotateCcw className="size-3.5 mr-1.5" /> Reorder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  History Order Row — compact list row                               */
/* ------------------------------------------------------------------ */

function HistoryOrderRow({
  order,
  onReorder,
  onCopyId,
  isCopied,
}: {
  order: Order;
  onReorder: (items: OrderItem[]) => void;
  onCopyId: (id: string) => void;
  isCopied: boolean;
}) {
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  const StatusIcon = meta.icon;
  const isCancelled = order.status === 'cancelled';
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-stone-50/80 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Left: token + meta */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-base font-black text-stone-950 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-xl shrink-0">
            #{order.id.slice(-4)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-stone-400 truncate">{order.id}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCopyId(order.id); }}
                className="text-stone-300 hover:text-stone-600 transition-colors"
              >
                {isCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-stone-400">{order.orderDate} · {order.orderTime}</span>
              <span className="text-[10px] font-bold text-stone-500 uppercase bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded">
                {order.orderType || 'takeaway'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: status badge + total + actions */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <div className={cn('flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1.5 rounded-xl border', meta.colors)}>
            <StatusIcon className="size-3" />
            {meta.label}
          </div>

          <span className="font-black text-stone-900 tabular-nums text-sm">{formatCurrency(order.grandTotal)}</span>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <ViewBillDialog order={order} className="rounded-xl h-8 px-3 font-bold text-xs border-stone-200" />
            {!isCancelled && (
              <Button
                variant="brand"
                size="sm"
                className="rounded-xl h-8 px-3 font-bold text-xs"
                onClick={(e) => { e.stopPropagation(); onReorder(order.items); }}
              >
                <RotateCcw className="size-3 mr-1" /> Reorder
              </Button>
            )}
          </div>

          <TrendingUp className={cn('size-3.5 text-stone-300 transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>

      {/* Expanded dishes preview */}
      {expanded && (
        <div className="px-5 pb-4 bg-stone-50/60 border-t border-stone-100">
          <div className="pt-3 space-y-1.5">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-stone-700">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-amber-800 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                    {item.quantity}×
                  </span>
                  <span className="font-semibold truncate">{item.name}</span>
                  {item.selectedPortion && (
                    <span className="text-[9px] font-black uppercase text-stone-400 bg-stone-200 px-1 rounded">{item.selectedPortion}</span>
                  )}
                </div>
                <span className="font-bold text-stone-900 tabular-nums shrink-0">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
