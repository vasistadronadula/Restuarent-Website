'use client';

import React from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import POSClientWrapper from '@/components/pos/POSClientWrapper';
import { initialMenuItems } from '@/data/posMenuData';

export default function CashierPage() {
  return (
    <AdminGuard>
      <POSClientWrapper initialMenuItems={initialMenuItems} />
    </AdminGuard>
  );
}
