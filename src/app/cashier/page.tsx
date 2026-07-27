'use client';

import React from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import CounterBillingPage from '@/app/admin/pos/page';

export default function CashierPage() {
  return (
    <AdminGuard>
      <CounterBillingPage />
    </AdminGuard>
  );
}
