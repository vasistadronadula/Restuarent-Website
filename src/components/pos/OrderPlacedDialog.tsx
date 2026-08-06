'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Printer, Bluetooth, AlertCircle, Receipt, Loader2 } from 'lucide-react';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal from '@/components/bill/PrintBillPortal';
import { isPrinterConnected, printOrder, savedPrinterName } from '@/lib/thermalPrinter';
import { rupees } from '@/lib/billing';
import type { Order } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type PrintState = 'idle' | 'printing' | 'printed' | 'failed';

interface Props {
  order: Order | null;
  invoiceNo?: string;
  open: boolean;
  onNewOrder: () => void;
}

export default function OrderPlacedDialog({ order, invoiceNo, open, onNewOrder }: Props) {
  if (!order) return null;
  return (
    <PlacedDialog
      key={order.id}
      order={order}
      invoiceNo={invoiceNo}
      open={open}
      onNewOrder={onNewOrder}
    />
  );
}

function PlacedDialog({
  order, invoiceNo, open, onNewOrder,
}: Props & { order: Order }) {
  const [printState, setPrintState] = useState<PrintState>(() =>
    isPrinterConnected() ? 'printing' : 'idle'
  );
  const [browserPrinting, setBrowserPrinting] = useState(false);

  useEffect(() => {
    if (!isPrinterConnected()) return;
    let cancelled = false;

    void printOrder(order, invoiceNo).then((ok) => {
      if (!cancelled) setPrintState(ok ? 'printed' : 'failed');
    });

    return () => { cancelled = true; };
  }, [order, invoiceNo]);

  const printAgain = async () => {
    if (isPrinterConnected()) {
      setPrintState('printing');
      const ok = await printOrder(order, invoiceNo);
      setPrintState(ok ? 'printed' : 'failed');
      return;
    }
    setBrowserPrinting(true);
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => setBrowserPrinting(false), 2000);
    });
  };

  const status = (() => {
    switch (printState) {
      case 'printing':
        return { icon: <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />, text: 'Sending to printer…', color: 'text-stone-500' };
      case 'printed':
        return {
          icon: <Bluetooth className="w-4 h-4 text-emerald-600" />,
          text: `Printed on ${savedPrinterName() || 'counter printer'}`,
          color: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
          text: 'Printer did not respond — print again',
          color: 'text-rose-600',
        };
      default:
        return {
          icon: <Receipt className="w-4 h-4 text-stone-400" />,
          text: 'No printer paired — use Print bill',
          color: 'text-stone-500',
        };
    }
  })();

  return (
    <>
      {open && <PrintBillPortal order={order} invoiceNo={invoiceNo} />}

      <Dialog open={open} onOpenChange={(val) => { if (!val) onNewOrder(); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white dark:bg-stone-900 border-none shadow-2xl">
          <DialogHeader className="bg-emerald-600 text-white p-5 text-left">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 flex-shrink-0" />
              <div>
                <DialogTitle className="text-white font-black text-lg leading-tight">
                  Order placed · {rupees(order.grandTotal)}
                </DialogTitle>
                <p className="text-xs text-emerald-100 mt-0.5 font-medium">
                  {order.id}{invoiceNo ? ` · Bill ${invoiceNo}` : ''}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-2.5 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200/80 dark:border-stone-800 flex items-center gap-2 text-xs font-semibold">
            {status.icon}
            <span className={status.color}>{status.text}</span>
          </div>

          <div className="p-4 bg-stone-100/50 dark:bg-stone-950/40 max-h-[60vh] overflow-y-auto">
            <div className="bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-2">
              <ThermalBill order={order} invoiceNo={invoiceNo} />
            </div>
          </div>

          <DialogFooter className="p-4 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-200/80 dark:border-stone-800 flex flex-row gap-3">
            <Button
              variant="outline"
              onClick={printAgain}
              disabled={printState === 'printing' || browserPrinting}
              className="flex-1 font-bold rounded-xl h-11 border-stone-300 dark:border-stone-700"
            >
              <Printer className="w-4 h-4 mr-2" />
              {printState === 'printed' ? 'Print again' : 'Print bill'}
            </Button>
            <Button
              onClick={onNewOrder}
              className="flex-1 font-black rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
            >
              New order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
