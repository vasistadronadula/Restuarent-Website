'use client';

import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Order } from '@/types';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal from '@/components/bill/PrintBillPortal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  isAutoPrinted?: boolean;
  invoiceNo?: string;
}

export default function ThermalReceiptModal({ order, open, onClose, isAutoPrinted = false, invoiceNo }: Props) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {open && <PrintBillPortal order={order} invoiceNo={invoiceNo} />}

      <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
        <DialogContent className="max-w-xs p-0 overflow-hidden rounded-2xl bg-white dark:bg-stone-900 border-none shadow-2xl">
          <DialogHeader className="bg-stone-900 text-white p-4 pr-12">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-500" />
              <DialogTitle className="text-white font-black text-sm">
                {isAutoPrinted ? 'New order — receipt' : 'Bill preview'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-4 bg-stone-50 dark:bg-stone-950/40">
            {isAutoPrinted && (
              <div className="mb-3 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>New order received — printing receipt</span>
              </div>
            )}

            <div className="bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-700 rounded-lg py-2 overflow-x-auto">
              <ThermalBill order={order} invoiceNo={invoiceNo} />
            </div>
          </div>

          <DialogFooter className="p-3 bg-stone-100 dark:bg-stone-800/40 border-t border-stone-200 dark:border-stone-800 flex flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 font-bold text-xs h-10 rounded-xl">
              Close
            </Button>
            <Button onClick={handlePrint} className="flex-1 font-black text-xs h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md">
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print 80mm bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
