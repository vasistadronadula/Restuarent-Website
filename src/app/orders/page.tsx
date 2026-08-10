'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote, CreditCard, Phone, ReceiptText, RotateCcw, Search, ShoppingBag, User,
  CheckCircle2, AlertCircle, Clock, Calendar, Hash, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatCurrency, FALLBACK_DISH_IMAGE } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import { Container } from '@/components/customer/Container';
import ViewBillDialog from '@/components/bill/ViewBillDialog';
import { generateInvoiceNo } from '@/lib/idGenerator';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCartStore } from '@/store/useCartStore';
import { useGuestOrders } from '@/lib/queries';
import type { Order, OrderItem } from '@/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Completed' },
] as const;

const STATUS_PRESENTATION: Record<
  string,
  { label: string; variant: 'soft-success' | 'soft-warning' | 'soft-info' | 'soft-destructive' | 'soft-muted' }
> = {
  delivered: { label: 'Completed', variant: 'soft-success' },
  preparing: { label: 'Preparing in kitchen', variant: 'soft-warning' },
  ready: { label: 'Ready for pickup', variant: 'soft-info' },
  cancelled: { label: 'Cancelled', variant: 'soft-destructive' },
  pending: { label: 'Awaiting confirmation', variant: 'soft-muted' },
};

const STATUS_ACCENTS: Record<string, string> = {
  delivered: 'border-l-4 border-l-emerald-500 dark:border-l-emerald-600',
  preparing: 'border-l-4 border-l-amber-500 dark:border-l-amber-600',
  ready: 'border-l-4 border-l-cyan-500 dark:border-l-cyan-600',
  cancelled: 'border-l-4 border-l-rose-500 dark:border-l-rose-600',
  pending: 'border-l-4 border-l-stone-400 dark:border-l-stone-600',
};

const STAGES = [
  { key: 'pending', label: 'Placed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Completed' },
];

function getStageIndex(status: string) {
  switch (status) {
    case 'pending': return 0;
    case 'preparing': return 1;
    case 'ready': return 2;
    case 'delivered': return 3;
    case 'cancelled': return -1;
    default: return 0;
  }
}

function OrderStageTracker({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <div className="my-1.5 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400 text-xs font-semibold">
        <AlertCircle className="size-4 shrink-0" />
        <span>This order has been cancelled</span>
      </div>
    );
  }

  const currentStageIndex = getStageIndex(status);

  return (
    <div className="my-2.5 py-1">
      <div className="relative flex items-center justify-between max-w-md mx-auto">
        <div className="absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 bg-stone-100 dark:bg-stone-800 -z-0" />
        <div
          className="absolute top-1/2 left-4 h-0.5 -translate-y-1/2 bg-amber-500 transition-all duration-500 -z-0"
          style={{
            width: `${Math.min(100, Math.max(0, (currentStageIndex / (STAGES.length - 1)) * 88))}%`,
          }}
        />

        {STAGES.map((stage, idx) => {
          const isDone = currentStageIndex >= idx;
          const isCurrent = currentStageIndex === idx;

          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center gap-1.5 bg-white dark:bg-stone-900 px-1">
              <div
                className={cn(
                  'flex size-6.5 items-center justify-center rounded-full text-[10px] font-extrabold transition-all shadow-xs border',
                  isDone
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-stone-50 dark:bg-stone-850 border-stone-200 dark:border-stone-800 text-stone-400',
                  isCurrent && 'ring-4 ring-amber-500/20 scale-105'
                )}
              >
                {isDone ? <CheckCircle2 className="size-3.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[9.5px] font-bold tracking-tight',
                  isCurrent
                    ? 'text-amber-600 dark:text-amber-400 font-black'
                    : isDone
                    ? 'text-stone-800 dark:text-stone-200'
                    : 'text-stone-400'
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderHistoryPage() {
  const { orders: allOrders, isLoadingDB: adminLoading } = useAdmin();
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [guestOrderIds, setGuestOrderIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (!user) {
      try {
        const ids = JSON.parse(localStorage.getItem('ppr:guestOrderIds') || '[]');
        setGuestOrderIds(ids);
      } catch {}
    } else {
      setGuestOrderIds([]);
    }
  }, [user]);

  const { data: guestOrders = [], isLoading: guestLoading } = useGuestOrders(guestOrderIds);

  const orders = user ? allOrders : guestOrders;
  const isLoadingDB = user ? adminLoading : guestLoading;

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return orders.filter((order) => {
      const userMatch = user
        ? order.userId === user.id
        : guestOrderIds.includes(order.id);

      const matchesSearch =
        !needle ||
        order.id.toLowerCase().includes(needle) ||
        order.customerName.toLowerCase().includes(needle) ||
        order.customerPhone?.includes(needle) ||
        order.items.some((item) => item.name.toLowerCase().includes(needle));

      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

      return userMatch && matchesSearch && matchesStatus;
    });
  }, [orders, user, guestOrderIds, search, filterStatus]);

  const totalCount = orders.length;
  const activeCount = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'delivered').length;

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

    toast.success(`${addedCount} ${addedCount === 1 ? 'item' : 'items'} added to your cart`);
    router.push('/checkout');
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen py-6 md:py-8 bg-stone-50/50 dark:bg-stone-950/30">
        <Container className="max-w-4xl">
          {/* Header Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display flex items-center gap-2.5 text-2xl font-black tracking-tight">
                <ReceiptText className="text-amber-600 size-7" />
                My Orders
              </h1>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {user
                  ? 'Manage and track all orders associated with your profile.'
                  : 'Showing orders placed as a guest on this browser.'}
              </p>
            </div>

            {/* Pulsing indicator badge */}
            <div className="inline-flex items-center gap-1.5 self-start md:self-center bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              Realtime Updates Active
            </div>
          </div>

          {/* Stats Bar */}
          {totalCount > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 sm:p-4 shadow-2xs hover:shadow-xs transition-shadow">
                <span className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-wider block">Total Orders</span>
                <span className="text-lg sm:text-2xl font-black text-stone-900 dark:text-stone-100 mt-1 block">{totalCount}</span>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 sm:p-4 shadow-2xs hover:shadow-xs transition-shadow">
                <span className="text-[10px] sm:text-xs font-bold text-amber-500 uppercase tracking-wider block">In Progress</span>
                <span className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-500 mt-1 block">{activeCount}</span>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-3 sm:p-4 shadow-2xs hover:shadow-xs transition-shadow">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-500 uppercase tracking-wider block">Completed</span>
                <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-500 mt-1 block">{completedCount}</span>
              </div>
            </div>
          )}

          {/* ── Filters & Search ───────────────────────────────────────── */}
          <div className="mb-6 grid gap-3 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-3 sm:p-4 rounded-2xl shadow-2xs">
            <div className="relative">
              <Search
                className="text-stone-400 pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order ID, dish name or phone number..."
                aria-label="Search orders"
                className="pl-10.5 rounded-xl border-stone-200 dark:border-stone-800 focus-visible:ring-amber-500/20"
              />
            </div>

            <ToggleGroup
              type="single"
              variant="soft"
              value={filterStatus}
              onValueChange={(v) => v && setFilterStatus(v)}
              className="w-full justify-start overflow-x-auto scrollbar-none gap-1 bg-stone-50 dark:bg-stone-950 p-1 rounded-xl border border-stone-100 dark:border-stone-900"
              aria-label="Filter by status"
            >
              {STATUS_FILTERS.map((f) => (
                <ToggleGroupItem
                  key={f.value}
                  value={f.value}
                  className="shrink-0 rounded-lg text-xs font-bold px-3.5 py-1.5 data-[state=on]:bg-white dark:data-[state=on]:bg-stone-900 data-[state=on]:text-amber-700 dark:data-[state=on]:text-amber-400 data-[state=on]:shadow-2xs border border-transparent data-[state=on]:border-stone-100 dark:data-[state=on]:border-stone-800 transition-all"
                >
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* ── List ──────────────────────────────────────────────────── */}
          {isLoadingDB ? (
            <div className="grid gap-5" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-56 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="rounded-2xl border border-stone-200/80 dark:border-stone-800 overflow-hidden shadow-2xs">
              <CardContent className="p-8">
                <EmptyState
                  icon={ShoppingBag}
                  title={orders.length === 0 ? 'No orders yet' : 'No matching orders found'}
                  description={
                    orders.length === 0
                      ? 'Your order list is empty. Place your first order to track its live status and view bills!'
                      : 'We couldn\'t find any orders matching your search query or selected status filter.'
                  }
                  action={
                    orders.length === 0 ? (
                      <Button asChild variant="brand" className="rounded-xl font-bold shadow-xs">
                        <Link href="/menu">
                          Browse Menu
                          <ArrowRight className="size-4 ml-1.5" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="rounded-xl font-bold"
                        onClick={() => {
                          setSearch('');
                          setFilterStatus('all');
                        }}
                      >
                        Clear filters
                      </Button>
                    )
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-5">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} onReorder={handleReorder} />
              ))}
            </ul>
          )}
        </Container>
      </main>

      <Footer />
    </>
  );
}

function OrderCard({
  order,
  onReorder,
}: {
  order: Order;
  onReorder: (items: OrderItem[]) => void;
}) {
  const presentation = STATUS_PRESENTATION[order.status] ?? STATUS_PRESENTATION.pending;
  const isPaid = order.paymentStatus === 'paid';

  return (
    <li>
      <Card className={cn(
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800/80',
        STATUS_ACCENTS[order.status] ?? STATUS_ACCENTS.pending
      )}>
        <CardContent className="grid gap-4.5 p-5 sm:p-6">
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-stone-400 dark:text-stone-500">
                <Hash className="size-3.5 shrink-0" />
                <span className="font-mono text-xs font-bold tracking-tight text-stone-800 dark:text-stone-300 break-all">{order.id}</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-400 text-xs">
                <Calendar className="size-3.5 shrink-0 text-stone-400" />
                <span className="font-semibold text-stone-500">{order.orderDate} · {order.orderTime}</span>
              </div>
            </div>
            <Badge variant={presentation.variant} size="lg" className="rounded-lg font-bold">
              {presentation.label}
            </Badge>
          </div>

          {/* Visual Order Stage Tracking Bar */}
          <OrderStageTracker status={order.status} />

          <Separator className="bg-stone-100 dark:bg-stone-800/60" />

          {/* Items */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Order Summary</span>
            <ul className="grid gap-2 text-sm">
              {order.items.map((item, i) => (
                <li key={`${item.menuItemId}-${i}`} className="flex justify-between items-center gap-4">
                  <span className="min-w-0 flex items-center text-stone-800 dark:text-stone-200">
                    <span className="inline-flex items-center text-[10.5px] font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded mr-2.5 tabular-nums">
                      {item.quantity}×
                    </span>
                    <span className="font-semibold truncate">{item.name}</span>
                    {item.selectedPortion && (
                      <span className="text-[9px] font-bold text-stone-400 bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded capitalize ml-1.5 shrink-0">
                        {item.selectedPortion}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-bold text-stone-900 dark:text-stone-100 tabular-nums text-right">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Separator className="bg-stone-100 dark:bg-stone-800/60" />

          {/* Meta */}
          <div className="text-stone-500 grid gap-2.5 text-xs sm:grid-cols-3 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-100/80 dark:border-stone-900/60">
            <span className="flex items-center gap-2">
              <User className="size-4 text-stone-400 shrink-0" />
              <span className="font-medium text-stone-700 dark:text-stone-300 truncate">{order.customerName}</span>
            </span>
            {order.customerPhone && (
              <span className="flex items-center gap-2">
                <Phone className="size-4 text-stone-400 shrink-0" />
                <span className="font-mono text-stone-700 dark:text-stone-300">{order.customerPhone}</span>
              </span>
            )}
            <span className="flex items-center gap-2">
              {order.paymentMode === 'cash' ? (
                <Banknote className="size-4 text-stone-400 shrink-0" />
              ) : (
                <CreditCard className="size-4 text-stone-400 shrink-0" />
              )}
              <span className="font-medium capitalize text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                {order.paymentMode}
                <span className={cn('font-bold rounded px-1.5 py-0.5 text-[10px]', isPaid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400')}>
                  {isPaid ? 'Paid' : 'Unpaid'}
                </span>
              </span>
            </span>
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Amount</span>
              <p className="text-lg font-black text-stone-900 dark:text-stone-100">
                {formatCurrency(order.grandTotal)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <ViewBillDialog order={order} className="rounded-xl h-9.5 font-bold text-xs" />
              <Button
                variant="brand"
                size="sm"
                className="rounded-xl h-9.5 font-bold text-xs shadow-xs"
                onClick={() => onReorder(order.items)}
              >
                <RotateCcw className="size-3.5 mr-1" />
                Reorder
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
