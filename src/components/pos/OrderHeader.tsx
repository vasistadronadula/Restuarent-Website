'use client';

import React from 'react';
import { useCartStore } from '@/store/usePosCartStore';
import { Users, UtensilsCrossed, ChevronDown, Plus, Minus } from 'lucide-react';

const TABLE_OPTIONS = [
  'Table 1',
  'Table 2',
  'Table 3',
  'Table 4',
  'Table 5',
  'Table 6',
  'Table 7',
  'Table 8',
  'Table 9',
  'Table 10',
  'Table 11',
  'Table 12',
  'VIP Lounge 1',
  'VIP Lounge 2',
  'Takeaway 1',
  'Takeaway 2',
];

export default function OrderHeader() {
  const tableNumber = useCartStore((s) => s.tableNumber);
  const setTableNumber = useCartStore((s) => s.setTableNumber);
  const guestCount = useCartStore((s) => s.guestCount);
  const setGuestCount = useCartStore((s) => s.setGuestCount);

  return (
    <div className="pb-4 border-b border-[#E2E8F0]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">
          Current Order
        </h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-100">
          Dine-in / Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Table Number Selector (Dropdown) */}
        <div>
          <label
            htmlFor="table-number-select"
            className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wider"
          >
            Table No.
          </label>
          <div className="relative">
            <select
              id="table-number-select"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm font-semibold text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all cursor-pointer pr-8 shadow-xs"
            >
              {TABLE_OPTIONS.map((tbl) => (
                <option key={tbl} value={tbl}>
                  {tbl}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-[#475569] pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Guest Count (Numeric Input) */}
        <div>
          <label
            htmlFor="guest-count-input"
            className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wider"
          >
            Guests
          </label>
          <div className="flex items-center bg-slate-50 border border-[#E2E8F0] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#2563EB] focus-within:bg-white focus-within:border-transparent transition-all shadow-xs">
            <button
              type="button"
              onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
              disabled={guestCount <= 1}
              aria-label="Decrease guest count"
              className="px-2.5 py-2 text-[#475569] hover:bg-slate-200/60 hover:text-[#0F172A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="size-3.5 stroke-[2.5]" />
            </button>
            <input
              id="guest-count-input"
              type="number"
              min="1"
              max="99"
              value={guestCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setGuestCount(isNaN(val) ? 1 : val);
              }}
              className="w-full text-center py-2 text-sm font-semibold text-[#0F172A] bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setGuestCount(guestCount + 1)}
              aria-label="Increase guest count"
              className="px-2.5 py-2 text-[#475569] hover:bg-slate-200/60 hover:text-[#0F172A] transition-colors"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
