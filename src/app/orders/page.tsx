'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ReceiptText, RotateCcw, Search, ShoppingBag,
  ArrowRight, X, Copy, Check, ChevronDown,
  Flame, CheckCircle2,
  Hourglass, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatCurrency, displayNameWithoutPortion } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import OrderTracker from '@/components/customer/OrderTracker';
import ViewBillDialog from '@/components/bill/ViewBillDialog';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCartStore } from '@/store/useCartStore';
import { useOrderEventStore } from '@/store/useOrderEventStore';
import { useGuestOrders, useMyOrders } from '@/lib/queries';
import { playOrderChimeSound } from '@/lib/audio';
import type { Order, PersistedOrderItem, OrderStatus } from '@/types';
import { orderItemId } from '@/lib/orderItems';
import { classifyOrderCategory, getStatusBadgeMeta } from '@/lib/orderCategory';
import { buildPrepTimeMap, estimateOrderMinutes } from '@/lib/orderEstimate';

import { Container } from '@/components/customer/Container';
import { FilterPill, VegMark } from '@/components/customer/store-ui';
import { Skeleton } from '@/components/ui/skeleton';

/* ------------------------------------------------------------------ */
/*  Constants & Helpers                                                 */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Live' },
  { value: 'delivered', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

function isActiveStatus(status: string): boolean {
  return ['pending', 'preparing', 'ready'].includes(status);
}

/* ------------------------------------------------------------------ */
/*  Main Orders Page                                                    */
/* ------------------------------------------------------------------ */

export default function OrderHistoryPage() {
  const { menuItems } = useAdmin();
  const { user } = useAuth();
  const router = useRouter();
  // Scoped server-side by user_id — not the entire `orders` table filtered
  // down in the browser (see useMyOrders' own comment for why that mattered).
  const { data: myOrdersData = [], isLoading: myOrdersLoading, isError: myOrdersErrored, refetch: refetchMyOrders } = useMyOrders(user?.id ?? null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // Read synchronously on mount (guarded for SSR, where `window` doesn't
  // exist) rather than via a deferred setTimeout(…, 0). The deferral meant
  // guestOrderIds was always `[]` for the very first client render, so a
  // returning guest briefly saw "No orders yet" before the real list
  // snapped in a tick later.
  const [guestOrderIds, setGuestOrderIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(window.localStorage.getItem('ppr:guestOrderIds') || '[]');
    } catch {
      return [];
    }
  });
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const previousStatusMapRef = useRef<Map<string, OrderStatus>>(new Map());
  const previousDelayMapRef  = useRef<Map<string, number>>(new Map());

  // Re-syncs when auth resolves: a logged-in user has no use for guest IDs,
  // and a guest who places another order elsewhere in the same session picks
  // up the new ID the next time this effect re-runs.
  useEffect(() => {
    if (user) {
      setGuestOrderIds([]);
      return;
    }
    try {
      const ids = JSON.parse(localStorage.getItem('ppr:guestOrderIds') || '[]');
      setGuestOrderIds(ids);
    } catch {
      setGuestOrderIds([]);
    }
  }, [user]);

  const { data: guestOrders = [], isLoading: guestLoading, isError: guestOrdersErrored, refetch: refetchGuestOrders } = useGuestOrders(guestOrderIds);

  const orders     = user ? myOrdersData : guestOrders;
  const isLoadingDB = user ? myOrdersLoading : guestLoading;
  // A failed fetch used to settle into the same "No orders yet" empty state
  // as an actually-empty list once retries exhausted — indistinguishable from
  // "you have no orders" when the real story was "we couldn't reach the
  // server," which is exactly the case a customer most needs to be told about.
  const hasLoadError = user ? myOrdersErrored : guestOrdersErrored;
  const retryLoadOrders = () => { void (user ? refetchMyOrders() : refetchGuestOrders()); };

  // "Kitchen updated your order" toast/chime — reacts to the single shared
  // `orders` subscription RealtimeProvider already holds (via
  // useOrderEventStore) instead of opening a second, identical channel to
  // the same table just to get the same payloads.
  const lastOrderEvent = useOrderEventStore((s) => s.lastEvent);
  useEffect(() => {
    if (!lastOrderEvent || lastOrderEvent.eventType !== 'UPDATE') return;

    const { orderId, userId, status: newStatus, delayMinutes: newDelay } = lastOrderEvent;
    const isRelevant = user ? userId === user.id : guestOrderIds.includes(orderId);
    if (!isRelevant) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOrderEvent]);

  useEffect(() => {
    orders.forEach((o) => {
      previousStatusMapRef.current.set(o.id, o.status);
      previousDelayMapRef.current.set(o.id, o.delayMinutes || 0);
    });
  }, [orders]);

  const prepTimeMap = useMemo(() => buildPrepTimeMap(menuItems), [menuItems]);
  const getEstimatedMinutes = (order: Order) => estimateOrderMinutes(order, prepTimeMap);

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

  // Looks each line up against the live menu instead of fabricating a
  // MenuItem from order history — a fabricated item carried a fake rating,
  // a hardcoded 'starters' category, and `isAvailable: true` regardless of
  // whether the dish was later delisted or sold out, so a reorder could
  // silently re-add something the kitchen can no longer make. Lines whose
  // dish is gone are skipped and called out, rather than added anyway.
  const handleReorder = (items: PersistedOrderItem[]) => {
    const addItem = useCartStore.getState().addItem;
    let addedCount = 0;
    let unavailableCount = 0;

    items.forEach((item) => {
      const menuItem = menuItems.find((m) => m.id === orderItemId(item));
      if (!menuItem || menuItem.isAvailable === false) {
        unavailableCount += 1;
        return;
      }
      const qty = Math.max(1, item.quantity || 1);
      const portion = item.selectedPortion;
      const selectedPrice = portion ? menuItem.portionPrices?.[portion] ?? menuItem.price : menuItem.price;

      addItem({ ...menuItem, selectedPortion: portion, selectedPrice }, qty);
      addedCount += qty;
    });

    if (addedCount > 0) {
      toast.success(`${addedCount} item${addedCount === 1 ? '' : 's'} added to cart`);
    }
    if (unavailableCount > 0) {
      toast.error(
        `${unavailableCount} item${unavailableCount === 1 ? '' : 's'} no longer available and ${unavailableCount === 1 ? "wasn't" : "weren't"} added`
      );
    }
    if (addedCount > 0) router.push('/checkout');
  };

  const liveCount      = myOrders.filter((o) => isActiveStatus(o.status)).length;
  const completedCount = myOrders.filter((o) => o.status === 'delivered').length;

  return (
    <div className="bg-store flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── Sticky filter bar ────────────────────────────────────────
            Search and the status pills stay reachable while a long history
            scrolls, because "find the order from last Tuesday" is the only
            reason anyone opens this page twice. */}
        <div
          className="border-hair-1 bg-store/92 sticky z-30 border-b backdrop-blur-md"
          style={{ top: 'var(--store-header-h)' }}
        >
          <Container className="max-w-[1280px] py-2.5 md:py-3.5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="relative h-11 w-full md:max-w-[300px]">
                <Search className="text-ink-4 pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by dish or order ID…"
                  aria-label="Search orders"
                  className={cn(
                    'border-hair-1 text-ink-1 placeholder:text-ink-4 h-11 w-full rounded-full border bg-white pr-10 pl-11 text-[14px] font-medium',
                    'transition-colors outline-none focus:border-brand-300 focus:ring-[3px] focus:ring-brand/15',
                    '[&::-webkit-search-cancel-button]:appearance-none'
                  )}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="text-ink-4 hover:text-ink-1 absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <div className="scrollbar-none -mx-4 flex h-10 items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
                {STATUS_FILTERS.map((f) => {
                  const count =
                    f.value === 'all' ? myOrders.length
                    : f.value === 'active' ? liveCount
                    : myOrders.filter((o) => o.status === f.value).length;

                  return (
                    <FilterPill
                      key={f.value}
                      active={filterStatus === f.value}
                      onClick={() => setFilterStatus(f.value)}
                    >
                      {f.label}
                      {count > 0 && (
                        <span className="tabular-nums opacity-60">{count}</span>
                      )}
                    </FilterPill>
                  );
                })}
              </div>
            </div>
          </Container>
        </div>

        <Container className="max-w-[1280px] py-6 sm:py-8">
          <header className="mb-6">
            <h1 className="text-ink-1 font-display text-[22px] font-black tracking-tight sm:text-[26px]">
              My orders
            </h1>
            <p className="text-ink-3 mt-1 text-[13px]">
              Live kitchen tracking and everything you have ordered before.
            </p>
          </header>

          {/* Summary strip. Only once there is something to summarise — four
              zeroes above an empty list is noise pretending to be a dashboard. */}
          {!isLoadingDB && myOrders.length > 0 && (
            <div className="border-hair-1 shadow-store mb-8 grid grid-cols-2 rounded-2xl border bg-white sm:grid-cols-4">
              <Stat label="Orders" value={myOrders.length.toString()} icon={ShoppingBag} />
              <Stat label="In kitchen" value={liveCount.toString()} icon={Flame} accent={liveCount > 0} />
              <Stat label="Completed" value={completedCount.toString()} icon={CheckCircle2} />
              <Stat label="Total spent" value={formatCurrency(totalSpent)} icon={Wallet} />
            </div>
          )}

          {isLoadingDB ? (
            <div className="space-y-4" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full rounded-2xl" />
              ))}
            </div>
          ) : hasLoadError ? (
            <div className="border-hair-1 grid place-items-center rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
              <span className="bg-nonveg/10 text-nonveg mb-4 grid size-16 place-items-center rounded-full">
                <ReceiptText className="size-8" />
              </span>
              <h2 className="text-ink-1 text-[17px] font-extrabold">Couldn&apos;t load your orders</h2>
              <p className="text-ink-3 mt-1.5 max-w-sm text-[13.5px] leading-relaxed">
                Something went wrong reaching the server. Your orders are safe — try again in a moment.
              </p>
              <button
                type="button"
                onClick={retryLoadOrders}
                className="bg-brand hover:bg-brand-600 mt-5 h-11 rounded-xl px-6 text-[14px] font-extrabold text-white transition-colors"
              >
                Try again
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="border-hair-1 grid place-items-center rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
              <span className="bg-brand-50 text-brand-500 mb-4 grid size-16 place-items-center rounded-full">
                <ReceiptText className="size-8" />
              </span>
              <h2 className="text-ink-1 text-[17px] font-extrabold">
                {myOrders.length === 0 ? 'No orders yet' : 'Nothing matches that'}
              </h2>
              <p className="text-ink-3 mt-1.5 max-w-sm text-[13.5px] leading-relaxed">
                {myOrders.length === 0
                  ? 'Once you place an order it will show up here, with live kitchen tracking while it cooks.'
                  : 'Try a different search, or switch back to All.'}
              </p>
              {myOrders.length === 0 ? (
                <Link
                  href="/menu"
                  className="bg-brand hover:bg-brand-600 mt-5 inline-flex h-11 items-center gap-2 rounded-xl px-6 text-[14px] font-extrabold text-white transition-colors"
                >
                  Explore the menu
                  <ArrowRight className="size-[18px]" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setFilterStatus('all'); }}
                  className="border-hair-1 text-ink-2 hover:bg-hair-2 mt-5 h-11 rounded-xl border px-6 text-[14px] font-bold transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              {activeOrders.length > 0 && filterStatus !== 'delivered' && filterStatus !== 'cancelled' && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex size-2.5">
                      <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-70" />
                      <span className="bg-brand relative inline-flex size-2.5 rounded-full" />
                    </span>
                    <h2 className="text-ink-1 font-display text-[18px] font-extrabold tracking-tight">
                      Happening now
                      <span className="text-ink-4 ml-1.5 text-[15px] font-semibold tabular-nums">
                        ({activeOrders.length})
                      </span>
                    </h2>
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

              {pastOrders.length > 0 && filterStatus !== 'active' && (
                <section className="space-y-4">
                  <h2 className="text-ink-1 font-display text-[18px] font-extrabold tracking-tight">
                    Past orders
                    <span className="text-ink-4 ml-1.5 text-[15px] font-semibold tabular-nums">
                      ({pastOrders.length})
                    </span>
                  </h2>

                  <div className="border-hair-1 shadow-store divide-hair-2 overflow-hidden rounded-2xl border bg-white">
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
        </Container>
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary tile                                                        */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="border-hair-2 flex items-center gap-3 border-r border-b px-4 py-3.5 last:border-r-0 sm:border-b-0">
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-xl',
          accent ? 'bg-brand-50 text-brand-600' : 'bg-hair-2 text-ink-4'
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="text-ink-4 block text-[11px] font-bold tracking-wide uppercase">
          {label}
        </span>
        <span className="text-ink-1 block truncate text-[17px] leading-tight font-extrabold tabular-nums">
          {value}
        </span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                         */
/* ------------------------------------------------------------------ */

function StatusChip({ status, items }: { status: OrderStatus; items?: PersistedOrderItem[] }) {
  const categoryType = classifyOrderCategory(items);
  const meta = getStatusBadgeMeta(status, categoryType);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-extrabold',
        meta.colors
      )}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

function OrderIdLine({
  order,
  onCopyId,
  isCopied,
}: {
  order: Order;
  onCopyId: (id: string) => void;
  isCopied: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-ink-2 text-[12.5px] font-bold select-all">{order.id}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCopyId(order.id); }}
        aria-label="Copy order ID"
        className="text-ink-4 hover:text-ink-1 transition-colors"
      >
        {isCopied ? <Check className="text-veg size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <span className="text-ink-4 text-[12px]">
        {order.orderDate} · {order.orderTime}
      </span>
    </div>
  );
}

function ItemLine({ item }: { item: PersistedOrderItem }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <VegMark status={item.vegStatus || 'non-veg'} size={13} />
        <span className="text-ink-1 truncate text-[13.5px] font-semibold">
          {displayNameWithoutPortion(item.name, item.selectedPortion)}
        </span>
        {item.selectedPortion && (
          <span className="text-ink-4 bg-hair-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
            {item.selectedPortion}
          </span>
        )}
        <span className="text-ink-4 shrink-0 text-[12.5px] font-semibold tabular-nums">
          × {item.quantity}
        </span>
      </span>
      <span className="text-ink-1 shrink-0 text-[13px] font-bold tabular-nums">
        {formatCurrency(item.price * item.quantity)}
      </span>
    </div>
  );
}

function ReorderButton({
  items,
  onReorder,
  compact = false,
}: {
  items: PersistedOrderItem[];
  onReorder: (items: PersistedOrderItem[]) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onReorder(items); }}
      className={cn(
        'bg-brand hover:bg-brand-600 inline-flex items-center gap-1.5 rounded-lg font-extrabold text-white transition-colors',
        compact ? 'h-8 px-3 text-[12px]' : 'h-9 px-4 text-[13px]'
      )}
    >
      <RotateCcw className={compact ? 'size-3.5' : 'size-4'} />
      Reorder
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Active order — full card with the live tracker                      */
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
  onReorder: (items: PersistedOrderItem[]) => void;
  onCopyId: (id: string) => void;
  isCopied: boolean;
}) {
  const isPaid = order.paymentStatus === 'paid';
  const hasDelay = (order.delayMinutes || 0) > 0;
  const itemCount = order.items.reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <article className="border-brand-200 shadow-store overflow-hidden rounded-2xl border bg-white">
      <header className="border-hair-2 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {/* The last four digits are what the counter asks for, so they get
              to be the big number rather than the full 16-character ID. */}
          <span className="bg-brand grid size-11 shrink-0 place-items-center rounded-xl text-[13px] font-black text-white">
            {order.id.slice(-4)}
          </span>
          <div className="min-w-0">
            <OrderIdLine order={order} onCopyId={onCopyId} isCopied={isCopied} />
            <p className="text-ink-4 mt-0.5 text-[12px]">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · {order.orderType || 'Takeaway'}
              {order.customerName ? ` · ${order.customerName}` : ''}
            </p>
          </div>
        </div>

        <StatusChip status={order.status} items={order.items} />
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {hasDelay && (
          <p className="border-brand-200 bg-brand-50 text-brand-800 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-semibold">
            <Hourglass className="text-brand size-4 shrink-0" />
            The kitchen added {order.delayMinutes} minutes to get this right.
          </p>
        )}

        <OrderTracker
          status={order.status}
          estimatedMinutes={estimatedMinutes}
          items={order.items}
          orderType={order.orderType}
          tableNumber={order.tableNumber}
        />

        <div className="border-hair-1 divide-hair-2 max-h-52 divide-y overflow-y-auto rounded-xl border px-3.5">
          {order.items.map((item, idx) => (
            <ItemLine key={`${item.menuItemId}-${idx}`} item={item} />
          ))}
        </div>
      </div>

      <footer className="border-hair-2 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3.5 sm:px-5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-ink-1 text-[19px] font-black tabular-nums">
            {formatCurrency(order.grandTotal)}
          </span>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-bold',
              isPaid ? 'bg-veg/10 text-veg' : 'bg-brand-50 text-brand-700'
            )}
          >
            {isPaid ? 'Paid' : 'Pay at counter'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ViewBillDialog
            order={order}
            className="border-hair-1 text-ink-2 h-9 rounded-lg px-4 text-[13px] font-bold"
          />
          <ReorderButton items={order.items} onReorder={onReorder} />
        </div>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  History row — collapsed by default, expands to the dishes           */
/* ------------------------------------------------------------------ */

function HistoryOrderRow({
  order,
  onReorder,
  onCopyId,
  isCopied,
}: {
  order: Order;
  onReorder: (items: PersistedOrderItem[]) => void;
  onCopyId: (id: string) => void;
  isCopied: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCancelled = order.status === 'cancelled';
  const itemCount = order.items.reduce((s, i) => s + (i.quantity || 1), 0);

  const toggle = () => setExpanded((v) => !v);

  return (
    <div className="border-hair-2 border-b last:border-b-0">
      {/* A <div role="button">, not a real <button>: OrderIdLine renders its
          own copy button inside this row, and a <button> nested inside a
          <button> is invalid HTML — browsers repair it by closing the outer
          button early, which desyncs the DOM from React's tree and made the
          copy icon's click unreliable. */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={expanded}
        className="hover:bg-hair-2/60 focus-visible:ring-brand/30 flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors outline-none focus-visible:ring-[3px] sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-hair-2 text-ink-2 grid size-10 shrink-0 place-items-center rounded-xl text-[12.5px] font-black">
            {order.id.slice(-4)}
          </span>
          <div className="min-w-0">
            <OrderIdLine order={order} onCopyId={onCopyId} isCopied={isCopied} />
            <p className="text-ink-4 mt-0.5 text-[12px]">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · {order.orderType || 'takeaway'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <StatusChip status={order.status} items={order.items} />
          <span className="text-ink-1 text-[14px] font-extrabold tabular-nums">
            {formatCurrency(order.grandTotal)}
          </span>
          <ChevronDown
            className={cn('text-ink-4 size-4 transition-transform', expanded && 'rotate-180')}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-hair-2 bg-hair-2/40 border-t px-4 py-3 sm:px-5">
          <div className="divide-hair-2 divide-y">
            {order.items.map((item, idx) => (
              <ItemLine key={`${item.menuItemId}-${idx}`} item={item} />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <ViewBillDialog
              order={order}
              className="border-hair-1 text-ink-2 h-8 rounded-lg bg-white px-3 text-[12px] font-bold"
            />
            {!isCancelled && (
              <ReorderButton items={order.items} onReorder={onReorder} compact />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
