'use client';

import React, { useState } from 'react';
import { FileText, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import InvoiceA4 from './InvoiceA4';
import type { Order } from '@/types';
import { generateInvoiceNo } from '@/lib/idGenerator';

interface ViewBillDialogProps {
  order: Order;
  triggerLabel?: string;
  className?: string;
}

export default function ViewBillDialog({
  order,
  triggerLabel = 'View Bill',
  className,
}: ViewBillDialogProps) {
  const [open, setOpen] = useState(false);
  const invoiceNo = generateInvoiceNo(order.id);

  const handlePrint = () => {
    // Open print window directly
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // We can print the current page, but to print just the bill we can use window.print() on the parent.
    // However, the cleanest way in this codebase is to temporarily mount a printing portal or call window.print()
    // which has a print media stylesheet hiding everything except the print-root.
    // Let's trigger window.print() directly!
    window.print();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <FileText className="size-4 mr-1.5" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[calc(100%-2rem)] p-4 sm:p-6 rounded-2xl bg-white text-stone-900 border border-stone-200">
          <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b border-stone-100 pb-3">
            <div>
              <DialogTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <FileText className="text-amber-600 size-5" />
                Tax Invoice
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 mt-0.5">
                Order ID: {order.orderId}
              </DialogDescription>
            </div>
            
            <Button
              size="sm"
              variant="brand"
              onClick={handlePrint}
              className="mr-6 rounded-lg font-semibold text-xs h-8 px-3"
            >
              <Printer className="size-3.5 mr-1.5" />
              Print / Save PDF
            </Button>
          </DialogHeader>

          {/* PDF Viewer Container */}
          <div className="mt-4 overflow-x-auto w-full rounded-xl border border-stone-200 bg-stone-100 p-2 sm:p-4 max-h-[70vh] overflow-y-auto">
            <div className="min-w-[210mm] mx-auto bg-white shadow-sm border border-stone-300 rounded-md">
              <InvoiceA4 order={order} invoiceNo={invoiceNo} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
