'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AutoOrderPrinter from './AutoOrderPrinter';
import ServiceWorkerRegister from './ServiceWorkerRegister';
import RoleManifestLink from './RoleManifestLink';
import { useAdmin } from '@/context/AdminContext';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  title: string;
  hideSidebar?: boolean;
}

export default function AdminLayout({ children, title, hideSidebar = false }: Props) {
  const pathname = usePathname();
  const clearNotification = useAdminStore((s) => s.clearNotification);
  const { notification } = useAdmin();

  const isPosPage = pathname === '/admin/pos' || pathname === '/cashier';

  React.useEffect(() => {
    if (notification) {
      if (notification.type === 'error') {
        toast.error(notification.message);
      } else {
        toast.success(notification.message);
      }
      clearNotification();
    }
  }, [notification, clearNotification]);

  if (isPosPage || hideSidebar) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F8FAFC] w-full text-slate-900 font-sans antialiased">
        <main className="flex-1 w-full h-screen overflow-hidden p-0">
          {children}
        </main>
        <AutoOrderPrinter />
        <ServiceWorkerRegister />
        <RoleManifestLink />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] w-full text-slate-900 font-sans antialiased">
      {/* Persistent RestoFlow Left Navigation */}
      <AdminSidebar />

      {/* Main Page Content */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-[1600px]">
          {children}
        </main>
      </div>

      <AutoOrderPrinter />
      <ServiceWorkerRegister />
      <RoleManifestLink />
    </div>
  );
}
