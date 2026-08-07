'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote, CreditCard, Phone, ReceiptText, RotateCcw, Search, ShoppingBag, User,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn, formatCurrency } from '@/lib/utils';
import Navbar from '@/components/customer/Navbar';
import Footer from '@/components/customer/Footer';
import PrintBillButton from '@/components/bill/PrintBillButton';
import { generateInvoiceNo } from '@/lib/idGenerator';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useCartStore } from '@/store/useCartStore';
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
  { value: 'completed', label: 'Completed' },
] as const;

/**
 * One mapping from order status to how it is shown. The previous page built
 * these inline in a switch that also carried emoji in the label, so the same
 * status read differently here and in the admin list.
 */
const STATUS_PRESENTATION: Record<
  string,
  { label: string; variant: 'soft-success' | 'soft-warning' | 'soft-info' | 'soft-destructive' | 'soft-muted' }
> = {
  completed: { label: 'Completed', variant: 'soft-success' },
  preparing: { label: 'Preparing in kitchen', variant: 'soft-warning' },
  ready: { label: 'Ready for pickup', variant: 'soft-info' },
  cancelled: { label: 'Cancelled', variant: 'soft-destructive' },
  pending: { label: 'Awaiting confirmation', variant: 'soft-muted' },
};

export default function OrderHistoryPage() {
  const { orders, isLoadingDB } = useAdmin();
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // RLS already restricts what `orders` can even contain here (a signed-in
  // customer's query only returns their own rows; admins get everything) —
  // this ownership check additionally keeps an admin who opens this
  // customer-facing page from seeing every order mixed together.
  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return orders.filter((order) => {
      const userMatch = !user || order.userId === user.id;

      const matchesSearch =
        !needle ||
        order.id.toLowerCase().includes(needle) ||
        order.customerName.toLowerCase().includes(needle) ||
        order.customerPhone?.includes(needle) ||
        order.items.some((item) => item.name.toLowerCase().includes(needle));

      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

      return userMatch && matchesSearch && matchesStatus;
    });
  }, [orders, user, search, filterStatus]);

  const handleReorder = (items: OrderItem[]) => {
    let addedCount = 0;
    const addItem = useCartStore.getState().addItem;

    items.forEach((item) => {
      addItem({
        id: item.menuItemId,
        name: item.name,
        category: 'starters',
        price: item.price,
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
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

      <main className="min-h-screen py-4 md:py-5">
        <div className="mx-auto w-full max-w-none px-4 sm:px-8 md:px-12">
          <header className="mb-3">
            <h1 className="font-display flex items-center gap-2 text-xl font-black tracking-tight md:text-2xl">
              <ReceiptText className="text-primary size-6" />
              My Orders
            </h1>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              {user
                ? 'Every order placed on this account.'
                : 'Sign in to see your full order history.'}
            </p>
          </header>

          {/* ── Filters ───────────────────────────────────────────────── */}
          <div className="mb-6 grid gap-3">
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order ID, dish or phone number"
                aria-label="Search orders"
                className="pl-10"
              />
            </div>

            <ToggleGroup
              type="single"
              variant="soft"
              value={filterStatus}
              onValueChange={(v) => v && setFilterStatus(v)}
              className="w-full max-w-full overflow-x-auto scrollbar-none"
              aria-label="Filter by status"
            >
              {STATUS_FILTERS.map((f) => (
                <ToggleGroupItem key={f.value} value={f.value} className="shrink-0">
                  {f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* ── List ──────────────────────────────────────────────────── */}
          {isLoadingDB ? (
            <div className="grid gap-4" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={ShoppingBag}
                  title={orders.length === 0 ? 'No orders yet' : 'No orders match that'}
                  description={
                    orders.length === 0
                      ? 'Once you place an order it will appear here, with the bill.'
                      : 'Try a different search term or clear the status filter.'
                  }
                  action={
                    orders.length === 0 ? (
                      <Button asChild variant="brand">
                        <Link href="/menu">Browse Menu</Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
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
            <ul className="grid gap-4">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} onReorder={handleReorder} />
              ))}
            </ul>
          )}
        </div>
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
      <Card>
        <CardContent className="grid gap-4">
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-base font-bold break-all">{order.id}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {order.orderDate} · {order.orderTime}
              </p>
            </div>
            <Badge variant={presentation.variant} size="lg">
              {presentation.label}
            </Badge>
          </div>

          <Separator />

          {/* Items */}
          <ul className="grid gap-1.5 text-sm">
            {order.items.map((item, i) => (
              <li key={`${item.menuItemId}-${i}`} className="flex justify-between gap-4">
                <span className="min-w-0">
                  <span className="text-muted-foreground font-semibold tabular-nums">
                    {item.quantity}×
                  </span>{' '}
                  {item.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          {/* Meta */}
          <div className="text-muted-foreground grid gap-2 text-xs sm:grid-cols-2">
            <span className="flex items-center gap-1.5">
              <User className="size-3.5 shrink-0" />
              {order.customerName}
            </span>
            {order.customerPhone && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 shrink-0" />
                {order.customerPhone}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              {order.paymentMode === 'cash' ? (
                <Banknote className="size-3.5 shrink-0" />
              ) : (
                <CreditCard className="size-3.5 shrink-0" />
              )}
              {order.paymentMode}
              <span className={cn('font-bold', isPaid ? 'text-success' : 'text-destructive')}>
                · {isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </span>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-lg font-black">
              <span className="text-muted-foreground mr-1.5 text-xs font-semibold">Total</span>
              {formatCurrency(order.grandTotal)}
            </p>
            <div className="flex flex-wrap gap-2">
              <PrintBillButton order={order} invoiceNo={generateInvoiceNo(order.id)} />
              <Button variant="brand" size="sm" onClick={() => onReorder(order.items)}>
                <RotateCcw />
                Reorder
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
