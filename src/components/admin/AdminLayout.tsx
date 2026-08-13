'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AutoOrderPrinter from './AutoOrderPrinter';
import ServiceWorkerRegister from './ServiceWorkerRegister';
import RoleManifestLink from './RoleManifestLink';
import { useAdmin } from '@/context/AdminContext';
import { useAdminStore } from '@/store/useAdminStore';
import { PosSidebarProvider } from '@/context/PosSidebarContext';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  title: string;
}

/**
 * The console shell: dark rail on the left, sticky header, page body.
 *
 * POS and KDS opt out of the body's padding and scroll — both are fixed-height
 * surfaces that manage their own internal scrolling, and a page-level scrollbar
 * behind them makes the ticket rails jump.
 */
export default function AdminLayout({ children, title }: Props) {
  const pathname = usePathname();
  const clearNotification = useAdminStore((s) => s.clearNotification);
  const { notification } = useAdmin();
  const [navOpen, setNavOpen] = useState(false);

  const isPosPage = pathname === '/admin/pos' || pathname === '/cashier';
  const isKitchenPage = pathname === '/admin/kitchen' || pathname === '/kds';
  const isFullBleed = isPosPage || isKitchenPage;

  useEffect(() => {
    if (notification) {
      if (notification.type === 'error') {
        toast.error(notification.message);
      } else {
        toast.success(notification.message);
      }
      clearNotification();
    }
  }, [notification, clearNotification]);

  // Marks the document so portalled overlays (dialogs, dropdowns, toasts) —
  // which render outside `.ad-shell` — pick up the same square, ruled styling.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.adTheme = 'modernist';
    return () => { delete root.dataset.adTheme; };
  }, []);

  // The drawer closes itself on navigation: every link inside it calls onClose,
  // and while it is open it covers the only other way to leave the page.

  return (
    <PosSidebarProvider>
      <div className="ad-shell flex min-h-screen w-full">
        <AdminSidebar open={navOpen} onClose={() => setNavOpen(false)} wide={isFullBleed} posMode={isPosPage} />

        <div className="flex-1 min-w-0 flex flex-col">
          <AdminHeader title={title} onOpenNav={() => setNavOpen(true)} wideNav={isFullBleed} />

          <main
            className={
              isPosPage
                ? 'flex-1 w-full h-[calc(100vh-var(--ad-header-h))] overflow-hidden'
                : isKitchenPage
                ? 'flex-1 w-full min-h-[calc(100vh-var(--ad-header-h))]'
                : 'flex-1 w-full box-border overflow-x-hidden px-4 sm:px-6 py-6'
            }
          >
            {isFullBleed ? children : <div className="max-w-[1600px] mx-auto w-full">{children}</div>}
          </main>
        </div>

        <AutoOrderPrinter />
        <ServiceWorkerRegister />
        <RoleManifestLink />
      </div>
    </PosSidebarProvider>
  );
}
