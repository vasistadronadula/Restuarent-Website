'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme/theme';
import { store, persistor } from '@/store';
import { REALTIME_INIT, REALTIME_TEARDOWN } from '@/store/realtimeMiddleware';
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
import { CartProvider } from '@/context/CartContext';
import AuthModal from '@/components/customer/AuthModal';
import FloatingCartBar from '@/components/customer/FloatingCartBar';
import MobileBottomNav from '@/components/customer/MobileBottomNav';
import { Toaster } from 'react-hot-toast';
import useMediaQuery from '@mui/material/useMediaQuery';

// Initializes Supabase Realtime subscriptions via Redux middleware
function RealtimeInitializer() {
  useEffect(() => {
    store.dispatch({ type: REALTIME_INIT });
    return () => {
      store.dispatch({ type: REALTIME_TEARDOWN });
    };
  }, []);
  return null;
}

/**
 * Toasts sit bottom-right on desktop, top-right on phones — where the thumb
 * isn't covering them and they don't collide with the fixed bottom nav.
 * noSsr defers the match to the client so the server doesn't render one
 * position and hydrate into the other.
 */
function ResponsiveToaster() {
  const isMobile = useMediaQuery('(max-width:899px)', { noSsr: true });
  return (
    <Toaster
      position={isMobile ? 'top-right' : 'bottom-right'}
      containerStyle={
        isMobile
          ? { top: 'calc(70px + env(safe-area-inset-top, 0px))', right: 12, left: 12 }
          : { bottom: 24, right: 24 }
      }
      toastOptions={{
        duration: 3000,
        style: {
          background: '#fff',
          color: '#212121',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 500,
          fontSize: '14px',
          maxWidth: '100%',
        },
        success: { iconTheme: { primary: '#15803D', secondary: '#fff' } },
        error: { iconTheme: { primary: '#C62828', secondary: '#fff' } },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {/* AuthProvider is a thin Supabase bridge — dispatches to Redux authSlice */}
          <AuthProvider>
            {/* AdminProvider is an RTK Query adapter that provides useAdmin() backward compat */}
            <AdminProvider>
              <CartProvider>
                <RealtimeInitializer />
                {children}
                <AuthModal />
                <FloatingCartBar />
                <MobileBottomNav />
                <ResponsiveToaster />
              </CartProvider>
            </AdminProvider>
          </AuthProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
