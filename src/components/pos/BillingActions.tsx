'use client';

import React, { useState } from 'react';
import { useCartStore } from '@/store/usePosCartStore';
import { PauseCircle, ArrowRight, CreditCard, History, X } from 'lucide-react';
import { toast } from 'sonner';

interface BillingActionsProps {
  onProcessPayment: () => void;
}

export default function BillingActions({
  onProcessPayment,
}: BillingActionsProps) {
  const cartItems = useCartStore((s) => s.cartItems);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const holdCurrentOrder = useCartStore((s) => s.holdCurrentOrder);
  const heldOrders = useCartStore((s) => s.heldOrders);
  const resumeHeldOrder = useCartStore((s) => s.resumeHeldOrder);
  const removeHeldOrder = useCartStore((s) => s.removeHeldOrder);

  const [showHeldModal, setShowHeldModal] = useState(false);

  const hasItems = cartItems.length > 0;

  const handleHoldOrder = () => {
    if (!hasItems) return;
    const held = holdCurrentOrder();
    if (held) {
      toast.success(`Order ${held.id} held for ${tableNumber}!`, {
        description: `${held.cartItems.length} lines saved. You can resume it anytime.`,
      });
    }
  };

  return (
    <div className="pt-3 space-y-2">
      {/* Process Payment Button (Primary Solid, Full Width) */}
      <button
        type="button"
        onClick={onProcessPayment}
        disabled={!hasItems}
        aria-label="Process Payment"
        className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2563EB] transition-all flex items-center justify-center gap-2 text-sm select-none"
      >
        <CreditCard className="size-4.5" />
        <span>Process Payment & Place Order</span>
        <ArrowRight className="size-4 ml-1" />
      </button>

      {/* Secondary Row: Hold Order & Held Orders Queue Badge */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleHoldOrder}
          disabled={!hasItems}
          aria-label="Hold Order"
          className="w-full bg-white hover:bg-slate-50 active:scale-[0.99] text-[#0F172A] border border-[#E2E8F0] font-semibold py-2 px-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 text-xs select-none shadow-2xs"
        >
          <PauseCircle className="size-3.5 text-[#475569]" />
          <span>Hold Order</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHeldModal(true)}
          disabled={heldOrders.length === 0}
          className="w-full bg-slate-50 hover:bg-slate-100 active:scale-[0.99] text-[#0F172A] border border-[#E2E8F0] font-semibold py-2 px-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 text-xs select-none shadow-2xs"
        >
          <History className="size-3.5 text-[#2563EB]" />
          <span>Held ({heldOrders.length})</span>
        </button>
      </div>

      {/* Held Orders Modal */}
      {showHeldModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h4 className="font-bold text-sm text-[#0F172A]">
                Held Orders Queue ({heldOrders.length})
              </h4>
              <button
                type="button"
                onClick={() => setShowHeldModal(false)}
                className="size-7 rounded-md flex items-center justify-center text-[#475569] hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-3 max-h-60 overflow-y-auto divide-y divide-[#E2E8F0]">
              {heldOrders.map((held) => (
                <div key={held.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#0F172A] block">
                      {held.tableNumber} • {held.id}
                    </span>
                    <span className="text-[11px] text-[#475569] block">
                      {held.cartItems.length} items • ₹{held.total.toFixed(0)} • {held.heldAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        resumeHeldOrder(held.id);
                        setShowHeldModal(false);
                        toast.success(`Resumed order ${held.id}`);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-[#2563EB] text-white rounded-md hover:bg-[#1D4ED8]"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHeldOrder(held.id)}
                      className="p-1 text-xs text-[#DC2626] hover:bg-rose-50 rounded-md"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
