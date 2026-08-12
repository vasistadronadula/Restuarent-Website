'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Users, Utensils, CheckCircle2, Clock, DollarSign, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';

export interface TableItem {
  id: string;
  tableNumber: number;
  capacity: number;
  description?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tables: TableItem[];
  activeOrders: Order[];
  selectedTable: number | '';
  onSelectTable: (tableNum: number) => void;
}

export default function TableFloorMapModal({
  open,
  onClose,
  tables,
  activeOrders,
  selectedTable,
  onSelectTable,
}: Props) {
  // Compute occupancy status for each table from active orders
  const tableStatusMap = React.useMemo(() => {
    const map = new Map<number, {
      status: 'available' | 'ordered' | 'waiting_payment';
      activeOrder?: Order;
      runningBill?: number;
      elapsedMinutes?: number;
      guestCount?: number;
    }>();

    // Default all tables to available
    tables.forEach((t) => {
      map.set(t.tableNumber, { status: 'available' });
    });

    // Match with active orders
    activeOrders.forEach((o) => {
      if (o.tableNumber && o.status !== 'delivered' && o.status !== 'cancelled') {
        const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : Date.now();
        const elapsedMins = Math.floor((Date.now() - orderTime) / 60000);
        const isPaid = o.paymentStatus === 'paid';

        map.set(o.tableNumber, {
          status: isPaid ? 'ordered' : 'waiting_payment',
          activeOrder: o,
          runningBill: o.grandTotal,
          elapsedMinutes: Math.max(1, elapsedMins),
          guestCount: 2,
        });
      }
    });

    return map;
  }, [tables, activeOrders]);

  const stats = React.useMemo(() => {
    let available = 0;
    let occupied = 0;
    let waitingPayment = 0;

    tables.forEach((t) => {
      const info = tableStatusMap.get(t.tableNumber);
      if (info?.status === 'waiting_payment') waitingPayment++;
      else if (info?.status === 'ordered') occupied++;
      else available++;
    });

    return { available, occupied, waitingPayment, total: tables.length };
  }, [tables, tableStatusMap]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <LayoutGrid className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-white leading-tight flex items-center gap-2">
                Restaurant Floor Table Map
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px] font-bold">
                  {stats.total} Total Tables
                </Badge>
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Tap any table to assign to current ticket or inspect running bill
              </p>
            </div>
          </div>

          {/* Quick Legend Pills */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="size-2 rounded-full bg-emerald-400" />
              {stats.available} Available
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <span className="size-2 rounded-full bg-amber-400" />
              {stats.occupied} In Kitchen
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <span className="size-2 rounded-full bg-rose-400" />
              {stats.waitingPayment} Due Bill
            </span>
          </div>
        </div>

        {/* Floor Map Visual Grid */}
        <div className="p-6 bg-slate-50/50 max-h-[68vh] overflow-y-auto">
          {tables.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Utensils className="size-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-slate-600">No tables configured in system</p>
              <p className="text-xs text-slate-400 mt-1">Configure dining tables in Menu Management</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tables.map((table) => {
                const info = tableStatusMap.get(table.tableNumber);
                const status = info?.status || 'available';
                const isSelected = selectedTable === table.tableNumber;

                const isAvailable = status === 'available';
                const isOrdered = status === 'ordered';
                const isWaitingPayment = status === 'waiting_payment';

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      onSelectTable(table.tableNumber);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl text-left transition-all border-2 flex flex-col justify-between select-none group relative ${
                      isSelected
                        ? 'border-blue-600 ring-4 ring-blue-500/20 bg-blue-50/80 shadow-md scale-[1.02]'
                        : isAvailable
                        ? 'bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-md'
                        : isOrdered
                        ? 'bg-white border-amber-300 hover:border-amber-400 hover:shadow-md'
                        : 'bg-white border-rose-300 hover:border-rose-400 hover:shadow-md'
                    }`}
                  >
                    {/* Top row: Table # and Status Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xl font-black text-slate-900 block leading-tight">
                          Table #{table.tableNumber}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                          <Users className="size-3 text-slate-400" /> {table.capacity} Seats
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isOrdered
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isAvailable ? 'Free' : isOrdered ? 'Cooking' : 'Bill Due'}
                      </span>
                    </div>

                    {/* Middle: Active ticket summary */}
                    <div className="mt-4 pt-3 border-t border-slate-100 min-h-[42px] flex flex-col justify-end">
                      {info?.activeOrder ? (
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="truncate">#{info.activeOrder.id.slice(-4)}</span>
                            <span className="font-mono text-slate-950 font-black">
                              {formatCurrency(info.runningBill || 0)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="size-2.5 text-slate-400" /> {info.elapsedMinutes}m active
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> Ready for Guests
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            {selectedTable !== '' ? `Current selection: Table #${selectedTable}` : 'No table currently selected'}
          </span>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border-slate-300 font-bold text-xs h-9"
          >
            Close Map
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
