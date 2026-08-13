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
          <div className="font-mono text-xs font-bold text-slate-900">#{row.original.id}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
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
          <div className="font-bold text-xs sm:text-sm text-slate-900">{row.original.customerName || 'Walk-in'}</div>
          <div className="text-[11px] text-slate-400 font-medium">{row.original.customerPhone || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'paymentMode',
      header: 'Payment',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] font-bold uppercase bg-slate-50 border-slate-200 text-slate-700">
          {row.original.paymentMode || 'Cash'}
        </Badge>
      ),
    },
    {
      accessorKey: 'grandTotal',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-bold text-slate-900 font-mono tabular-nums">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBillOrder(order)}
              className="h-8 px-2.5 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Eye className="size-3.5 mr-1" /> View
            </Button>
            <Button
              size="sm"
              onClick={() => handlePrint(order)}
              className="h-8 bg-[#059669] hover:bg-[#047857] text-white px-2.5 text-xs font-bold rounded-xl shadow-2xs"
            >
              <Printer className="size-3.5 mr-1" /> Print
            </Button>
          </div>
        );
      },
    },
  ], []);

  return (
    <AdminLayout title="Bills Ledger">
      <div className="space-y-5 w-full max-w-full font-sans">
        {reprint && (
          <PrintBillPortal
            order={reprint.order}
            format={reprint.format}
            invoiceNo={generateInvoiceNo(reprint.order.id)}
            copyLabel={reprint.format === 'a4' ? 'DUPLICATE' : undefined}
          />
        )}

        {/* Header */}
        <PageHeader
          title="Transaction Ledger"
          subtitle={`${orders.length} total bills · Total value ${rupees(totalBilledRevenue)}`}
        />

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'cash', 'upi', 'card'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPaymentFilter(mode)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap uppercase',
                paymentFilter === mode
                  ? 'border-[#059669] bg-[#059669] text-white shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              {mode} ({orders.filter((o) => mode === 'all' || o.paymentMode === mode).length})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
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
                    <div className="font-mono text-xs font-bold text-slate-900">#{o.id}</div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {new Date(o.createdAt || o.orderDate || Date.now()).toLocaleString()}
                    </div>
                  </div>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {rupees(o.grandTotal)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {o.customerName || 'Walk-in'} · <span className="uppercase font-bold">{o.paymentMode || 'Cash'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setSelectedBillOrder(o)} className="h-8 text-xs font-bold rounded-xl border-slate-200">
                    View Preview
                  </Button>
                  <Button size="sm" onClick={() => handlePrint(o)} className="h-8 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl shadow-2xs">
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
          <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden bg-white border border-slate-200">
            <DialogHeader className="border-b border-slate-100 px-5 py-4">
              <DialogTitle className="text-sm font-bold text-slate-900">
                Receipt #{selectedBillOrder.id}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5 font-medium">
                Counter receipt preview · {rupees(selectedBillOrder.grandTotal)}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[50vh] overflow-y-auto bg-slate-50 p-4">
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-2 shadow-2xs">
                <ThermalBill order={selectedBillOrder} />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <Button onClick={() => handlePrint(selectedBillOrder)} className="w-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold h-10 rounded-xl shadow-xs">
                <Printer className="size-4 mr-1.5" /> Print Receipt
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
