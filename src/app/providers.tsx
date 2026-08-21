'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import { QueryProvider } from '@/components/providers/QueryProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
import { CartProvider } from '@/context/CartContext';
import MobileBottomNav from '@/components/customer/MobileBottomNav';
import CartMenuSync from '@/components/customer/CartMenuSync';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/store/useAuthStore';

const AuthModal = dynamic(() => import('@/components/customer/AuthModal'), { ssr: false });

function AuthModalHost() {
  const isOpen = useAuthStore((s) => s.isAuthModalOpen);
  const [mounted, setMounted] = useState(false);

  if (isOpen && !mounted) setMounted(true);

  return mounted ? <AuthModal /> : null;
}

function SessionScopedCart() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const authReady = useAuthStore((s) => s.authReady);

  useEffect(() => {
    if (!authReady) return;
    const key = 'ppr:cart-owner';
    try {
      const previous = window.localStorage.getItem(key);
      const current = userId ?? 'guest';
      if (previous && previous !== current) {
        import('@/store/useCartStore').then(({ useCartStore }) => {
          useCartStore.getState().clearCart();
        });
      }
      window.localStorage.setItem(key, current);
    } catch {
      // Storage disabled — cart not scoped
    }
  }, [userId, authReady]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <RealtimeProvider>
          <AdminProvider>
            <CartProvider>
              <TooltipProvider>
                <SessionScopedCart />
                <CartMenuSync />
                {children}
                <AuthModalHost />
                {/* No floating cart bar. The cart is reachable from the
                    navbar icon and the phone bottom nav, both of which show
                    a live count — a third persistent surface repeating the
                    same number cost a strip of every screen and covered the
                    footer. Adding to the cart is now acknowledged by the
                    dish flying to that icon (lib/flyToCart). */}
                <MobileBottomNav />
                <Toaster />
              </TooltipProvider>
            </CartProvider>
          </AdminProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
