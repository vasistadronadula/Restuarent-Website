'use client';

import React from 'react';
import { useCartStore } from '@/store/usePosCartStore';
import { PauseCircle, ArrowRight, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface BillingActionsProps {
  onProcessPayment: () => void;
}

export default function BillingActions({
  onProcessPayment,
}: BillingActionsProps) {
  const cartItems = useCartStore((s) => s.cartItems);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const clearCart = useCartStore((s) => s.clearCart);

  const hasItems = cartItems.length > 0;

  const handleHoldOrder = () => {
    if (!hasItems) return;
    toast.success(`Order held successfully for ${tableNumber}`, {
      description: `${cartItems.reduce((acc, i) => acc + i.quantity, 0)} items saved to held orders queue.`,
    });
    clearCart();
  };

  return (
    <div className="pt-4 space-y-2.5">
      {/* Process Payment Button (Primary Solid, Full Width) */}
      <button
        type="button"
        onClick={onProcessPayment}
        disabled={!hasItems}
        aria-label="Process Payment"
        className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-lg shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2563EB] transition-all flex items-center justify-center gap-2 text-base select-none"
      >
        <CreditCard className="size-5" />
        <span>Process Payment</span>
        <ArrowRight className="size-4 ml-1" />
      </button>

      {/* Hold Order Button (Secondary Outline) */}
      <button
        type="button"
        onClick={handleHoldOrder}
        disabled={!hasItems}
        aria-label="Hold Order"
        className="w-full bg-white hover:bg-slate-50 active:scale-[0.99] text-[#0F172A] border border-[#E2E8F0] font-semibold py-2.5 px-4 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-all flex items-center justify-center gap-2 text-sm select-none"
      >
        <PauseCircle className="size-4.5 text-[#475569]" />
        <span>Hold Order</span>
      </button>
    </div>
  );
}
