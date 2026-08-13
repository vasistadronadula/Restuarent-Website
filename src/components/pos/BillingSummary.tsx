'use client';

import React from 'react';
import { useCartStore } from '@/store/usePosCartStore';
import { Percent } from 'lucide-react';

export default function BillingSummary() {
  const cartItems = useCartStore((s) => s.cartItems);
  const discount = useCartStore((s) => s.discount);
  const setDiscount = useCartStore((s) => s.setDiscount);

  // Subtotal in ₹
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.selectedPrice ?? item.price) * item.quantity,
    0
  );

  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // Standard Indian Restaurant GST: 5% (2.5% CGST + 2.5% SGST)
  const cgst = taxableAmount * 0.025;
  const sgst = taxableAmount * 0.025;
  const totalTax = cgst + sgst;
  const grandTotal = Math.round(taxableAmount + totalTax);

  return (
    <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
      {/* Subtotal */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#475569]">Item Total</span>
        <span className="font-semibold text-[#0F172A]">
          ₹{subtotal.toFixed(2)}
        </span>
      </div>

      {/* Discount Input */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 text-[#475569]">
          <span>Discount</span>
          <div className="flex items-center gap-1">
            {[0, 5, 10, 15].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setDiscount(pct)}
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border transition-colors ${
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

        <div className="flex items-center gap-1">
          <div className="relative w-16">
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
              className="w-full text-right pr-5 pl-1.5 py-0.5 bg-slate-50 border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#0F172A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
            <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 size-2.5 text-[#475569] pointer-events-none" />
          </div>
          {discount > 0 && (
            <span className="text-xs font-semibold text-[#16A34A] min-w-12 text-right">
              -₹{discountAmount.toFixed(0)}
            </span>
          )}
        </div>
      </div>

      {/* Taxes (GST 5%: CGST 2.5% + SGST 2.5%) */}
      <div className="flex items-center justify-between text-xs text-[#475569]">
        <span>GST (CGST 2.5% + SGST 2.5%)</span>
        <span className="font-medium text-[#0F172A]">
          ₹{totalTax.toFixed(2)}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-[#E2E8F0] my-1.5" />

      {/* Grand Total */}
      <div className="flex items-center justify-between pt-0.5">
        <div>
          <span className="text-sm font-bold text-[#0F172A]">Grand Total</span>
          <span className="block text-[10px] text-[#475569]">
            Net Payable (Inc. all taxes)
          </span>
        </div>
        <span className="text-xl font-extrabold text-[#0F172A] tracking-tight">
          ₹{grandTotal}
        </span>
      </div>
    </div>
  );
}
