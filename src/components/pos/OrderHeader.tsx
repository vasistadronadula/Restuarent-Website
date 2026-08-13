'use client';

import React from 'react';
import { useCartStore } from '@/store/usePosCartStore';
import { useTables } from '@/lib/queries/tables';
import { Users, ChevronDown, Plus, Minus, Phone, User, Utensils, ShoppingBag } from 'lucide-react';
import { OrderType } from '@/types';

export default function OrderHeader() {
  const { data: dbTables = [] } = useTables();

  const tableNumber = useCartStore((s) => s.tableNumber);
  const setTableNumber = useCartStore((s) => s.setTableNumber);
  const guestCount = useCartStore((s) => s.guestCount);
  const setGuestCount = useCartStore((s) => s.setGuestCount);
  const orderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const customerName = useCartStore((s) => s.customerName);
  const setCustomerName = useCartStore((s) => s.setCustomerName);
  const customerPhone = useCartStore((s) => s.customerPhone);
  const setCustomerPhone = useCartStore((s) => s.setCustomerPhone);

  const activeTables = dbTables.filter((t) => t.isActive);

  return (
    <div className="pb-3.5 border-b border-[#E2E8F0] space-y-3">
      {/* Top row: Order Type Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#0F172A] tracking-tight">
          Order Details
        </h2>

        {/* Order Type Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setOrderType('dine-in')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
              orderType === 'dine-in'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            <Utensils className="size-3" />
            Dine-In
          </button>
          <button
            type="button"
            onClick={() => setOrderType('takeaway')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
              orderType === 'takeaway'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-[#475569] hover:text-[#0F172A]'
            }`}
          >
            <ShoppingBag className="size-3" />
            Takeaway
          </button>
        </div>
      </div>

      {/* Grid: Table Number & Guest Count */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Table Selector from Database */}
        <div>
          <label
            htmlFor="table-number-select"
            className="block text-[11px] font-semibold text-[#475569] mb-1 uppercase tracking-wider"
          >
            {orderType === 'dine-in' ? 'Table No.' : 'Pickup Token'}
          </label>
          <div className="relative">
            <select
              id="table-number-select"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all cursor-pointer pr-7"
            >
              {orderType === 'dine-in' ? (
                activeTables.length > 0 ? (
                  activeTables.map((tbl) => (
                    <option key={tbl.id} value={`Table ${tbl.tableNumber}`}>
                      Table {tbl.tableNumber} (Cap: {tbl.capacity})
                    </option>
                  ))
                ) : (
                  Array.from({ length: 16 }, (_, i) => (
                    <option key={i + 1} value={`Table ${i + 1}`}>
                      Table {i + 1}
                    </option>
                  ))
                )
              ) : (
                <>
                  <option value="Takeaway 1">Takeaway Counter 1</option>
                  <option value="Takeaway 2">Takeaway Counter 2</option>
                  <option value="Online / Direct">Direct Parcel</option>
                </>
              )}
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-[#475569] pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Guest Count Stepper */}
        <div>
          <label
            htmlFor="guest-count-input"
            className="block text-[11px] font-semibold text-[#475569] mb-1 uppercase tracking-wider"
          >
            Covers / Guests
          </label>
          <div className="flex items-center bg-slate-50 border border-[#E2E8F0] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#2563EB] focus-within:bg-white focus-within:border-transparent transition-all">
            <button
              type="button"
              onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
              disabled={guestCount <= 1}
              aria-label="Decrease guest count"
              className="px-2 py-1.5 text-[#475569] hover:bg-slate-200/60 hover:text-[#0F172A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="size-3 stroke-[2.5]" />
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
              className="w-full text-center py-1 text-xs font-bold text-[#0F172A] bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setGuestCount(guestCount + 1)}
              aria-label="Increase guest count"
              className="px-2 py-1.5 text-[#475569] hover:bg-slate-200/60 hover:text-[#0F172A] transition-colors"
            >
              <Plus className="size-3 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Customer Name & Phone (Optional, for SMS/WhatsApp receipts) */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        <div className="relative">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-[#475569]" />
          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-[#475569]" />
          <input
            type="tel"
            placeholder="Phone (WhatsApp)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>
      </div>
    </div>
  );
}
