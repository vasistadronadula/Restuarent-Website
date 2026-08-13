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
        <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-stone-900 via-stone-850 to-amber-950 text-white p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ad-accent-soft text-ad-accent grid place-items-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-white font-black text-base sm:text-lg">
                  {isAutoPrinted ? 'New Order Receipt' : 'Bill Preview'}
                </DialogTitle>
                <p className="text-xs text-stone-300 font-medium">80mm Thermal POS Print Format</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 sm:p-6 bg-stone-50 dark:bg-stone-950/40">
            {isAutoPrinted && (
              <div className="mb-4 p-3 bg-ad-surface border border-ad-hairline flex items-center gap-2.5 text-[13px] font-semibold" style={{ color: 'var(--ad-ok)' }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>New order received — thermal receipt printed automatically</span>
              </div>
            )}

            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-4 shadow-sm overflow-x-auto max-h-96">
              <ThermalBill order={order} invoiceNo={invoiceNo} />
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-5 bg-stone-100/80 dark:bg-stone-800/40 border-t border-stone-200 dark:border-stone-800 flex flex-row gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 font-bold text-xs h-11 rounded-2xl">
              Close
            </Button>
            <Button onClick={handlePrint} className="ad-btn ad-btn-primary flex-1 h-11">
              <Printer className="w-4 h-4 mr-2" />
              Print Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
