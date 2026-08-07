'use client';

import React, { useState, useMemo, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Order, OrderStatus } from '@/types';
import { PageHeader, StatusChip } from '@/components/admin/ui';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye, CheckCircle2, Clock, Truck, Flame, Inbox,
  ArrowRight, X, XCircle, LayoutGrid, Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
  cancelled: null,
};

const statusOf = (o: Order): OrderStatus => o.status || o.orderStatus || 'pending';

/** Live count-up of how long an order has been sitting in its lane. */
function ElapsedTime({ placedAt }: { placedAt?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!placedAt) return <span className="text-[10px] font-bold text-stone-400">—</span>;

  const mins = Math.max(0, Math.floor((now - new Date(placedAt).getTime()) / 60_000));
  const label = mins < 1 ? 'just now' : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums',
        mins >= 20 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          : mins >= 10 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
      )}
    >
      <Clock className="size-3" /> {label}
    </span>
  );
}

const LANES: {
  status: OrderStatus; label: string; icon: React.ReactNode;
  header: string; cta: string; next: OrderStatus | null; muted?: boolean;
}[] = [
  {
    status: 'pending',
    label: 'New Orders',
    icon: <Inbox className="size-4" />,
    header: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    cta: 'Start Preparing',
    next: 'preparing',
  },
  {
    status: 'preparing',
    label: 'Preparing',
    icon: <Flame className="size-4" />,
    header: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    cta: 'Mark Ready',
    next: 'ready',
  },
  {
    status: 'ready',
    label: 'Ready for Pickup',
    icon: <CheckCircle2 className="size-4" />,
    header: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    cta: 'Mark Delivered',
    next: 'delivered',
  },
  {
    status: 'delivered',
    label: 'Delivered',
    icon: <Truck className="size-4" />,
    header: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
    cta: '',
    next: null,
    muted: true,
  },
];

const STATUS_BAR: { key: OrderStatus | 'all'; label: string; icon: React.ReactNode; chip: string }[] = [
  { key: 'pending', label: 'Pending', icon: <Inbox className="size-3.5" />, chip: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  { key: 'preparing', label: 'Preparing', icon: <Flame className="size-3.5" />, chip: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400' },
  { key: 'ready', label: 'Ready', icon: <CheckCircle2 className="size-3.5" />, chip: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' },
  { key: 'delivered', label: 'Delivered', icon: <Truck className="size-3.5" />, chip: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400' },
  { key: 'cancelled', label: 'Cancelled', icon: <XCircle className="size-3.5" />, chip: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400' },
];

const orderAge = (o: Order) =>
  new Date(o.createdAt || o.orderTime || o.orderDate || Date.now()).getTime();

export default function OrdersPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const [view, setView] = useState<'pipeline' | 'table'>('pipeline');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = filterStatus === 'all' || statusOf(o) === filterStatus;
      return matchStatus;
    });
  }, [orders, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      const s = statusOf(o);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const laneOrders = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const lane of LANES) {
      map[lane.status] = orders
        .filter((o) => statusOf(o) === lane.status)
        .sort((a, b) => orderAge(a) - orderAge(b));
    }
    return map;
  }, [orders]);

  const handleAdvanceStatus = async (order: Order) => {
    const next = nextStatus[statusOf(order)];
    if (!next) return;
    try {
      await updateOrderStatus(order.id, next);
      toast.success(`Order ${order.id} moved to ${next}`);
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...selectedOrder, status: next });
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const pickFilter = (st: OrderStatus | 'all') => {
    setFilterStatus(st);
    setView('table');
  };

  const columns = useMemo<ColumnDef<any, Order>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Order ID',
      cell: ({ row }) => (
        <span className="font-extrabold text-stone-900 dark:text-stone-100">
          {row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-stone-900 dark:text-stone-100">
            {row.original.customerName || 'Walk-in Customer'}
          </div>
          <div className="text-xs text-stone-400 font-medium">{row.original.customerPhone || 'N/A'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'orderType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="uppercase text-[10px] font-black tracking-wider bg-stone-100 dark:bg-stone-800">
          {row.original.orderType}
        </Badge>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => (
        <div className="max-w-xs truncate text-stone-600 dark:text-stone-300 text-xs font-medium">
          {row.original.items?.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
        </div>
      ),
    },
    {
      accessorKey: 'grandTotal',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-black text-amber-700 dark:text-amber-500">
          ₹{row.original.grandTotal}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusChip status={statusOf(row.original)} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const order = row.original;
        const next = nextStatus[statusOf(order)];
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrder(order)}
              className="h-8 px-2 text-xs font-bold"
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> View
            </Button>
            {next && (
              <Button
                size="sm"
                onClick={() => handleAdvanceStatus(order)}
                className="h-8 px-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Mark {next}
              </Button>
            )}
          </div>
        );
      },
    },
  ], [selectedOrder]);

  return (
    <AdminLayout title="Live Orders Management">
      <div className="space-y-4 w-full max-w-full">
        <PageHeader
          title="Live Orders"
          subtitle="Real-time order pipeline — oldest orders first, tap a card to open details"
          action={
            <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl w-fit">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('pipeline')}
                className={cn(
                  'h-8 px-3 text-xs font-extrabold rounded-lg whitespace-nowrap',
                  view === 'pipeline'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                )}
              >
                <LayoutGrid className="size-3.5 mr-1.5" /> Pipeline
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('table')}
                className={cn(
                  'h-8 px-3 text-xs font-extrabold rounded-lg whitespace-nowrap',
                  view === 'table'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                )}
              >
                <Table2 className="size-3.5 mr-1.5" /> Table
              </Button>
            </div>
          }
        />

        {/* Live status bar — tap a status to jump into the filtered table */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_BAR.map((s) => (
            <button
              key={s.key}
              onClick={() => pickFilter(s.key)}
              className={cn(
                'flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-extrabold transition-colors',
                s.chip,
                filterStatus === s.key && view === 'table' && 'ring-2 ring-amber-500/40'
              )}
            >
              {s.icon}
              {s.label}
              <span className="tabular-nums">({statusCounts[s.key] || 0})</span>
            </button>
          ))}
        </div>

        {view === 'pipeline' ? (
          /* ── Pipeline: four live lanes, oldest first ─────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {LANES.map((lane) => {
              const laneList = laneOrders[lane.status] || [];
              return (
                <div key={lane.status} className="flex flex-col min-w-0">
                  {/* Lane header */}
                  <div className={cn('mb-3 flex items-center justify-between rounded-xl border px-3 py-2', lane.header)}>
                    <div className="flex items-center gap-2 text-xs font-black">
                      {lane.icon}
                      <span>{lane.label}</span>
                    </div>
                    <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs font-extrabold text-white dark:bg-white dark:text-stone-900 tabular-nums">
                      {laneList.length}
                    </span>
                  </div>

                  {/* Lane body */}
                  <div className="space-y-3">
                    {laneList.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-stone-200 px-4 py-6 text-center text-xs font-bold text-stone-400 dark:border-stone-800 dark:text-stone-600">
                        No {lane.label.toLowerCase()} right now
                      </div>
                    ) : (
                      laneList.map((o) => {
                        const next = nextStatus[statusOf(o)];
                        const placed = o.createdAt || o.orderTime || o.orderDate;
                        return (
                          <div
                            key={o.id}
                            className={cn(
                              'cursor-pointer rounded-2xl border border-stone-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all hover:border-stone-300 hover:shadow-md dark:border-[#2C2C2E]/60 dark:bg-[#1C1C1E]/70 dark:hover:border-stone-700',
                              lane.muted && 'opacity-60 hover:opacity-90',
                              lane.status === 'pending' && 'border-t-2 border-t-amber-500',
                              lane.status === 'preparing' && 'border-t-2 border-t-orange-500',
                              lane.status === 'ready' && 'border-t-2 border-t-emerald-500',
                              lane.status === 'delivered' && 'border-t-2 border-t-sky-500'
                            )}
                            onClick={() => setSelectedOrder(o)}
                          >
                            <div className="space-y-2.5 p-3.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-black text-xs text-stone-900 dark:text-stone-100 truncate">
                                  {o.id}
                                </span>
                                <ElapsedTime placedAt={placed} />
                              </div>

                              <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                                <span className="truncate">{o.customerName || 'Walk-in'}</span>
                                <span className="shrink-0 uppercase text-[9px] font-black text-stone-400">
                                  {o.orderType}{o.tableNumber ? ` · T${o.tableNumber}` : ''}
                                </span>
                              </div>

                              <div className="space-y-1">
                                {(o.items || []).slice(0, 3).map((it, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="min-w-0 truncate font-semibold text-stone-700 dark:text-stone-300">
                                      {it.name}
                                    </span>
                                    <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                      x{it.quantity}
                                    </span>
                                  </div>
                                ))}
                                {(o.items || []).length > 3 && (
                                  <div className="text-[10px] font-bold text-stone-400">
                                    +{(o.items || []).length - 3} more items
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5 dark:border-[#2C2C2E]/60">
                                <span className="font-black text-sm text-amber-700 dark:text-amber-500 tabular-nums">
                                  ₹{o.grandTotal}
                                </span>
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-stone-400">
                                  <Eye className="size-3" /> Details
                                </span>
                              </div>

                              {next && (
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleAdvanceStatus(o); }}
                                  className={cn(
                                    'w-full h-9 text-xs font-extrabold rounded-xl',
                                    lane.status === 'pending' && 'bg-amber-600 hover:bg-amber-700 text-white',
                                    lane.status === 'preparing' && 'bg-orange-600 hover:bg-orange-700 text-white',
                                    lane.status === 'ready' && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  )}
                                >
                                  {lane.cta}
                                  <ArrowRight className="size-3.5 ml-1.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table view: searchable, sortable, filterable ────────────── */
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2.5 scrollbar-none">
              {(['all', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'] as const).map((st) => (
                <Button
                  key={st}
                  variant={filterStatus === st ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(st)}
                  className={`rounded-full text-xs font-bold capitalize whitespace-nowrap ${
                    filterStatus === st ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                  }`}
                >
                  {st} ({statusCounts[st] || 0})
                </Button>
              ))}
            </div>

            <DataTable
              columns={columns}
              data={filtered}
              searchKey="customerName"
              searchPlaceholder="Search order ID or customer name..."
              height="520px"
              rowHeight={56}
              enableVirtualization={true}
              getRowId={(o) => o.id}
              renderMobileCard={(o) => (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100">{o.id}</span>
                        <StatusChip status={statusOf(o)} />
                      </div>
                      <div className="font-bold text-xs text-stone-600 dark:text-stone-300 mt-1 truncate">
                        {o.customerName || 'Walk-in Customer'}
                      </div>
                      <div className="text-[10px] text-stone-400 font-medium mt-0.5 truncate">
                        <span className="uppercase">{o.orderType}</span>
                        <span className="mx-1">·</span>
                        {o.items?.map((i) => `${i.name} x${i.quantity}`).join(', ') || `₹${o.grandTotal}`}
                      </div>
                    </div>
                    <span className="font-black text-amber-700 dark:text-amber-500 text-xs flex-shrink-0">
                      ₹{o.grandTotal}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(o)}
                      className="h-7 px-2.5 text-[10px] font-bold flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    {nextStatus[statusOf(o)] && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(o)}
                        className="h-7 px-2.5 text-[10px] font-bold flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Mark {nextStatus[statusOf(o)]}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(val) => { if (!val) setSelectedOrder(null); }}>
        {selectedOrder && (
          <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl bg-white dark:bg-[#1C1C1E] border border-stone-200/50 dark:border-[#2C2C2E]/60 shadow-2xl">
            <DialogHeader className="p-6 pr-14 bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-white border-b border-stone-100 dark:border-[#2C2C2E]/60">
              <div>
                <DialogTitle className="text-stone-900 dark:text-white font-black text-lg">
                  Order Details: {selectedOrder.id}
                </DialogTitle>
                <p className="text-[10px] text-stone-400 font-semibold mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt || selectedOrder.orderDate || Date.now()).toLocaleString()}
                </p>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3.5 bg-stone-50/50 dark:bg-stone-900/40 rounded-xl border border-stone-200/30 dark:border-[#2C2C2E]/40">
                <div>
                  <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Customer</div>
                  <div className="text-xs font-black text-stone-850 dark:text-stone-100">
                    {selectedOrder.customerName || 'Walk-in Customer'}
                  </div>
                  <div className="text-[10px] text-stone-500">{selectedOrder.customerPhone || 'No phone'}</div>
                </div>
                <StatusChip status={statusOf(selectedOrder)} />
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">Order Items</h4>
                <div className="space-y-2 border border-stone-200/50 dark:border-[#2C2C2E]/65 rounded-xl p-3 bg-stone-50/20 dark:bg-[#1C1C1E]/40">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-stone-850 dark:text-stone-100">{item.name}</span>
                        <span className="text-stone-400 ml-2 font-semibold">x{item.quantity}</span>
                      </div>
                      <span className="font-black text-amber-700 dark:text-amber-500">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3.5 border-t border-stone-100 dark:border-[#2C2C2E]/60 text-xs font-black">
                <span>Grand Total</span>
                <span className="text-amber-700 dark:text-amber-500 text-base">₹{selectedOrder.grandTotal}</span>
              </div>
            </div>

            <DialogFooter className="p-4 bg-stone-50/30 dark:bg-[#1C1C1E]/50 border-t border-stone-100 dark:border-[#2C2C2E]/60">
              {nextStatus[statusOf(selectedOrder)] && (
                <Button
                  onClick={() => handleAdvanceStatus(selectedOrder)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-2xl h-11 shadow-sm"
                >
                  Advance to {nextStatus[statusOf(selectedOrder)]}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
