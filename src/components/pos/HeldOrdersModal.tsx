'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PauseCircle, PlayCircle, Trash2, Clock, ShoppingBag, Utensils } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PosLine } from '@/hooks/usePosCart';
import { PosOrderType } from './BillPanel';

export interface HeldOrder {
  id: string;
  heldAt: string;
  orderType: PosOrderType;
  tableNumber: number | '';
  customerName?: string;
  customerPhone?: string;
  lines: PosLine[];
  subtotal: number;
  totalUnits: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onRestore: (order: HeldOrder) => void;
  onDelete: (id: string) => void;
}

export default function HeldOrdersModal({
  open,
  onClose,
  heldOrders,
  onRestore,
  onDelete,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <PauseCircle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-white leading-tight flex items-center gap-2">
                Parked & Held Orders
                <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] font-bold">
                  {heldOrders.length} Held
                </Badge>
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Recall any parked ticket back into the active POS till
              </p>
            </div>
          </div>
        </div>

        {/* List of Held Orders */}
        <div className="p-6 bg-slate-50/50 max-h-[60vh] overflow-y-auto space-y-3">
          {heldOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <ShoppingBag className="size-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-slate-600">No parked orders</p>
              <p className="text-xs text-slate-400 mt-0.5">Use "Hold Order" in the checkout panel to park an in-progress cart</p>
            </div>
          ) : (
            heldOrders.map((ho) => (
              <div
                key={ho.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      #{ho.id.slice(-4)}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                      {ho.orderType}
                    </span>
                    {ho.tableNumber && (
                      <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Table #{ho.tableNumber}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="size-3" /> {ho.heldAt}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 truncate max-w-md">
                    <strong className="text-slate-900">{ho.customerName || 'Counter Customer'}</strong>
                    {' '}— {ho.lines.map((l) => `${l.name} ×${l.quantity}`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 justify-end">
                  <span className="font-mono text-base font-black text-slate-900">
                    {formatCurrency(ho.subtotal)}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      onRestore(ho);
                      onClose();
                    }}
                    className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                  >
                    <PlayCircle className="size-4" /> Recall
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onDelete(ho.id)}
                    className="size-9 rounded-xl border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Discard Held Order"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100/80 border-t border-slate-200 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-slate-300 font-bold text-xs h-9"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
