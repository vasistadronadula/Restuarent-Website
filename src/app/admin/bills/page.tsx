'use client';

import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { Order } from '@/types';
import { PageHeader, StatCard, SectionCard } from '@/components/admin/ui';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Printer, Eye, FileText, DollarSign } from 'lucide-react';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal, { type BillFormat } from '@/components/bill/PrintBillPortal';
import { generateInvoiceNo } from '@/lib/idGenerator';
import { rupees } from '@/lib/billing';

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

  /**
   * The counter reprints an 80mm roll; a customer asking for "the bill" wants
   * the A4 tax invoice. Both come from the same order, so the format is a
   * parameter rather than two separate paths.
   */
  const handlePrint = (order: Order, format: BillFormat) => {
    setReprint({ order, format });
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => setReprint(null), 1000);
    });
  };

  const columns = useMemo<ColumnDef<any, Order>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Bill No / ID',
      cell: ({ row }) => (
        <div>
          <div className="font-extrabold text-stone-900 dark:text-stone-100">{row.original.id}</div>
          <div className="text-[10px] text-stone-400 font-semibold">{new Date(row.original.createdAt || row.original.orderDate || Date.now()).toLocaleString()}</div>
        </div>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-stone-900 dark:text-stone-100">{row.original.customerName || 'Walk-in'}</div>
          <div className="text-xs text-stone-400">{row.original.customerPhone || 'N/A'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'paymentMode',
      header: 'Payment Mode',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-black text-[10px] uppercase bg-stone-100 dark:bg-stone-800">
          {row.original.paymentMode || 'Cash'}
        </Badge>
      ),
    },
    {
      accessorKey: 'grandTotal',
      header: 'Amount Paid',
      cell: ({ row }) => (
        <span className="font-black text-amber-700 dark:text-amber-500 text-sm">
          {rupees(row.original.grandTotal)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBillOrder(order)}
              className="h-8 px-2 text-xs font-bold"
            >
              <Eye className="size-3.5" /> View
            </Button>
            <Button
              size="sm"
              onClick={() => handlePrint(order, 'thermal')}
              className="h-8 bg-amber-600 px-2 text-xs font-bold text-white hover:bg-amber-700"
              title="Print 80mm thermal printer bill"
            >
              <Printer className="size-3.5" /> 80mm Bill
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint(order, 'a4')}
              className="h-8 px-2 text-xs font-bold"
              title="Full-page A4 tax invoice"
            >
              <FileText className="size-3.5" /> A4 Invoice
            </Button>
          </div>
        );
      },
    },
  ], []);

  return (
    <AdminLayout title="Generated Bills & Receipts">
      <div className="space-y-4 w-full max-w-full">
        {reprint && (
          <PrintBillPortal
            order={reprint.order}
            format={reprint.format}
            invoiceNo={generateInvoiceNo(reprint.order.id)}
            copyLabel={reprint.format === 'a4' ? 'DUPLICATE' : undefined}
          />
        )}

        <PageHeader
          title="Cashier Bills & Transaction Log"
          subtitle="Reprint the counter receipt or issue a full A4 tax invoice for any order"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatCard
            icon={<Receipt className="w-5 h-5" />}
            label="Total Receipts Issued"
            value={orders.length}
            sub="Register transactions"
            accent="#2563EB"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Total Register Receipts Sum"
            value={rupees(totalBilledRevenue)}
            sub="All payment modes"
            accent="#059669"
          />
        </div>

        <SectionCard noPadding className="p-3">
          <div className="flex gap-2 overflow-x-auto pb-2.5 mb-3 border-b border-stone-100 dark:border-[#2C2C2E]/60 scrollbar-none">
            {(['all', 'cash', 'upi', 'card'] as const).map((mode) => (
              <Button
                key={mode}
                variant={paymentFilter === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPaymentFilter(mode)}
                className={`rounded-full text-xs font-bold uppercase ${
                  paymentFilter === mode ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
                }`}
              >
                {mode} ({orders.filter((o) => mode === 'all' || o.paymentMode === mode).length})
              </Button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={filteredBills}
            searchKey="customerName"
            searchPlaceholder="Search bill ID or customer name..."
            height="550px"
            rowHeight={56}
            enableVirtualization={true}
          />
        </SectionCard>
      </div>

      {/* Bill View Modal */}
      <Dialog open={!!selectedBillOrder} onOpenChange={(val) => { if (!val) setSelectedBillOrder(null); }}>
        {selectedBillOrder && (
          <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
            <DialogHeader className="border-b border-stone-100 px-5 py-4 text-left dark:border-[#2C2C2E]/60">
              <DialogTitle className="text-base font-black">
                Bill {selectedBillOrder.id}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Counter receipt preview — {rupees(selectedBillOrder.grandTotal)}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[55dvh] overflow-y-auto bg-stone-50/60 p-4 dark:bg-stone-950/40">
              <div className="rounded-xl border border-dashed border-stone-300 bg-white py-2 dark:border-[#2C2C2E]/60">
                <ThermalBill order={selectedBillOrder} />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-stone-100 bg-stone-50/40 px-5 py-3.5 dark:border-[#2C2C2E]/60 dark:bg-stone-950/30 sm:flex-row">
              <Button
                onClick={() => handlePrint(selectedBillOrder, 'thermal')}
                className="flex-1 rounded-xl bg-amber-600 text-xs font-black text-white hover:bg-amber-700"
              >
                <Printer className="size-3.5" /> Print 80mm Bill
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePrint(selectedBillOrder, 'a4')}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                <FileText className="size-3.5" /> A4 Invoice
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AdminLayout>
  );
}
