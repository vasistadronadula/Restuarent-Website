'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Printer, Bluetooth, AlertCircle, Receipt, Loader2 } from 'lucide-react';
import ThermalBill from '@/components/bill/ThermalBill';
import PrintBillPortal from '@/components/bill/PrintBillPortal';
import { isPrinterConnected, printOrder, savedPrinterName } from '@/lib/thermalPrinter';
import { rupees } from '@/lib/billing';
import type { Order } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

  const printAgain = () => {
    if (isPrinterConnected()) {
      setPrintState('printing');
      void printOrder(order, invoiceNo).then((ok) => {
        setPrintState(ok ? 'printed' : 'failed');
      });
      return;
    }
    
    // Call window.print() completely synchronously to avoid iOS/Safari/Chrome popup blocks
    setBrowserPrinting(true);
    window.print();
    setBrowserPrinting(false);
  };

  const status = (() => {
    switch (printState) {
      case 'printing':
        return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Sending to printer…', color: 'ad-muted' };
      case 'printed':
        return {
          icon: <Bluetooth className="w-4 h-4" />,
          text: `Printed on ${savedPrinterName() || 'counter printer'}`,
          color: 'ad-muted',
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-4 h-4 text-ad-accent" />,
          text: 'Printer did not respond — print again',
          color: 'text-ad-accent-deep',
        };
      default:
        return {
          icon: <Receipt className="w-4 h-4" />,
          text: 'No printer paired — use Print bill',
          color: 'ad-muted',
        };
    }
  })();

  return (
    <>
      {open && <PrintBillPortal order={order} invoiceNo={invoiceNo} />}

      <Dialog open={open} onOpenChange={(val) => { if (!val) onNewOrder(); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {/* Settled money keeps the till's green — see BillPanel. */}
          <DialogHeader
            className="p-5 text-left"
            style={{ background: 'var(--ad-ok)', color: 'var(--ad-bg)' }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="ad-num text-[20px] leading-tight">
                  Paid · {rupees(order.grandTotal)}
                </DialogTitle>
                <p className="text-[12px] mt-1 opacity-85 m-0">
                  {order.id}{invoiceNo ? ` · Bill ${invoiceNo}` : ''}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-2.5 bg-ad-surface border-b-2 border-ad-line flex items-center gap-2 text-[13px]">
            {status.icon}
            <span className={status.color}>{status.text}</span>
          </div>

          <div className="p-4 bg-ad-surface max-h-[60vh] overflow-y-auto">
            <div className="bg-white border border-dashed border-ad-line p-2">
              <ThermalBill order={order} invoiceNo={invoiceNo} />
            </div>
          </div>

          <DialogFooter className="p-4 border-t-2 border-ad-line flex flex-row gap-2">
            <button
              type="button"
              onClick={printAgain}
              disabled={printState === 'printing' || browserPrinting}
              className="ad-btn ad-btn-secondary flex-1 h-11"
            >
              <Printer className="w-4 h-4" />
              {printState === 'printed' ? 'Print again' : 'Print bill'}
            </button>
            <button
              type="button"
              onClick={onNewOrder}
              className="ad-btn ad-btn-primary flex-1 h-11"
            >
              New order
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
