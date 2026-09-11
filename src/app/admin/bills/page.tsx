'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Suspense, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { useOrderHistory } from '@/lib/queries';
import { Order, PaymentMode } from '@/types';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Printer, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal, { type BillFormat } from '@/components/bill/PrintBillPortal';
import { generateInvoiceNo } from '@/lib/idGenerator';
import { rupees } from '@/lib/billing';
import { formatOrderTimestamp } from '@/lib/utils';
import { flushSync } from 'react-dom';
import { orderDateStamp } from '@/lib/orderTime';

export default function BillsPage() {
  return <Suspense fallback={<AdminLayout title="Bills Ledger"><div className="p-6 ad-muted">Loading complete ledger…</div></AdminLayout>}><GeneratedBillsPage /></Suspense>;
}

function GeneratedBillsPage() {
  const today = orderDateStamp();
  const [dateFrom, setDateFrom] = useState(`${today.slice(0, 8)}01`);
  const [dateTo, setDateTo] = useState(today);
  const { data: orders = [], isLoading, error, refetch } = useOrderHistory(true, { from: dateFrom, to: dateTo });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMode>('all');
  const [selectedBillOrder, setSelectedBillOrder] = useState<Order | null>(null);
  const [reprint, setReprint] = useState<{ order: Order; format: BillFormat } | null>(null);

  const filteredBills = useMemo(() => {
    return orders.filter((o) => {
      const matchPayment = paymentFilter === 'all' || o.paymentMode === paymentFilter;
      return matchPayment;
    });
  }, [orders, paymentFilter]);

  const totalBilledRevenue = useMemo(() => {
    return orders.reduce((sum, o) => (
      o.status !== 'cancelled' && o.paymentStatus === 'paid'
        ? sum + (o.grandTotal || 0)
        : sum
    ), 0);
  }, [orders]);

  const linkedBillOrder = useMemo(() => {
    const orderId = searchParams.get('order');
    return orderId ? orders.find((order) => order.id === orderId) || null : null;
  }, [orders, searchParams]);
  const displayedBillOrder = selectedBillOrder || linkedBillOrder;

  const handlePrint = (order: Order) => {
    flushSync(() => {
      setReprint({ order, format: 'thermal' });
    });
    window.print();
    setReprint(null);
  };

  const columns = useMemo<ColumnDef<any, Order>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Bill No / Date',
      cell: ({ row }) => (
        <div>
          <div className="ad-num text-[13px]">{row.original.id}</div>
          <div className="text-xs ad-muted mt-0.5">
            {formatOrderTimestamp(row.original.createdAt || row.original.orderDate)}
          </div>
        </div>
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
      accessorKey: 'paymentMode',
      header: 'Payment',
      cell: ({ row }) => (
        <span className="ad-tag ad-tag-outline">{row.original.paymentMode || 'Cash'}</span>
      ),
    },
    {
      accessorKey: 'grandTotal',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="ad-num text-[14px]">{rupees(row.original.grandTotal)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-2">
            <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setSelectedBillOrder(order)}>
              <Eye className="size-3.5" /> View
            </button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => handlePrint(order)}>
              <Printer className="size-3.5" /> Print
            </button>
          </div>
        );
      },
    },
  ], []);

  return (
    <AdminLayout title="Bills Ledger">
      <div className="space-y-4 w-full max-w-full">
        {reprint && (
          <PrintBillPortal
            order={reprint.order}
            format={reprint.format}
            invoiceNo={generateInvoiceNo(reprint.order.id)}
            copyLabel={reprint.format === 'a4' ? 'DUPLICATE' : undefined}
          />
        )}

        <div className="ad-section-head">
          <h3 className="ad-h text-[17px]">Transaction ledger</h3>
          <span className="text-[12px] ad-muted">
            {isLoading ? 'Loading complete ledger…' : `${orders.length} bills · ${rupees(totalBilledRevenue)} paid revenue`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end border border-ad-hairline bg-ad-surface p-3">
          <label className="ad-label m-0">From<input className="ad-input mt-1" type="date" value={dateFrom} max={dateTo} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label className="ad-label m-0">To<input className="ad-input mt-1" type="date" value={dateTo} min={dateFrom} max={today} onChange={(event) => setDateTo(event.target.value)} /></label>
          <span className="ad-kicker pb-2">IST business dates</span>
        </div>

        {error && (
          <div role="alert" className="border-2 border-ad-accent bg-ad-accent-soft p-4 flex items-center gap-3">
            <AlertTriangle className="size-4" /><span className="text-sm">Could not load bills: {(error as Error).message}</span>
            <button className="ad-btn ad-btn-secondary ml-auto" onClick={() => refetch()}><RefreshCw className="size-4" /> Retry</button>
          </div>
        )}

        {/* Filters */}
        <label className="ad-label sm:hidden m-0">Payment method
          <select className="ad-input mt-1" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as 'all' | PaymentMode)}>
            {(['all', 'cash', 'upi', 'card', 'razorpay', 'online', 'cod'] as const).map((mode) => <option key={mode} value={mode}>{mode.toUpperCase()} ({orders.filter((order) => mode === 'all' || order.paymentMode === mode).length})</option>)}
          </select>
        </label>
        <div className="hidden sm:flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'cash', 'upi', 'card', 'razorpay', 'online', 'cod'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentFilter(mode)}
              className="ad-tab shrink-0"
              data-active={paymentFilter === mode}
            >
              {mode} ({orders.filter((o) => mode === 'all' || o.paymentMode === mode).length})
            </button>
          ))}
        </div>

        {/* Table */}
        <div>
          <DataTable
            columns={columns}
            data={filteredBills}
            searchKey="bill"
            searchPlaceholder="Search bill number or customer…"
            height="480px"
            rowHeight={56}
            enableVirtualization={true}
            getRowId={(o) => o.id}
            renderMobileCard={(o) => (
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="ad-num text-[15px]">{o.id}</div>
                    <div className="ad-kicker mt-0.5">
                      {formatOrderTimestamp(o.createdAt || o.orderDate)}
                    </div>
                  </div>
                  <span className="ad-num text-[20px]">{rupees(o.grandTotal)}</span>
                </div>
                <div className="text-[13px] ad-muted">
                  {o.customerName || 'Walk-in'} · <span className="uppercase">{o.paymentMode || 'Cash'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setSelectedBillOrder(o)}>
                    Preview
                  </button>
                  <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => handlePrint(o)}>
                    Print receipt
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {/* Preview modal */}
      <Dialog open={!!displayedBillOrder} onOpenChange={(val) => {
        if (!val) {
          setSelectedBillOrder(null);
          if (linkedBillOrder) router.replace('/admin/bills', { scroll: false });
        }
      }}>
        {displayedBillOrder && (
          <DialogContent className="max-w-sm p-0 overflow-hidden">
            <DialogHeader className="border-b-2 border-ad-line px-5 py-4">
              <DialogTitle className="ad-h text-[17px]">Receipt {displayedBillOrder.id}</DialogTitle>
              <DialogDescription className="ad-kicker mt-1">
                Counter preview · {rupees(displayedBillOrder.grandTotal)}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[50vh] overflow-y-auto bg-ad-surface p-4">
              <div className="border border-dashed border-ad-line bg-ad-bg py-2">
                <ThermalBill order={displayedBillOrder} />
              </div>
            </div>

            <div className="p-4 border-t-2 border-ad-line bg-ad-surface">
              <button type="button" className="ad-btn ad-btn-primary w-full" onClick={() => handlePrint(displayedBillOrder)}>
                <Printer className="size-4" /> Print receipt
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
