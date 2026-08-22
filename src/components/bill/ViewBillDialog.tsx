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
  DialogFooter,
} from '@/components/ui/dialog';
import ThermalBill from './ThermalBill';
import PrintBillPortal from './PrintBillPortal';
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

      {open && <PrintBillPortal order={order} invoiceNo={invoiceNo} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden rounded-3xl bg-white text-stone-900 border border-stone-200">
          <DialogHeader className="bg-gradient-to-r from-stone-900 via-stone-850 to-amber-950 text-white p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 text-amber-400 grid place-items-center rounded-xl">
                <FileText className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-white font-black text-base sm:text-lg">
                  Tax Invoice
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-300 font-medium mt-0.5">
                  Order ID: {order.orderId}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 sm:p-6 bg-stone-50">
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm overflow-x-auto max-h-96">
              <ThermalBill order={order} invoiceNo={invoiceNo} />
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-5 bg-stone-100/80 border-t border-stone-200 flex flex-row gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 font-bold text-xs h-11 rounded-2xl">
              Close
            </Button>
            <Button variant="brand" onClick={handlePrint} className="flex-1 font-bold text-xs h-11 rounded-2xl">
              <Printer className="size-4 mr-2" />
              Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
