'use client';

import React from 'react';
// /cashier renders the POS outside the /admin segment, so it has to pull the
// console's stylesheet in itself — the admin layout never runs for this route.
import '@/app/admin/admin-theme.css';
import AdminGuard from '@/components/admin/AdminGuard';
import CounterBillingPage from '@/app/admin/pos/page';

export default function CashierPage() {
  return (
    <AdminGuard>
      <CounterBillingPage />
    </AdminGuard>
  );
}
