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

      <main className={`flex-1 p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto box-border overflow-x-hidden ${isPosPage ? 'pb-4' : 'pb-10'}`}>
        {children}
      </main>

      <AutoOrderPrinter />
      <ServiceWorkerRegister />
      <RoleManifestLink />
    </div>
  );
}
