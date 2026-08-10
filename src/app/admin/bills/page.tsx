'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Order } from '@/types';
import { PageHeader, StatusChip } from '@/components/admin/ui';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Eye } from 'lucide-react';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal, { type BillFormat } from '@/components/bill/PrintBillPortal';
import { generateInvoiceNo } from '@/lib/idGenerator';
import { rupees } from '@/lib/billing';
import { flushSync } from 'react-dom';
import { cn } from '@/lib/utils';

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
          <div className="font-mono text-sm text-stone-900">{row.original.id}</div>
          <div className="text-xs text-stone-400 mt-0.5">
            {new Date(row.original.createdAt || row.original.orderDate || Date.now()).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm text-stone-900">{row.original.customerName || 'Walk-in'}</div>
          <div className="text-xs text-stone-400">{row.original.customerPhone || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'paymentMode',
      header: 'Payment',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs font-medium uppercase bg-stone-50 border-stone-200 text-stone-600">
          {row.original.paymentMode || 'Cash'}
        </Badge>
      ),
    },
    {
      accessorKey: 'grandTotal',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-semibold text-stone-900 tabular-nums">
          {rupees(row.original.grandTotal)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setSelectedBillOrder(order)} className="h-8 px-2.5 text-xs">
              <Eye className="size-3.5 mr-1" /> View
            </Button>
            <Button size="sm" onClick={() => handlePrint(order)} className="h-8 bg-amber-600 hover:bg-amber-700 text-white px-2.5 text-xs">
              <Printer className="size-3.5 mr-1" /> Print
            </Button>
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Transaction Ledger</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {orders.length} bills · Total value {rupees(totalBilledRevenue)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'cash', 'upi', 'card'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentFilter(mode)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap uppercase',
                paymentFilter === mode
                  ? 'border-amber-600 bg-amber-600 text-white'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              )}
            >
              {mode} ({orders.filter((o) => mode === 'all' || o.paymentMode === mode).length})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-stone-200">
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
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-stone-900">{o.id}</div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {new Date(o.createdAt || o.orderDate || Date.now()).toLocaleString()}
                    </div>
                  </div>
                  <span className="font-semibold text-stone-900 tabular-nums">
                    {rupees(o.grandTotal)}
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  {o.customerName || 'Walk-in'} · <span className="uppercase">{o.paymentMode || 'Cash'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedBillOrder(o)} className="h-8 text-xs">
                    View Preview
                  </Button>
                  <Button size="sm" onClick={() => handlePrint(o)} className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                    Print 80mm
                  </Button>
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {/* Preview modal */}
      <Dialog open={!!selectedBillOrder} onOpenChange={(val) => { if (!val) setSelectedBillOrder(null); }}>
        {selectedBillOrder && (
          <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden bg-white border border-stone-200">
            <DialogHeader className="border-b border-stone-100 px-5 py-4">
              <DialogTitle className="text-sm font-semibold text-stone-900">
                Receipt {selectedBillOrder.id}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400 mt-0.5">
                Counter receipt preview · {rupees(selectedBillOrder.grandTotal)}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[50vh] overflow-y-auto bg-stone-50 p-4">
              <div className="rounded-lg border border-dashed border-stone-200 bg-white py-2">
                <ThermalBill order={selectedBillOrder} />
              </div>
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50">
              <Button onClick={() => handlePrint(selectedBillOrder)} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-9">
                <Printer className="size-4 mr-1.5" /> Print Receipt
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
