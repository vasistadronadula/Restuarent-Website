'use client';

import React from 'react';
import AdminGuard from '@/components/admin/AdminGuard';
import POSClientWrapper from '@/components/pos/POSClientWrapper';
import { menuItems as fallbackMenuItems } from '@/data/menuData';

export default function CashierPage() {
  return (
    <AdminGuard>
      <POSClientWrapper initialMenuItems={fallbackMenuItems} />
    </AdminGuard>
  );
}
