'use client';

import React from 'react';
import { useCartStore } from '@/store/usePosCartStore';
import { Percent } from 'lucide-react';

const TAX_RATE = 0.08; // 8% fixed tax rate

export default function BillingSummary() {
  const cartItems = useCartStore((s) => s.cartItems);
  const discount = useCartStore((s) => s.discount);
  const setDiscount = useCartStore((s) => s.setDiscount);

  // Calculations
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * TAX_RATE;
  const total = taxableAmount + taxAmount;

  return (
    <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
      {/* Subtotal */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#475569]">Subtotal</span>
        <span className="font-semibold text-[#0F172A]">
          ${subtotal.toFixed(2)}
        </span>
      </div>

      {/* Discount Input (Percentage) */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-[#475569]">
          <span>Discount</span>
          <div className="flex items-center gap-1">
            {[0, 5, 10, 15].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setDiscount(pct)}
                className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                  discount === pct
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-slate-50 text-[#475569] border-[#E2E8F0] hover:bg-slate-100'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative w-20">
            <input
              type="number"
              min="0"
              max="100"
              value={discount === 0 ? '' : discount}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setDiscount(isNaN(val) ? 0 : val);
              }}
              placeholder="0"
              aria-label="Discount percentage"
              className="w-full text-right pr-6 pl-2 py-1 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            <Percent className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-[#475569] pointer-events-none" />
          </div>
          {discount > 0 && (
            <span className="text-xs font-semibold text-[#16A34A] min-w-14 text-right">
              -${discountAmount.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Fixed Tax (8%) */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#475569]">Tax (8% Fixed)</span>
        <span className="font-semibold text-[#0F172A]">
          ${taxAmount.toFixed(2)}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-[#E2E8F0] my-2" />

      {/* Grand Total */}
      <div className="flex items-center justify-between pt-0.5">
        <div>
          <span className="text-base font-bold text-[#0F172A]">Total</span>
          <span className="block text-[11px] text-[#475569]">
            Includes all applicable taxes
          </span>
        </div>
        <span className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
          ${total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
