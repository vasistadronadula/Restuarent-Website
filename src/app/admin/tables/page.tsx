'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Search, SlidersHorizontal, User, X,
  Banknote, Percent, Split, ArrowRight, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface TableItem {
  id: string;
  name: string;
  type: 'booth' | 'round' | 'square';
  capacity: number;
  occupied: number;
  status: 'available' | 'occupied' | 'reserved';
  server?: string;
  timeSpent?: string;
  reservedAt?: string;
  bill?: {
    subtotal: number;
    tax: number;
    total: number;
    items: { qty: number; name: string; notes?: string; price: number }[];
  };
}

const INITIAL_TABLES: TableItem[] = [
  {
    id: 'b1',
    name: 'B1',
    type: 'booth',
    capacity: 4,
    occupied: 4,
    status: 'occupied',
    server: 'Alex M.',
    timeSpent: '45m',
    bill: {
      subtotal: 62.00,
      tax: 5.27,
      total: 67.27,
      items: [
        { qty: 2, name: 'Hyderabadi Chicken Biryani', notes: '+ Extra Salan', price: 38.00 },
        { qty: 2, name: 'Mirchi Bajji', notes: 'Extra spicy', price: 24.00 },
      ],
    },
  },
  {
    id: 'b2',
    name: 'B2',
    type: 'booth',
    capacity: 4,
    occupied: 0,
    status: 'available',
  },
  {
    id: 'b3',
    name: 'B3',
    type: 'booth',
    capacity: 4,
    occupied: 0,
    status: 'reserved',
    reservedAt: '19:00',
  },
  {
    id: 't1',
    name: 'T1',
    type: 'round',
    capacity: 8,
    occupied: 6,
    status: 'occupied',
    server: 'Sarah M.',
    timeSpent: 'Paying',
    bill: {
      subtotal: 74.50,
      tax: 6.33,
      total: 80.83,
      items: [
        { qty: 2, name: 'Truffle Burger', notes: '+ Medium Rare, + Extra Pickles', price: 36.00 },
        { qty: 1, name: 'Caesar Salad', notes: '- No Croutons', price: 14.50 },
        { qty: 3, name: 'Craft IPA Draft', price: 24.00 },
      ],
    },
  },
  {
    id: 't2',
    name: 'T2',
    type: 'round',
    capacity: 6,
    occupied: 0,
    status: 'available',
  },
  {
    id: 't3',
    name: 'T3',
    type: 'round',
    capacity: 6,
    occupied: 0,
    status: 'available',
  },
  {
    id: 's1',
    name: 'S1',
    type: 'square',
    capacity: 2,
    occupied: 0,
    status: 'available',
  },
  {
    id: 's2',
    name: 'S2',
    type: 'square',
    capacity: 2,
    occupied: 0,
    status: 'available',
  },
  {
    id: 's3',
    name: 'S3',
    type: 'square',
    capacity: 2,
    occupied: 0,
    status: 'available',
  },
  {
    id: 's4',
    name: 'S4',
    type: 'square',
    capacity: 2,
    occupied: 0,
    status: 'available',
  },
];

export default function TablesFloorPlanPage() {
  const [tablesList, setTablesList] = useState<TableItem[]>(INITIAL_TABLES);
  const [selectedTableId, setSelectedTableId] = useState<string>('t1');
  const [search, setSearch] = useState('');

  const selectedTable = tablesList.find((t) => t.id === selectedTableId) || tablesList[3];

  const handleSettleBill = () => {
    toast.success(`Table ${selectedTable.name} settled and marked Available! 🎉`);
    setTablesList((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id ? { ...t, status: 'available', occupied: 0, bill: undefined } : t
      )
    );
  };

  return (
    <AdminLayout title="Main Dining Room">
      <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-5rem)] gap-6 font-sans">

        {/* ── Middle: Floor Plan Canvas ── */}
        <div className="flex-1 min-w-0 flex flex-col space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Main Dining Room
              </h1>
              {/* Status Indicator Legend (Exact match: Available, Occupied, Reserved) */}
              <div className="flex items-center gap-4 text-xs font-bold text-slate-600 mt-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full border border-emerald-600 bg-emerald-50" />
                  <span>Available</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full border border-rose-600 bg-rose-500" />
                  <span>Occupied</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full border border-amber-600 bg-amber-500" />
                  <span>Reserved</span>
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-3.5 h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <SlidersHorizontal className="size-3.5 text-slate-500" />
                <span>Filter</span>
              </button>

              <div className="relative w-44 sm:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find Table..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-8.5 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Floor Plan Board Canvas */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200/90 p-8 shadow-2xs flex flex-col justify-between min-h-[460px]">

            {/* Top Row: Booths B1, B2, B3 */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-6 max-w-xl">
              {tablesList.slice(0, 3).map((table) => {
                const isSelected = selectedTableId === table.id;
                const isOccupied = table.status === 'occupied';
                const isReserved = table.status === 'reserved';

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id)}
                    className={cn(
                      'relative h-28 rounded-2xl border-2 flex flex-col items-center justify-center p-3 cursor-pointer select-none transition-all shadow-2xs active:scale-[0.98]',
                      isSelected
                        ? 'border-emerald-600 ring-4 ring-emerald-500/15 bg-emerald-50/20'
                        : isOccupied
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : isReserved
                        ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    {/* Time or Delay Pill Top Right */}
                    {table.timeSpent && (
                      <span className="absolute -top-2.5 bg-rose-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                        {table.timeSpent}
                      </span>
                    )}

                    <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {table.name}
                    </span>

                    <span className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                      <User className="size-3 text-slate-400" />
                      <span>{table.occupied}/{table.capacity}</span>
                    </span>

                    {table.reservedAt && (
                      <span className="text-[11px] font-bold text-amber-700 mt-1 flex items-center gap-1 font-mono">
                        <Clock className="size-2.5" />
                        <span>{table.reservedAt}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Middle Row: Big Round Tables T1, T2, T3 */}
            <div className="flex items-center gap-8 my-6 overflow-x-auto py-2">
              {tablesList.slice(3, 6).map((table) => {
                const isSelected = selectedTableId === table.id;
                const isOccupied = table.status === 'occupied';

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id)}
                    className={cn(
                      'relative size-36 rounded-full border-2 flex flex-col items-center justify-center p-3 cursor-pointer select-none transition-all shadow-2xs active:scale-[0.98] shrink-0',
                      isSelected
                        ? 'border-emerald-600 ring-4 ring-emerald-500/15 bg-emerald-50/20'
                        : isOccupied
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {table.name}
                    </span>

                    <span className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                      <User className="size-3 text-slate-400" />
                      <span>{table.occupied}/{table.capacity}</span>
                    </span>

                    {table.timeSpent && (
                      <span className="mt-1 bg-rose-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs">
                        {table.timeSpent}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Row: Square Small Tables S1, S2, S3, S4 */}
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-5 max-w-lg">
              {tablesList.slice(6, 10).map((table) => {
                const isSelected = selectedTableId === table.id;

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id)}
                    className={cn(
                      'h-16 rounded-xl border-2 flex items-center justify-center cursor-pointer select-none font-black font-mono text-base transition-all shadow-2xs active:scale-[0.98]',
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/20 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                    )}
                  >
                    {table.name}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* ── Right: Selected Table Details & Bill Summary (Exact match to Image 4) ── */}
        <aside className="w-full lg:w-80 xl:w-96 bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col justify-between overflow-hidden shrink-0">
          <div>
            {/* Header */}
            <div className="p-5 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-black text-slate-950 font-mono tracking-tight">
                    Table {selectedTable.name}
                  </h2>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10.5px] font-bold',
                      selectedTable.status === 'occupied'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    )}
                  >
                    {selectedTable.status === 'occupied' ? 'Occupied' : 'Available'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-medium mt-1">
                  👥 {selectedTable.occupied || selectedTable.capacity} Guests • Waiter: {selectedTable.server || 'Sarah M.'}
                </p>
              </div>

              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Itemized Order List */}
            <div className="p-5 space-y-4 max-h-[340px] overflow-y-auto">
              {selectedTable.bill?.items ? (
                selectedTable.bill.items.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <span className="size-6 rounded-md bg-blue-50 text-blue-900 font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                        {item.qty}x
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 text-[13px]">{item.name}</div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-400 font-medium">{item.notes}</div>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 font-mono text-[13px] tabular-nums shrink-0">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  Table is currently vacant.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Summary & Settle Actions */}
          <div className="p-5 border-t border-slate-100 space-y-3.5 bg-slate-50/50">
            {selectedTable.bill ? (
              <>
                <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-900 font-bold">
                      ${selectedTable.bill.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (8.5%)</span>
                    <span className="font-mono text-slate-900 font-bold">
                      ${selectedTable.bill.tax.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-200">
                  <span className="text-base font-bold text-slate-900">Total</span>
                  <span className="text-3xl font-black text-[#059669] font-mono tabular-nums">
                    ${selectedTable.bill.total.toFixed(2)}
                  </span>
                </div>

                {/* Secondary buttons: Split | Discount */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Split className="size-3.5 text-slate-500" />
                    <span>Split</span>
                  </button>

                  <button
                    type="button"
                    className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Percent className="size-3.5 text-slate-500" />
                    <span>Discount</span>
                  </button>
                </div>

                {/* Primary Pay Total CTA */}
                <button
                  type="button"
                  onClick={handleSettleBill}
                  className="w-full h-12 rounded-xl bg-[#065F46] hover:bg-[#047857] active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <Banknote className="size-4" />
                  <span>Pay Total</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => toast.success(`Assigned new party to Table ${selectedTable.name}`)}
                className="w-full h-11 rounded-xl bg-[#065F46] hover:bg-[#047857] text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <span>Seat Party</span>
              </button>
            )}
          </div>
        </aside>

      </div>
    </AdminLayout>
  );
}
