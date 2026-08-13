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

  if (!placedAt) return <span className="text-xs text-slate-400 font-mono">—</span>;

  const mins = Math.max(0, Math.floor((now - new Date(placedAt).getTime()) / 60_000));
  const label = mins < 1 ? 'just now' : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
      mins >= 20 ? 'bg-rose-100 text-rose-700'
        : mins >= 10 ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600'
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
    ctaClass: 'bg-[#059669] hover:bg-[#047857] text-white',
    cta: 'Mark Delivered',
    next: 'delivered',
  },
];

const STATUS_PILLS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All Orders' },
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
        <span className="font-mono text-xs font-bold text-slate-900">{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-xs sm:text-sm text-slate-900">
            {row.original.customerName || 'Walk-in'}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">{row.original.customerPhone || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'orderType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="uppercase text-[10px] font-bold bg-slate-50 border-slate-200 text-slate-700">
          {row.original.orderType}
        </Badge>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => (
        <div className="max-w-xs truncate text-slate-600 text-xs font-medium">
          {row.original.items?.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
        </div>
      ),
    },
    {
      accessorKey: 'grandTotal',
      header: 'Total',
      cell: ({ row }) => (
        <span className="font-bold text-slate-900 font-mono tabular-nums">₹{row.original.grandTotal}</span>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedOrder(order)}
              className="h-8 px-2.5 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> View
            </Button>
            {next && (
              <Button
                size="sm"
                onClick={() => handleUpdateStatus(order.id, next)}
                className="h-8 px-2.5 text-xs font-bold rounded-xl bg-[#059669] hover:bg-[#047857] text-white shadow-2xs"
              >
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
      <div className="space-y-5 w-full max-w-full font-sans">
        {/* Header */}
        <PageHeader
          title="Live Orders"
          subtitle={`${statusCounts['pending'] || 0} pending · ${statusCounts['preparing'] || 0} preparing · ${statusCounts['ready'] || 0} ready`}
          action={
            <div className="flex items-center gap-1.5 bg-slate-100/90 rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setView('pipeline')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  view === 'pipeline' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <LayoutGrid className="size-3.5" /> Board
              </button>
              <button
                type="button"
                onClick={() => setView('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  view === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                )}
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
                  <div className={cn('mb-3 flex items-center justify-between px-3.5 py-2.5 rounded-2xl border bg-white shadow-2xs', lane.borderColor)}>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      {lane.icon}
                      <span>{lane.label}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
                      {laneList.length}
                    </span>
                  </div>

                  {/* Lane cards */}
                  <div className="space-y-3 min-h-[400px]">
                    {laneList.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-12 text-center text-xs font-semibold text-slate-400 bg-white/50">
                        No orders in this stage
                      </div>
                    ) : (
                      laneList.map((o) => {
                        const currentSt = statusOf(o);
                        const next = nextStatus[currentSt];
                        const placed = o.createdAt || o.orderTime || o.orderDate;
                        return (
                          <div
                            key={o.id}
                            className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.99]"
                            onClick={() => setSelectedOrder(o)}
                          >
                            {/* Top bar */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-xs font-bold text-slate-900 truncate">#{o.id}</span>
                              <ElapsedTime placedAt={placed} />
                            </div>

                            {/* Customer & type */}
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-600 mb-3">
                              <span className="truncate font-bold text-slate-800">{o.customerName || 'Walk-in Diner'}</span>
                              <Badge variant="outline" className="shrink-0 uppercase text-[10px] font-bold bg-slate-50 border-slate-200 text-slate-700">
                                {o.orderType}{o.tableNumber ? ` · T${o.tableNumber}` : ''}
                              </Badge>
                            </div>

                            {/* Items */}
                            <div className="space-y-1 py-2 border-y border-slate-100 mb-3">
                              {(o.items || []).slice(0, 3).map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="min-w-0 truncate text-slate-700 font-medium">{it.name}</span>
                                  <span className="shrink-0 text-[11px] text-slate-400 font-mono font-bold tabular-nums">×{it.quantity}</span>
                                </div>
                              ))}
                              {(o.items || []).length > 3 && (
                                <div className="text-[11px] text-slate-400 font-medium">+{(o.items || []).length - 3} more items</div>
                              )}
                            </div>

                            {/* Total + CTA */}
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 tabular-nums flex-1 text-sm">₹{o.grandTotal}</span>
                              {next && (
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(o.id, next); }}
                                  className={cn('flex-1 h-8 text-xs font-bold rounded-xl shadow-2xs', lane.ctaClass)}
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
                    'flex items-center gap-1.5 shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap',
                    filterStatus === s.key
                      ? 'border-[#059669] bg-[#059669] text-white shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {s.label}
                  <span className="tabular-nums font-mono">({statusCounts[s.key] || 0})</span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
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
          <DialogContent className="max-w-lg rounded-3xl bg-white border border-slate-200 p-6">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                <span>Order #{selectedOrder.id}</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  {new Date(selectedOrder.createdAt || selectedOrder.orderDate || Date.now()).toLocaleTimeString()}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
              {/* Customer */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer</div>
                  <div className="text-sm font-bold text-slate-900">{selectedOrder.customerName || 'Walk-in Diner'}</div>
                  <div className="text-xs text-slate-500 font-medium">{selectedOrder.customerPhone || 'No phone provided'}</div>
                </div>
                <StatusChip status={statusOf(selectedOrder)} />
              </div>

              {/* Items */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order Items</div>
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3.5 py-2.5 text-xs">
                      <span className="text-slate-800 font-medium">
                        {item.name} <span className="text-slate-400 font-mono">×{item.quantity}</span>
                      </span>
                      <span className="font-bold text-slate-900 font-mono tabular-nums">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-sm font-bold">
                <span>Grand Total</span>
                <span className="text-lg text-slate-900 font-mono font-black tabular-nums">₹{selectedOrder.grandTotal}</span>
              </div>
            </div>

            <DialogFooter className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
              {statusOf(selectedOrder) !== 'preparing' && statusOf(selectedOrder) !== 'delivered' && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 rounded-xl"
                >
                  Mark Preparing
                </Button>
              )}
              {statusOf(selectedOrder) !== 'ready' && statusOf(selectedOrder) !== 'delivered' && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                  className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold h-9 rounded-xl"
                >
                  Mark Ready
                </Button>
              )}
              {statusOf(selectedOrder) !== 'delivered' && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold h-9 rounded-xl"
                >
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
