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
import { Toaster } from 'react-hot-toast';

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
                <Toaster
                  position="bottom-right"
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
                    },
                    success: { iconTheme: { primary: '#2E7D32', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#C62828', secondary: '#fff' } },
                  }}
                />
              </CartProvider>
            </AdminProvider>
          </AuthProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
