'use client';

import React from 'react';
// Loaded once for the whole /admin tree. It is scoped to `.ad-shell` and
// `[data-ad-theme]` internally, so nothing here reaches the customer site
// even though Next hoists it into the shared stylesheet.
import './admin-theme.css';
import AdminGuard from '@/components/admin/AdminGuard';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
