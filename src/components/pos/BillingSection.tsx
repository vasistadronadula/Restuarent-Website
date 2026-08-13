'use client';

import React, { useState } from 'react';
import { useCartStore } from '@/store/usePosCartStore';
import OrderHeader from './OrderHeader';
import CartList from './CartList';
import BillingSummary from './BillingSummary';
import BillingActions from './BillingActions';
import PaymentModal from './PaymentModal';

export default function BillingSection() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const cartItems = useCartStore((s) => s.cartItems);

  // Compute live subtotal
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.selectedPrice ?? item.price) * item.quantity,
    0
  );

  return (
    <aside
      aria-label="Cart and Billing Summary"
      className="w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-md p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 md:sticky md:top-3 h-fit max-h-[calc(100vh-1.5rem)] overflow-y-auto"
    >
      <div className="space-y-2.5">
        {/* Table & Guest selection & Order Type */}
        <OrderHeader />

        {/* Scrollable Cart Items */}
        <CartList />
      </div>

      <div className="mt-3">
        {/* Financial calculations */}
        <BillingSummary />

        {/* Order Actions: Hold & Process Payment */}
        <BillingActions
          onProcessPayment={() => setIsPaymentModalOpen(true)}
        />
      </div>

      {/* Realtime Supabase Payment Processing Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        subtotal={subtotal}
      />
    </aside>
  );
}
