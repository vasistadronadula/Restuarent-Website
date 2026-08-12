'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Banknote, QrCode, CreditCard, ShoppingBag, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  orders: Order[];
  cashierName?: string;
}

export default function ShiftSummaryModal({
  open,
  onClose,
  orders,
  cashierName = 'Vasishtha',
}: Props) {
  // Aggregate today's register metrics
  const shiftMetrics = React.useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;
    let completedOrders = 0;

    orders.forEach((o) => {
      if (o.status !== 'cancelled') {
        const amt = o.grandTotal || 0;
        totalSales += amt;
        completedOrders++;

        if (o.paymentMode === 'cash') cashSales += amt;
        else if (o.paymentMode === 'upi') upiSales += amt;
        else if (o.paymentMode === 'card') cardSales += amt;
      }
    });

    const avgTicket = completedOrders > 0 ? Math.round(totalSales / completedOrders) : 0;

    return {
      totalSales,
      cashSales,
      upiSales,
      cardSales,
      completedOrders,
      avgTicket,
    };
  }, [orders]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-white leading-tight flex items-center gap-2">
                Shift & Till Reconciliation
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-bold">
                  🟢 Shift Active
                </Badge>
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Terminal #1 · Cashier: {cashierName}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 bg-slate-50/60 space-y-4">
          {/* Main Top Revenue Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Shift Turnover</p>
              <p className="text-3xl font-black text-slate-950 font-mono mt-1">
                {formatCurrency(shiftMetrics.totalSales)}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {shiftMetrics.completedOrders} orders settled · Avg {formatCurrency(shiftMetrics.avgTicket)}/ticket
              </p>
            </div>
            <div className="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="size-6" />
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-[10px] font-black uppercase tracking-wider">Cash in Till</span>
                <Banknote className="size-4 text-emerald-600" />
              </div>
              <p className="text-xl font-black text-emerald-950 font-mono mt-2">
                {formatCurrency(shiftMetrics.cashSales)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 shadow-2xs">
              <div className="flex items-center justify-between text-purple-800">
                <span className="text-[10px] font-black uppercase tracking-wider">UPI / QR</span>
                <QrCode className="size-4 text-purple-600" />
              </div>
              <p className="text-xl font-black text-purple-950 font-mono mt-2">
                {formatCurrency(shiftMetrics.upiSales)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 shadow-2xs">
              <div className="flex items-center justify-between text-blue-800">
                <span className="text-[10px] font-black uppercase tracking-wider">Card Swipe</span>
                <CreditCard className="size-4 text-blue-600" />
              </div>
              <p className="text-xl font-black text-blue-950 font-mono mt-2">
                {formatCurrency(shiftMetrics.cardSales)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100/80 border-t border-slate-200 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-slate-300 font-bold text-xs h-9"
          >
            Close Summary
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
