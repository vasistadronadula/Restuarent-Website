'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Order } from '@/types';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Printer, Eye } from 'lucide-react';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal, { type BillFormat } from '@/components/bill/PrintBillPortal';
import { generateInvoiceNo } from '@/lib/idGenerator';
import { rupees } from '@/lib/billing';
import { formatOrderTimestamp } from '@/lib/utils';
import { flushSync } from 'react-dom';

export default function GeneratedBillsPage() {
  const { orders } = useAdmin();
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'upi' | 'card'>('all');
  const [selectedBillOrder, setSelectedBillOrder] = useState<Order | null>(null);
  const [reprint, setReprint] = useState<{ order: Order; format: BillFormat } | null>(null);

  const filteredBills = useMemo(() => {
    return orders.filter((o) => {
      const matchPayment = paymentFilter === 'all' || o.paymentMode === paymentFilter;
      return matchPayment;
    });
  }, [orders, paymentFilter]);

  const totalBilledRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  }, [orders]);

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
            {orders.length} bills · {rupees(totalBilledRevenue)} billed
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'cash', 'upi', 'card'] as const).map((mode) => (
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
            searchKey="customerName"
            searchPlaceholder="Search customer name…"
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
      <Dialog open={!!selectedBillOrder} onOpenChange={(val) => { if (!val) setSelectedBillOrder(null); }}>
        {selectedBillOrder && (
          <DialogContent className="max-w-sm p-0 overflow-hidden">
            <DialogHeader className="border-b-2 border-ad-line px-5 py-4">
              <DialogTitle className="ad-h text-[17px]">Receipt {selectedBillOrder.id}</DialogTitle>
              <DialogDescription className="ad-kicker mt-1">
                Counter preview · {rupees(selectedBillOrder.grandTotal)}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[50vh] overflow-y-auto bg-ad-surface p-4">
              <div className="border border-dashed border-ad-line bg-ad-bg py-2">
                <ThermalBill order={selectedBillOrder} />
              </div>
            </div>

            <div className="p-4 border-t-2 border-ad-line bg-ad-surface">
              <button type="button" className="ad-btn ad-btn-primary w-full" onClick={() => handlePrint(selectedBillOrder)}>
                <Printer className="size-4" /> Print receipt
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
