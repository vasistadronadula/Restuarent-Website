'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Order, OrderStatus } from '@/types';
import { PageHeader, StatCard, SectionCard, StatusChip, orderStatusColors } from '@/components/admin/ui';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search, Eye, CheckCircle2, Clock, Truck,
  UtensilsCrossed, ArrowRight, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const nextStatus: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
  cancelled: null,
};

export default function OrdersPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = filterStatus === 'all' || o.status === filterStatus;
      return matchStatus;
    });
  }, [orders, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const handleAdvanceStatus = async (order: Order) => {
    const next = nextStatus[order.status];
    if (!next) return;
    try {
      await updateOrderStatus(order.id, next);
      toast.success(`Order ${order.id} status updated to ${next}`);
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...selectedOrder, status: next });
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
      cell: ({ row }) => <StatusChip status={row.original.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const order = row.original;
        const next = nextStatus[order.status];
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
          title="Live Orders Management"
          subtitle="Real-time order tracking powered by TanStack Table & Virtualization"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Pending"
            value={statusCounts.pending || 0}
            accent={orderStatusColors.pending.color}
          />
          <StatCard
            icon={<UtensilsCrossed className="w-5 h-5" />}
            label="Preparing"
            value={statusCounts.preparing || 0}
            accent={orderStatusColors.preparing.color}
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Ready"
            value={statusCounts.ready || 0}
            accent={orderStatusColors.ready.color}
          />
          <StatCard
            icon={<Truck className="w-5 h-5" />}
            label="Delivered"
            value={statusCounts.delivered || 0}
            accent={orderStatusColors.delivered.color}
          />
        </div>

        <SectionCard noPadding className="p-3">
          <div className="flex gap-2 overflow-x-auto pb-2.5 mb-3 border-b border-stone-100 dark:border-[#2C2C2E]/60 scrollbar-none">
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
            height="550px"
            rowHeight={56}
            enableVirtualization={true}
          />
        </SectionCard>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(val) => { if (!val) setSelectedOrder(null); }}>
        {selectedOrder && (
          <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl bg-white dark:bg-[#1C1C1E] border border-stone-200/50 dark:border-[#2C2C2E]/60 shadow-2xl">
            <DialogHeader className="p-6 bg-white dark:bg-[#1C1C1E] text-stone-900 dark:text-white flex flex-row items-center justify-between border-b border-stone-100 dark:border-[#2C2C2E]/60">
              <div>
                <DialogTitle className="text-stone-900 dark:text-white font-black text-lg">
                  Order Details: {selectedOrder.id}
                </DialogTitle>
                <p className="text-[10px] text-stone-400 font-semibold mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt || selectedOrder.orderDate || Date.now()).toLocaleString()}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)} className="text-stone-500 hover:bg-stone-100 dark:hover:bg-[#2C2C2E] rounded-xl">
                <X className="w-5 h-5" />
              </Button>
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
                <StatusChip status={selectedOrder.status} />
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
              {nextStatus[selectedOrder.status] && (
                <Button
                  onClick={() => handleAdvanceStatus(selectedOrder)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-2xl h-11 shadow-sm"
                >
                  Advance to {nextStatus[selectedOrder.status]}
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
