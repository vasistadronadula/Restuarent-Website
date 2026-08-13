'use client';

import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users, Clock } from 'lucide-react';
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        {/* Header — ink, matching the console rail */}
        <div className="p-5 bg-ad-ink text-ad-bg flex items-center justify-between gap-4">
          <div className="min-w-0">
            <DialogTitle className="ad-num text-[20px] leading-tight">Floor plan</DialogTitle>
            <DialogDescription className="text-[12px] mt-1 opacity-70">
              Tap a table to put it on this ticket.
            </DialogDescription>
          </div>

          <div className="hidden sm:flex items-center gap-4 ad-kicker text-ad-bg opacity-80">
            <span>{stats.available} free</span>
            <span>{stats.occupied} cooking</span>
            <span>{stats.waitingPayment} bill due</span>
          </div>
        </div>

        {/* Floor Map Visual Grid */}
        <div className="p-5 max-h-[68vh] overflow-y-auto">
          {tables.length === 0 ? (
            <div className="py-20 text-center">
              <p className="ad-h text-[16px]">No tables configured</p>
              <p className="text-[13px] ad-muted mt-1.5">Add dining tables to use the floor plan.</p>
            </div>
          ) : (
            <div className="ad-grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
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
                    className="p-4 text-left flex flex-col justify-between select-none relative ad-hover min-h-32"
                    style={
                      isSelected
                        ? { background: 'var(--ad-ink)', color: 'var(--ad-bg)' }
                        : isWaitingPayment
                        ? { boxShadow: 'inset 4px 0 0 var(--ad-accent)' }
                        : undefined
                    }
                  >
                    {/* Top row: Table # and Status Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="ad-num text-[22px] block leading-tight">T{table.tableNumber}</span>
                        <span className="ad-kicker flex items-center gap-1 mt-0.5" style={isSelected ? { color: 'inherit', opacity: 0.7 } : undefined}>
                          <Users className="size-3" /> {table.capacity} seats
                        </span>
                      </div>

                      <span
                        className={`ad-tag ${isSelected ? '' : isAvailable ? 'ad-tag-outline' : isOrdered ? 'ad-tag-solid' : 'ad-tag-accent'}`}
                        style={isSelected ? { background: 'var(--ad-bg)', color: 'var(--ad-ink)' } : undefined}
                      >
                        {isAvailable ? 'Free' : isOrdered ? 'Cooking' : 'Bill due'}
                      </span>
                    </div>

                    {/* Middle: Active ticket summary */}
                    <div className="mt-3 pt-2.5 border-t border-ad-hairline min-h-10 flex flex-col justify-end">
                      {info?.activeOrder ? (
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="truncate">#{info.activeOrder.id.slice(-4)}</span>
                            <span className="ad-num text-[14px]">{formatCurrency(info.runningBill || 0)}</span>
                          </div>
                          <span className="ad-kicker flex items-center gap-1 mt-0.5" style={isSelected ? { color: 'inherit', opacity: 0.7 } : undefined}>
                            <Clock className="size-2.5" /> {info.elapsedMinutes}m
                          </span>
                        </div>
                      ) : (
                        <span className="ad-kicker" style={isSelected ? { color: 'inherit', opacity: 0.7 } : undefined}>
                          Ready to seat
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
        <div className="p-4 bg-ad-surface border-t-2 border-ad-line flex items-center justify-between gap-3">
          <span className="ad-kicker">
            {selectedTable !== '' ? `Selected: table ${selectedTable}` : 'No table selected'}
          </span>
          <button type="button" onClick={onClose} className="ad-btn ad-btn-secondary">
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
