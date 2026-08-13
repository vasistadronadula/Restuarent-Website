'use client';

import React, { useState } from 'react';
import { PaymentMethod } from '@/types/pos';
import { useCartStore } from '@/store/usePosCartStore';
import { useCreateOrder } from '@/lib/queries/orders';
import { computeBillTotals } from '@/lib/billing';
import { generateOrderId } from '@/lib/idGenerator';
import { triggerNewOrderPush, triggerWhatsAppOrderConfirmation } from '@/lib/triggerPush';
import { toast } from 'sonner';
import {
  Banknote,
  CreditCard,
  QrCode,
  Loader2,
  CheckCircle2,
  X,
  Printer,
  Receipt,
  Smartphone,
} from 'lucide-react';
import { Order, OrderItem } from '@/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
}

export default function PaymentModal({
  isOpen,
  onClose,
  subtotal,
}: PaymentModalProps) {
  const createOrderMutation = useCreateOrder();

  const cartItems = useCartStore((s) => s.cartItems);
  const discount = useCartStore((s) => s.discount);
  const clearCart = useCartStore((s) => s.clearCart);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const guestCount = useCartStore((s) => s.guestCount);
  const orderType = useCartStore((s) => s.orderType);
  const customerName = useCartStore((s) => s.customerName);
  const customerPhone = useCartStore((s) => s.customerPhone);
  const specialInstructions = useCartStore((s) => s.specialInstructions);

  const [processingMethod, setProcessingMethod] = useState<PaymentMethod | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const totals = computeBillTotals(subtotal, discount);

  // Extract table number integer if "Table X"
  const tableNumParsed =
    orderType === 'dine-in'
      ? parseInt(tableNumber.replace(/[^0-9]/g, ''), 10) || 1
      : undefined;

  const handleSelectPayment = async (method: PaymentMethod) => {
    if (processingMethod || isSuccess || cartItems.length === 0) return;

    setProcessingMethod(method);

    try {
      const orderId = generateOrderId();
      const paymentModeMapped =
        method === 'Cash' ? 'cash' : method === 'Card' ? 'card' : 'upi';

      const orderItems: OrderItem[] = cartItems.map((item) => ({
        menuItemId: item.id,
        name: `${item.name}${
          item.selectedPortion && item.selectedPortion !== 'full'
            ? ` (${item.selectedPortion})`
            : ''
        }`,
        price: item.selectedPrice ?? item.price,
        quantity: item.quantity,
        vegStatus: item.vegStatus || 'non-veg',
        selectedPortion: item.selectedPortion,
      }));

      const newOrderPayload: Partial<Order> = {
        id: orderId,
        orderId,
        customerName: customerName.trim() || `Dine-in (${tableNumber})`,
        customerPhone: customerPhone.trim() || '',
        customerAddress:
          orderType === 'dine-in'
            ? `Table ${tableNumParsed || tableNumber} — Restaurant Floor`
            : 'Takeaway Counter',
        items: orderItems,
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        discount: totals.discountAmount,
        deliveryCharge: 0,
        grandTotal: totals.grandTotal,
        status: 'preparing',
        orderStatus: 'preparing',
        paymentMode: paymentModeMapped,
        paymentStatus: 'paid',
        orderType: orderType,
        tableNumber: tableNumParsed,
        notes: specialInstructions || undefined,
        orderSource: 'direct',
      };

      // 1. Insert into Supabase database in real time
      const savedOrder = await createOrderMutation.mutateAsync(newOrderPayload);
      setCreatedOrder(savedOrder);
      setIsSuccess(true);

      // 2. Trigger real-time push to kitchen
      try {
        await triggerNewOrderPush(savedOrder.id);
      } catch (err) {
        console.warn('Push notification skipped:', err);
      }

      // 3. Trigger WhatsApp confirmation if phone was provided
      if (customerPhone.trim()) {
        try {
          await triggerWhatsAppOrderConfirmation(savedOrder.id);
        } catch (err) {
          console.warn('WhatsApp notification skipped:', err);
        }
      }

      toast.success(`Order ${savedOrder.id} placed & synced to Kitchen!`);
      clearCart();
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setProcessingMethod(null);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleFinishAndClose = () => {
    setIsSuccess(false);
    setCreatedOrder(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-slate-50/70">
          <div>
            <h3
              id="payment-modal-title"
              className="text-base font-bold text-[#0F172A]"
            >
              {isSuccess ? 'Order Placed & Paid' : 'Settle Bill & Place Order'}
            </h3>
            <p className="text-xs text-[#475569] mt-0.5">
              {tableNumber} • {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'} • {orderType.toUpperCase()}
            </p>
          </div>
          {!processingMethod && (
            <button
              type="button"
              onClick={isSuccess ? handleFinishAndClose : onClose}
              aria-label="Close payment modal"
              className="size-8 rounded-lg flex items-center justify-center text-[#475569] hover:bg-slate-200/60 hover:text-[#0F172A] transition-colors"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Success State */}
          {isSuccess && createdOrder ? (
            <div className="flex flex-col items-center justify-center py-4 text-center animate-in zoom-in-95 duration-200">
              <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center text-[#16A34A] mb-3 ring-8 ring-emerald-50">
                <CheckCircle2 className="size-10 stroke-[2.5]" />
              </div>
              <h4 className="text-xl font-bold text-[#0F172A] mb-1">
                Payment Successful!
              </h4>
              <span className="inline-block px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-mono font-bold mb-2">
                {createdOrder.id}
              </span>
              <p className="text-xs text-[#475569] max-w-xs mb-5">
                Amount ₹{totals.grandTotal} recorded in database and sent directly to the Kitchen KDS terminal.
              </p>

              <div className="w-full flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#E2E8F0] font-semibold text-xs text-[#0F172A] hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="size-4 text-[#475569]" />
                  Print Bill
                </button>
                <button
                  type="button"
                  onClick={handleFinishAndClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] font-bold text-xs text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  Done (Next Bill)
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Grand Total Callout */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 mb-4 text-center">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block">
                  Total Payable Amount
                </span>
                <span className="text-3xl font-extrabold text-[#0F172A] block mt-0.5">
                  ₹{totals.grandTotal}
                </span>
                <span className="text-[11px] text-[#475569] block mt-1">
                  Subtotal: ₹{totals.subtotal} • GST 5%: ₹{(totals.cgst + totals.sgst).toFixed(2)}
                  {totals.discountAmount > 0 && ` • Disc: -₹${totals.discountAmount}`}
                </span>
              </div>

              {/* Real Database Payment Method Actions */}
              <div className="space-y-2.5">
                {/* Cash Option */}
                <button
                  type="button"
                  onClick={() => handleSelectPayment('Cash')}
                  disabled={!!processingMethod}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50/30 transition-all font-semibold text-[#0F172A] disabled:opacity-50 disabled:cursor-not-allowed group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-emerald-50 text-[#16A34A] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Banknote className="size-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold">Cash</span>
                      <span className="block text-[11px] font-normal text-[#475569]">
                        Collect cash directly at register
                      </span>
                    </div>
                  </div>

                  {processingMethod === 'Cash' ? (
                    <Loader2 className="size-5 animate-spin text-[#2563EB]" />
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-[#475569] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                      Collect Cash
                    </span>
                  )}
                </button>

                {/* Card Option */}
                <button
                  type="button"
                  onClick={() => handleSelectPayment('Card')}
                  disabled={!!processingMethod}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50/30 transition-all font-semibold text-[#0F172A] disabled:opacity-50 disabled:cursor-not-allowed group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CreditCard className="size-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold">Card (EDC / Swipe)</span>
                      <span className="block text-[11px] font-normal text-[#475569]">
                        Swipe/Dip credit or debit card
                      </span>
                    </div>
                  </div>

                  {processingMethod === 'Card' ? (
                    <Loader2 className="size-5 animate-spin text-[#2563EB]" />
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-[#475569] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                      Swipe Card
                    </span>
                  )}
                </button>

                {/* UPI QR Option */}
                <button
                  type="button"
                  onClick={() => handleSelectPayment('UPI')}
                  disabled={!!processingMethod}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-blue-50/30 transition-all font-semibold text-[#0F172A] disabled:opacity-50 disabled:cursor-not-allowed group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <QrCode className="size-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-bold">UPI / QR Scan</span>
                      <span className="block text-[11px] font-normal text-[#475569]">
                        PayTM / PhonePe / GPay QR scan
                      </span>
                    </div>
                  </div>

                  {processingMethod === 'UPI' ? (
                    <Loader2 className="size-5 animate-spin text-[#2563EB]" />
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-[#475569] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
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
