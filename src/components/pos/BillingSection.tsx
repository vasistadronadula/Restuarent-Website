'use client';

import React, { useState } from 'react';
import { useCartStore } from '@/store/usePosCartStore';
import OrderHeader from './OrderHeader';
import CartList from './CartList';
import BillingSummary from './BillingSummary';
import BillingActions from './BillingActions';
import PaymentModal from './PaymentModal';

const TAX_RATE = 0.08;

export default function BillingSection() {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const cartItems = useCartStore((s) => s.cartItems);
  const discount = useCartStore((s) => s.discount);

  // Compute grand total for payment modal
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const total = taxableAmount + taxableAmount * TAX_RATE;

  return (
    <aside
      aria-label="Cart and Billing Summary"
      className="w-full bg-white border border-[#E2E8F0] rounded-xl shadow-md p-5 flex flex-col justify-between transition-all duration-200 md:sticky md:top-4 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto"
    >
      <div className="space-y-3">
        {/* Table & Guest selection */}
        <OrderHeader />

        {/* Scrollable Cart Items */}
        <CartList />
      </div>

      <div className="mt-4">
        {/* Financial calculations */}
        <BillingSummary />

        {/* Order Actions: Hold & Process Payment */}
        <BillingActions
          onProcessPayment={() => setIsPaymentModalOpen(true)}
        />
      </div>

      {/* Payment Processing Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={total}
      />
    </aside>
  );
}
