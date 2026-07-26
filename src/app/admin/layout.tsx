'use client';

import React from 'react';
import AdminGuard from '@/components/admin/AdminGuard';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
