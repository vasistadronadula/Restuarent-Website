'use client';
import React, { useState, ReactNode } from 'react';
import { Drawer, Snackbar, Alert, useMediaQuery, useTheme } from '@mui/material';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminGuard from './AdminGuard';
import AdminMobileBottomNav from './AdminMobileBottomNav';
import AutoOrderPrinter from './AutoOrderPrinter';
import ServiceWorkerRegister from './ServiceWorkerRegister';
import { useAdmin } from '@/context/AdminContext';

const SIDEBAR_WIDTH = 260;
const COLLAPSED_WIDTH = 68;

interface Props {
  children: ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: Props) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { notification } = useAdmin();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const currentWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#FFF8F2' }}>

        {/* Mobile Drawer */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            // Explicit z-index (above the mobile bottom nav's 1250 and the
            // sticky header's 1100) so the drawer + its backdrop always sit
            // on top, regardless of DOM/portal mount order.
            sx={{ zIndex: 1310 }}
            slotProps={{
              paper: {
                sx: {
                  width: SIDEBAR_WIDTH,
                  maxWidth: '85vw',
                  background: '#FFFFFF',
                  border: 'none',
                  boxShadow: '8px 0 40px rgba(0,0,0,0.15)',
                  zIndex: 1310,
                },
              },
              backdrop: {
                sx: { zIndex: 1305 },
              },
            }}
          >
            <AdminSidebar collapsed={false} onItemClick={() => setMobileOpen(false)} />
          </Drawer>
        ) : (
          /* Desktop Fixed Sidebar */
          <nav
            style={{
              width: currentWidth,
              flexShrink: 0,
              transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'fixed',
              left: 0, top: 0, bottom: 0,
              zIndex: 1200,
            }}
          >
            <AdminSidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </nav>
        )}

        {/* Main Content */}
        <div
          style={{
            marginLeft: isMobile ? 0 : currentWidth,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            minWidth: 0,
            width: '100%',
            background: '#FFF8F2',
          }}
        >
          <AdminHeader
            title={title}
            sidebarWidth={isMobile ? 0 : currentWidth}
            onMobileDrawerToggle={() => setMobileOpen(!mobileOpen)}
          />

          <main
            style={{
              flex: 1,
              padding: isMobile ? '16px 14px' : '24px',
              paddingBottom: isMobile ? 'calc(88px + env(safe-area-inset-bottom, 0px))' : '24px',
              paddingLeft: isMobile ? 'max(14px, env(safe-area-inset-left, 0px))' : 24,
              paddingRight: isMobile ? 'max(14px, env(safe-area-inset-right, 0px))' : 24,
              overflowX: 'hidden',
              overflowY: 'auto',
              width: '100%',
              maxWidth: '100vw',
              boxSizing: 'border-box',
            }}
          >
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation — hidden while the drawer is open so the
            two nav surfaces never fight for the same tap targets. */}
        <AdminMobileBottomNav
          onOpenMenuDrawer={() => setMobileOpen(!mobileOpen)}
          hidden={isMobile && mobileOpen}
        />

        {/* Auto Thermal Printer */}
        <AutoOrderPrinter />

        {/* PWA service worker + push notification registration */}
        <ServiceWorkerRegister />

        {/* Global Toast Notification — anchored top-right on desktop, but
            bottom-center on mobile (clearing the fixed bottom nav) so it
            never overlaps the header or gets clipped on narrow screens. */}
        <Snackbar
          open={!!notification}
          anchorOrigin={isMobile ? { vertical: 'bottom', horizontal: 'center' } : { vertical: 'top', horizontal: 'right' }}
          sx={isMobile
            ? { mb: 'calc(78px + env(safe-area-inset-bottom, 0px))', mx: 2 }
            : { mt: 8 }}
        >
          <Alert
            severity={notification?.type || 'success'}
            sx={{
              borderRadius: '14px',
              fontWeight: 600,
              background: '#FFFFFF',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#212121',
              width: '100%',
              '& .MuiAlert-icon': { color: 'inherit' },
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
            }}
          >
            {notification?.message}
          </Alert>
        </Snackbar>
      </div>
    </AdminGuard>
  );
}
