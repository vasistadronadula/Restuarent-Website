'use client';
import React, { useState, ReactNode } from 'react';
import { Box, Snackbar, Alert, Drawer, useMediaQuery, useTheme } from '@mui/material';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useAdmin } from '@/context/AdminContext';

const SIDEBAR_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F6F9' }}>
      {/* Mobile Drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              sx: {
                width: SIDEBAR_WIDTH,
                bgcolor: '#1E1E2D',
                boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
              },
            },
          }}
        >
          <AdminSidebar
            collapsed={false}
            onItemClick={() => setMobileOpen(false)}
          />
        </Drawer>
      ) : (
        /* Desktop Fixed Sidebar */
        <Box
          component="nav"
          sx={{
            width: currentWidth,
            flexShrink: 0,
            transition: 'width 0.3s ease',
            position: 'fixed',
            left: 0, top: 0, bottom: 0,
            zIndex: 1200,
          }}
        >
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </Box>
      )}

      {/* Main Content Area */}
      <Box
        sx={{
          ml: { xs: 0, md: `${currentWidth}px` },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.3s ease',
          minWidth: 0,
          width: '100%',
        }}
      >
        <AdminHeader
          title={title}
          sidebarWidth={isMobile ? 0 : currentWidth}
          onMobileDrawerToggle={handleDrawerToggle}
        />

        <Box sx={{ flex: 1, p: { xs: 1.5, sm: 2.5, md: 3 }, overflowX: 'hidden' }}>
          {children}
        </Box>
      </Box>

      {/* Global Notification */}
      <Snackbar
        open={!!notification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }}
      >
        <Alert
          severity={notification?.type || 'success'}
          sx={{ borderRadius: '12px', fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
