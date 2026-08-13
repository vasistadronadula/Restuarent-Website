'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AdminHeader from './AdminHeader';
import AutoOrderPrinter from './AutoOrderPrinter';
import ServiceWorkerRegister from './ServiceWorkerRegister';
import RoleManifestLink from './RoleManifestLink';
import { useAdmin } from '@/context/AdminContext';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: Props) {
  const pathname = usePathname();
  const clearNotification = useAdminStore((s) => s.clearNotification);
  const { notification } = useAdmin();

  const isPosPage = pathname === '/admin/pos' || pathname === '/cashier';
  const isKitchenPage = pathname === '/admin/kitchen' || pathname === '/kds';

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

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF9] dark:bg-[#0A0A0A] w-full text-stone-900 dark:text-stone-100 antialiased">
      <AdminHeader title={title} />

      <main
        className={
          isPosPage
            ? 'flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden p-0'
            : isKitchenPage
            ? 'flex-1 w-full min-h-[calc(100vh-3.5rem)] p-0'
            : 'flex-1 w-full max-w-[1600px] mx-auto box-border overflow-x-hidden px-3 sm:px-5 lg:px-8 pt-4 sm:pt-5 pb-10'
        }
      >
        {children}
      </main>

      <AutoOrderPrinter />
      <ServiceWorkerRegister />
      <RoleManifestLink />
    </div>
  );
}
