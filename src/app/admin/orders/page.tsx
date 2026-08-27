'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Order, OrderStatus } from '@/types';
import { PageHeader, StatusChip } from '@/components/admin/ui';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, Clock, Truck, LayoutGrid, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNow } from '@/hooks/useNow';
import { formatOrderTimestamp } from '@/lib/utils';

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
  cancelled: null,
};

const statusOf = (o: Order): OrderStatus => o.status || 'pending';

/**
 * Minutes an order has been waiting. Ten is when a table starts noticing.
 * Read from the page's single clock so the card's stripe and its timer can
 * never disagree about whether an order is late.
 */
const LATE_MINUTES = 10;

const minutesSince = (now: number, at?: string) =>
  at ? Math.max(0, Math.floor((now - new Date(at).getTime()) / 60_000)) : null;

function ElapsedTime({ placedAt, now }: { placedAt?: string; now: number }) {
  if (!placedAt) return <span className="ad-muted text-xs">—</span>;

  const mins = minutesSince(now, placedAt) ?? 0;
  const label = mins < 1 ? 'just now' : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  const late = mins >= LATE_MINUTES;

  return (
    <span
      className="ad-num inline-flex items-center gap-1 text-[13px]"
      style={{ color: late ? 'var(--ad-accent)' : 'var(--ad-n600)' }}
    >
      <Clock className="size-3" /> {label}
    </span>
  );
}

/** The three lanes of the board, in the order an order travels through them. */
const LANES: { status: OrderStatus; label: string; cta: string; next: OrderStatus | null }[] = [
  { status: 'pending', label: 'New orders', cta: 'Start preparing', next: 'preparing' },
  { status: 'preparing', label: 'Preparing', cta: 'Mark ready', next: 'ready' },
  { status: 'ready', label: 'Ready to pass', cta: 'Mark delivered', next: 'delivered' },
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

  const now = useNow(30_000);

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
        <span className="ad-num text-[13px]">{row.original.id}</span>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-semibold truncate">{row.original.customerName || 'Walk-in'}</div>
          <div className="text-xs ad-muted">{row.original.customerPhone || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'orderType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="ad-tag ad-tag-outline">{row.original.orderType}</span>
      ),
    },
    {
      accessorKey: 'tableNumber',
      header: 'Table',
      cell: ({ row }) => row.original.orderType === 'dine-in' ? (
        <span className="ad-tag ad-tag-solid">
          {row.original.tableNumber ? `Table ${row.original.tableNumber}` : 'Dine-in · unassigned'}
        </span>
      ) : (
        <span className="ad-muted">—</span>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => (
        <div className="max-w-xs truncate ad-muted">
          {row.original.items?.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
        </div>
      ),
    },
    {
      accessorKey: 'grandTotal',
      header: 'Total',
      cell: ({ row }) => (
        <span className="ad-num text-[14px]">₹{row.original.grandTotal}</span>
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
          <div className="flex items-center gap-2">
            <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setSelectedOrder(order)}>
              <Eye className="w-3.5 h-3.5" /> View
            </button>
            {next && (
              <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => handleUpdateStatus(order.id, next)}>
                → {next}
              </button>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('pipeline')}
                className="ad-tab flex items-center gap-1.5"
                data-active={view === 'pipeline'}
              >
                <LayoutGrid className="size-3.5" /> Board
              </button>
              <button
                onClick={() => setView('table')}
                className="ad-tab flex items-center gap-1.5"
                data-active={view === 'table'}
              >
                <Table2 className="size-3.5" /> Table
              </button>
            </div>
          }
        />

        {view === 'pipeline' ? (
          <div className="ad-grid grid-cols-1 md:grid-cols-3 min-h-[70vh]">
            {LANES.map((lane, laneIdx) => {
              const laneList = laneOrders[lane.status] || [];
              return (
                <div key={lane.status} className="flex flex-col gap-3 p-3.5 min-w-0">
                  <div className="flex items-center justify-between border-b-2 border-ad-line pb-2.5">
                    <span className="ad-num text-[14px] tracking-widest uppercase">{lane.label}</span>
                    <span
                      className="ad-num text-[12px] px-2 py-0.5 text-ad-bg"
                      style={{ background: laneIdx === 2 ? 'var(--ad-accent)' : 'var(--ad-ink)' }}
                    >
                      {laneList.length}
                    </span>
                  </div>

                  {laneList.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[13px] ad-muted">Nothing in this lane</div>
                  ) : (
                    laneList.map((o) => {
                      const currentSt = statusOf(o);
                      const next = nextStatus[currentSt];
                      const placed = o.createdAt || o.orderTime || o.orderDate;
                      const late = (minutesSince(now, placed) ?? 0) >= LATE_MINUTES;

                      return (
                        <div
                          key={o.id}
                          className="cursor-pointer bg-ad-surface p-3.5 ad-hover"
                          style={{ borderLeft: `4px solid ${late ? 'var(--ad-accent)' : 'var(--ad-ink)'}` }}
                          onClick={() => setSelectedOrder(o)}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="ad-num text-[16px] truncate">{o.id}</span>
                            <ElapsedTime placedAt={placed} now={now} />
                          </div>

                          <div className="ad-kicker mt-0.5 truncate">
                            {o.customerName || 'Walk-in'} · {o.orderType}
                            {o.tableNumber ? ` · T${o.tableNumber}` : ''}
                          </div>

                          <div className="mt-2.5 flex flex-col gap-1">
                            {(o.items || []).slice(0, 3).map((it, idx) => (
                              <div key={idx} className="flex gap-2 text-[14px]">
                                <span className="font-semibold min-w-[22px] tabular-nums">{it.quantity}</span>
                                <span className="min-w-0 truncate">{it.name}</span>
                              </div>
                            ))}
                            {(o.items || []).length > 3 && (
                              <div className="text-xs ad-muted">+{(o.items || []).length - 3} more</div>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2 border-t border-ad-hairline pt-2.5">
                            <span className="ad-num text-[15px] flex-1">₹{o.grandTotal}</span>
                            {next && (
                              <button
                                type="button"
                                className="ad-btn ad-btn-secondary ad-btn-sm"
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(o.id, next); }}
                              >
                                {lane.cta}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
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
                  className="ad-tab flex items-center gap-1.5 shrink-0"
                  data-active={filterStatus === s.key}
                >
                  {s.label}
                  <span className="tabular-nums">({statusCounts[s.key] || 0})</span>
                </button>
              ))}
            </div>

            <div>
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
          <DialogContent className="max-w-lg">
            <DialogHeader className="pb-3 border-b-2 border-ad-line">
              <DialogTitle className="ad-h text-[18px]">Order {selectedOrder.id}</DialogTitle>
              <p className="ad-kicker mt-1">
                {formatOrderTimestamp(selectedOrder.createdAt || selectedOrder.orderDate)}
              </p>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-1">
              <div className="flex items-center justify-between gap-3 p-3 bg-ad-surface">
                <div className="min-w-0">
                  <div className="ad-kicker">Customer</div>
                  <div className="text-sm font-semibold truncate">{selectedOrder.customerName || 'Walk-in'}</div>
                  <div className="text-xs ad-muted">{selectedOrder.customerPhone || 'No phone'}</div>
                </div>
                <StatusChip status={statusOf(selectedOrder)} />
              </div>

              <div>
                <div className="ad-kicker mb-2">Order items</div>
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <tbody>
                      {selectedOrder.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-semibold w-10 tabular-nums">{item.quantity}</td>
                          <td className="min-w-0 truncate">{item.name}</td>
                          <td className="text-right ad-num text-[14px] whitespace-nowrap">₹{item.price * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t-2 border-ad-line">
                <span className="ad-kicker">Grand total</span>
                <span className="ad-num text-[24px]">₹{selectedOrder.grandTotal}</span>
              </div>
            </div>

            <DialogFooter className="flex flex-wrap gap-2 pt-3 border-t-2 border-ad-line">
              {statusOf(selectedOrder) !== 'preparing' && statusOf(selectedOrder) !== 'delivered' && (
                <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}>
                  Mark preparing
                </button>
              )}
              {statusOf(selectedOrder) !== 'ready' && statusOf(selectedOrder) !== 'delivered' && (
                <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}>
                  Mark ready
                </button>
              )}
              {statusOf(selectedOrder) !== 'delivered' && (
                <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')}>
                  <Truck className="size-3.5" /> Delivered
                </button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
