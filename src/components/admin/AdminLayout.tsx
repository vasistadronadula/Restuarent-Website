'use client';
import React, { useState, ReactNode } from 'react';
import { Drawer, Snackbar, Alert, useMediaQuery, useTheme } from '@mui/material';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminMobileBottomNav from './AdminMobileBottomNav';
import AutoOrderPrinter from './AutoOrderPrinter';
import ServiceWorkerRegister from './ServiceWorkerRegister';
import RoleManifestLink from './RoleManifestLink';
import { useAdmin } from '@/context/AdminContext';
import { useAppDispatch } from '@/store/hooks';
import { clearNotification } from '@/store/adminSlice';

const SIDEBAR_WIDTH = 240;
const COLLAPSED_WIDTH = 56;

interface Props {
  children: ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: Props) {
  const dispatch = useAppDispatch();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { notification } = useAdmin();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const currentWidth = sidebarCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Authorization is NOT re-checked here: `app/admin/layout.tsx` already
  // wraps this whole segment in <AdminGuard>. Mounting a second guard inside
  // every page ran the redirect effect twice on each navigation.
  return (
    <>
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

          {/* Padding comes from the shared --admin-* metrics in globals.css so
              a full-height page (the POS) can subtract exactly what the shell
              took, instead of guessing at it. */}
          <main
            style={{
              flex: 1,
              padding: 'var(--admin-main-pad)',
              // On desktop --admin-bottom-nav-h and the safe inset are both 0,
              // so this collapses to plain --admin-main-pad. One expression,
              // and it stays in step with --admin-content-h.
              paddingBottom:
                'calc(var(--admin-bottom-nav-h) + var(--admin-safe-bottom) + var(--admin-main-pad))',
              paddingLeft: 'max(var(--admin-main-pad), env(safe-area-inset-left, 0px))',
              paddingRight: 'max(var(--admin-main-pad), env(safe-area-inset-right, 0px))',
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

        {/* Points the install prompt at this role's own app */}
        <RoleManifestLink />

        {/* Global toast — top-right on phones (clear of the thumb and the
            fixed bottom nav), bottom-right on desktop. Matches the
            react-hot-toast placement in providers.tsx so alerts from either
            system always appear in the same corner. */}
        <Snackbar
          open={!!notification}
          autoHideDuration={2500}
          onClose={() => dispatch(clearNotification())}
          anchorOrigin={isMobile ? { vertical: 'top', horizontal: 'right' } : { vertical: 'bottom', horizontal: 'right' }}
          sx={isMobile
            ? { top: 'calc(70px + env(safe-area-inset-top, 0px)) !important', left: 12, right: 12 }
            : { mb: 2, mr: 2 }}
        >
          <Alert
            onClose={() => dispatch(clearNotification())}
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
    </>
  );
}
