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
  ArrowRight, XCircle, LayoutGrid, Table2,
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

function ElapsedTime({ placedAt }: { placedAt?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!placedAt) return <span className="text-xs text-stone-400">—</span>;

  const mins = Math.max(0, Math.floor((now - new Date(placedAt).getTime()) / 60_000));
  const label = mins < 1 ? 'just now' : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs tabular-nums',
      mins >= 20 ? 'bg-rose-100 text-rose-700'
        : mins >= 10 ? 'bg-amber-100 text-amber-700'
        : 'bg-stone-100 text-stone-500'
    )}>
      <Clock className="size-3" /> {label}
    </span>
  );
}

const LANES: {
  status: OrderStatus; label: string; icon: React.ReactNode;
  borderColor: string; ctaClass: string; cta: string; next: OrderStatus | null;
}[] = [
  {
    status: 'pending',
    label: 'New Orders',
    icon: <Inbox className="size-4 text-sky-600" />,
    borderColor: 'border-sky-200',
    ctaClass: 'bg-sky-600 hover:bg-sky-700 text-white',
    cta: 'Start Preparing',
    next: 'preparing',
  },
  {
    status: 'preparing',
    label: 'Preparing',
    icon: <Flame className="size-4 text-amber-600" />,
    borderColor: 'border-amber-200',
    ctaClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    cta: 'Mark Ready',
    next: 'ready',
  },
  {
    status: 'ready',
    label: 'Ready for Pickup',
    icon: <CheckCircle2 className="size-4 text-emerald-600" />,
    borderColor: 'border-emerald-200',
    ctaClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    cta: 'Mark Delivered',
    next: 'delivered',
  },
];

const STATUS_PILLS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const orderAge = (o: Order) =>
  new Date(o.createdAt || o.orderTime || o.orderDate || Date.now()).getTime();

export default function OrdersPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const [view, setView] = useState<'pipeline' | 'table'>('pipeline');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      const s = statusOf(o);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => filterStatus === 'all' || statusOf(o) === filterStatus);
  }, [orders, filterStatus]);

  const laneOrders = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const lane of LANES) {
      map[lane.status] = orders
        .filter((o) => statusOf(o) === lane.status)
        .sort((a, b) => orderAge(a) - orderAge(b));
    }
    return map;
  }, [orders]);

  const handleUpdateStatus = async (orderId: string, targetStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, targetStatus);
      toast.success(`Order moved to ${targetStatus}`);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: targetStatus });
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const columns = useMemo<ColumnDef<any, Order>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Order ID',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-stone-900">{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm text-stone-900">
            {row.original.customerName || 'Walk-in'}
          </div>
          <div className="text-xs text-stone-400">{row.original.customerPhone || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'orderType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="uppercase text-xs font-medium bg-stone-50">
          {row.original.orderType}
        </Badge>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => (
        <div className="max-w-xs truncate text-stone-600 text-sm">
          {row.original.items?.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
        </div>
      ),
    },
    {
      accessorKey: 'grandTotal',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-semibold text-stone-900 tabular-nums">₹{row.original.grandTotal}</span>
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
        const currentSt = statusOf(order);
        const next = nextStatus[currentSt];
        return (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)} className="h-8 px-2.5 text-xs">
              <Eye className="w-3.5 h-3.5 mr-1" /> View
            </Button>
            {next && (
              <Button size="sm" onClick={() => handleUpdateStatus(order.id, next)} className="h-8 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white">
                → {next}
              </Button>
            )}
          </div>
        );
      },
    },
  ], [selectedOrder]);

  return (
    <AdminLayout title="Live Orders">
      <div className="space-y-4 w-full max-w-full">
        {/* Header */}
        <PageHeader
          title="Live Orders"
          subtitle={`${statusCounts['pending'] || 0} pending · ${statusCounts['preparing'] || 0} preparing · ${statusCounts['ready'] || 0} ready`}
          action={
            <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1">
              <button
                onClick={() => setView('pipeline')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors', view === 'pipeline' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700')}
              >
                <LayoutGrid className="size-3.5" /> Board
              </button>
              <button
                onClick={() => setView('table')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors', view === 'table' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700')}
              >
                <Table2 className="size-3.5" /> Table
              </button>
            </div>
          }
        />

        {view === 'pipeline' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LANES.map((lane) => {
              const laneList = laneOrders[lane.status] || [];
              return (
                <div key={lane.status} className="flex flex-col min-w-0">
                  {/* Lane header */}
                  <div className={cn('mb-3 flex items-center justify-between px-3 py-2 rounded-lg border bg-white', lane.borderColor)}>
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                      {lane.icon}
                      <span>{lane.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-stone-600 tabular-nums">{laneList.length}</span>
                  </div>

                  {/* Lane cards */}
                  <div className="space-y-3 min-h-[400px]">
                    {laneList.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-stone-200 px-4 py-10 text-center text-sm text-stone-400">
                        No orders here
                      </div>
                    ) : (
                      laneList.map((o) => {
                        const currentSt = statusOf(o);
                        const next = nextStatus[currentSt];
                        const placed = o.createdAt || o.orderTime || o.orderDate;
                        return (
                          <div
                            key={o.id}
                            className="cursor-pointer rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-300 hover:shadow-sm transition-all"
                            onClick={() => setSelectedOrder(o)}
                          >
                            {/* Top bar */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-sm font-medium text-stone-900 truncate">{o.id}</span>
                              <ElapsedTime placedAt={placed} />
                            </div>

                            {/* Customer & type */}
                            <div className="flex items-center justify-between gap-2 text-sm text-stone-600 mb-3">
                              <span className="truncate">{o.customerName || 'Walk-in'}</span>
                              <Badge variant="outline" className="shrink-0 uppercase text-xs font-medium bg-stone-50">
                                {o.orderType}{o.tableNumber ? ` · T${o.tableNumber}` : ''}
                              </Badge>
                            </div>

                            {/* Items */}
                            <div className="space-y-1 py-2 border-y border-stone-100 mb-3">
                              {(o.items || []).slice(0, 3).map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                                  <span className="min-w-0 truncate text-stone-800">{it.name}</span>
                                  <span className="shrink-0 text-xs text-stone-500 tabular-nums">×{it.quantity}</span>
                                </div>
                              ))}
                              {(o.items || []).length > 3 && (
                                <div className="text-xs text-stone-400">+{(o.items || []).length - 3} more</div>
                              )}
                            </div>

                            {/* Total + CTA */}
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-900 tabular-nums flex-1">₹{o.grandTotal}</span>
                              {next && (
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(o.id, next); }}
                                  className={cn('flex-1 h-8 text-xs font-medium rounded-lg', lane.ctaClass)}
                                >
                                  {lane.cta}
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
          <div className="space-y-3">
            {/* Status filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {STATUS_PILLS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFilterStatus(s.key)}
                  className={cn(
                    'flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                    filterStatus === s.key
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  )}
                >
                  {s.label}
                  <span className="tabular-nums">({statusCounts[s.key] || 0})</span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-stone-200">
              <DataTable
                columns={columns}
                data={filtered}
                searchKey="customerName"
                searchPlaceholder="Search customer or order ID…"
                height="520px"
                rowHeight={56}
                enableVirtualization={true}
                getRowId={(o) => o.id}
              />
            </div>
          </div>
        )}
      </div>

      {/* Order details dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(val) => { if (!val) setSelectedOrder(null); }}>
        {selectedOrder && (
          <DialogContent className="max-w-lg rounded-xl bg-white border border-stone-200">
            <DialogHeader className="pb-3 border-b border-stone-100">
              <DialogTitle className="text-base font-semibold text-stone-900">
                Order {selectedOrder.id}
              </DialogTitle>
              <p className="text-xs text-stone-400 mt-0.5">
                {new Date(selectedOrder.createdAt || selectedOrder.orderDate || Date.now()).toLocaleString()}
              </p>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-1">
              {/* Customer */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                <div>
                  <div className="text-xs text-stone-400 mb-0.5">Customer</div>
                  <div className="text-sm font-medium text-stone-900">{selectedOrder.customerName || 'Walk-in'}</div>
                  <div className="text-xs text-stone-500">{selectedOrder.customerPhone || 'No phone'}</div>
                </div>
                <StatusChip status={statusOf(selectedOrder)} />
              </div>

              {/* Items */}
              <div>
                <div className="text-xs font-medium text-stone-500 mb-2">Order Items</div>
                <div className="border border-stone-100 rounded-lg divide-y divide-stone-100">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3 py-2 text-sm">
                      <span className="text-stone-800">{item.name} <span className="text-stone-400">×{item.quantity}</span></span>
                      <span className="font-medium text-stone-900 tabular-nums">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-sm font-semibold">
                <span>Grand Total</span>
                <span className="text-base text-stone-900 tabular-nums">₹{selectedOrder.grandTotal}</span>
              </div>
            </div>

            <DialogFooter className="flex flex-wrap gap-2 pt-3 border-t border-stone-100">
              {statusOf(selectedOrder) !== 'preparing' && statusOf(selectedOrder) !== 'delivered' && (
                <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')} className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8">
                  Mark Preparing
                </Button>
              )}
              {statusOf(selectedOrder) !== 'ready' && statusOf(selectedOrder) !== 'delivered' && (
                <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
                  Mark Ready
                </Button>
              )}
              {statusOf(selectedOrder) !== 'delivered' && (
                <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')} className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8">
                  <Truck className="size-3.5 mr-1" /> Delivered
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
