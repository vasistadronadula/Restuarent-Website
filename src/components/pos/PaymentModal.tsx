'use client';

import React, { useState } from 'react';
import { PaymentMethod } from '@/types/pos';
import { useCartStore } from '@/store/usePosCartStore';
import {
  Banknote,
  CreditCard,
  QrCode,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
}

export default function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
}: PaymentModalProps) {
  const clearCart = useCartStore((s) => s.clearCart);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const guestCount = useCartStore((s) => s.guestCount);

  const [processingMethod, setProcessingMethod] = useState<PaymentMethod | null>(
    null
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const [successfulMethod, setSuccessfulMethod] = useState<PaymentMethod | null>(
    null
  );

  if (!isOpen) return null;

  const handleSelectPayment = (method: PaymentMethod) => {
    if (processingMethod || isSuccess) return;

    setProcessingMethod(method);

    // Simulate 1.5 second network delay
    setTimeout(() => {
      setProcessingMethod(null);
      setIsSuccess(true);
      setSuccessfulMethod(method);
      clearCart();

      // Close modal after 1 second
      setTimeout(() => {
        setIsSuccess(false);
        setSuccessfulMethod(null);
        onClose();
      }, 1000);
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-slate-50/50">
          <div>
            <h3
              id="payment-modal-title"
              className="text-lg font-bold text-[#0F172A]"
            >
              Select Payment Method
            </h3>
            <p className="text-xs text-[#475569] mt-0.5">
              {tableNumber} • {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
            </p>
          </div>
          {!isSuccess && (
            <button
              type="button"
              onClick={onClose}
              disabled={!!processingMethod}
              aria-label="Close payment modal"
              className="size-8 rounded-lg flex items-center justify-center text-[#475569] hover:bg-slate-200/60 hover:text-[#0F172A] disabled:opacity-30 transition-colors"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Success State */}
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-in zoom-in-95 duration-200">
              <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center text-[#16A34A] mb-4 ring-8 ring-emerald-50">
                <CheckCircle2 className="size-10 stroke-[2.5]" />
              </div>
              <h4 className="text-xl font-bold text-[#16A34A] mb-1">
                Payment Successful
              </h4>
              <p className="text-sm text-[#475569] max-w-xs">
                ${totalAmount.toFixed(2)} received via {successfulMethod}. Order is finalized and cart cleared.
              </p>
            </div>
          ) : (
            <div>
              {/* Total Display */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-4 mb-5 text-center">
                <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider block">
                  Amount Due
                </span>
                <span className="text-3xl font-extrabold text-[#0F172A] block mt-0.5">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>

              {/* 3 Payment Methods: Cash, Card, UPI */}
              <div className="space-y-3">
                {/* Cash Option */}
                <button
                  type="button"
                  onClick={() => handleSelectPayment('Cash')}
                  disabled={!!processingMethod}
                  className="w-full flex items-center justify-between p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50/30 transition-all font-semibold text-[#0F172A] disabled:opacity-60 disabled:cursor-not-allowed group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-emerald-50 text-[#16A34A] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Banknote className="size-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold">Cash</span>
                      <span className="block text-xs font-normal text-[#475569]">
                        Collect cash at billing counter
                      </span>
                    </div>
                  </div>

                  {processingMethod === 'Cash' ? (
                    <Loader2 className="size-5 animate-spin text-[#2563EB]" />
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-[#475569] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                      Pay Cash
                    </span>
                  )}
                </button>

                {/* Card Option */}
                <button
                  type="button"
                  onClick={() => handleSelectPayment('Card')}
                  disabled={!!processingMethod}
                  className="w-full flex items-center justify-between p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50/30 transition-all font-semibold text-[#0F172A] disabled:opacity-60 disabled:cursor-not-allowed group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CreditCard className="size-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold">Card</span>
                      <span className="block text-xs font-normal text-[#475569]">
                        Credit / Debit card POS swipe
                      </span>
                    </div>
                  </div>

                  {processingMethod === 'Card' ? (
                    <Loader2 className="size-5 animate-spin text-[#2563EB]" />
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-[#475569] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                      Swipe Card
                    </span>
                  )}
                </button>

                {/* UPI Option */}
                <button
                  type="button"
                  onClick={() => handleSelectPayment('UPI')}
                  disabled={!!processingMethod}
                  className="w-full flex items-center justify-between p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50/30 transition-all font-semibold text-[#0F172A] disabled:opacity-60 disabled:cursor-not-allowed group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <QrCode className="size-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold">UPI / QR</span>
                      <span className="block text-xs font-normal text-[#475569]">
                        Dynamic QR code scan & pay
                      </span>
                    </div>
                  </div>

                  {processingMethod === 'UPI' ? (
                    <Loader2 className="size-5 animate-spin text-[#2563EB]" />
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-[#475569] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                      Scan UPI
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
