'use client';
import React from 'react';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Avatar, Divider, Chip, IconButton, Tooltip, Badge,
} from '@mui/material';
import {
  Dashboard, Receipt, BookOnline, People, MenuBook, LocalAtm,
  Analytics, Kitchen, Inventory, Badge as BadgeIcon,
  ChevronLeft, ChevronRight, Logout,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';

const SIDEBAR_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    href: '/admin',              icon: <Dashboard />,     badge: 0 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Orders',       href: '/admin/orders',       icon: <Receipt />,       badge: 4 },
      { label: 'Reservations', href: '/admin/reservations', icon: <BookOnline />,    badge: 2 },
      { label: 'Kitchen',      href: '/admin/kitchen',      icon: <Kitchen />,       badge: 0 },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Customers',    href: '/admin/customers',    icon: <People />,        badge: 0 },
      { label: 'Menu Mgmt',    href: '/admin/menu-management', icon: <MenuBook />,   badge: 0 },
      { label: 'Inventory',    href: '/admin/inventory',    icon: <Inventory />,     badge: 3 },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Bills',        href: '/admin/bills',        icon: <LocalAtm />,      badge: 0 },
      { label: 'Reports',      href: '/admin/reports',      icon: <Analytics />,     badge: 0 },
    ],
  },
  {
    label: 'HR',
    items: [
      { label: 'Employees',    href: '/admin/employees',    icon: <BadgeIcon />,     badge: 0 },
    ],
  },
];

interface Props {
  collapsed?: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
}

export default function AdminSidebar({ collapsed = false, onToggle, onItemClick }: Props) {
  const pathname = usePathname();
  const { activeRole, setActiveRole } = useAdmin();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const roleColors = { admin: '#FF9800', manager: '#2196F3', cashier: '#4CAF50' };

  return (
    <Box
      className="admin-sidebar"
      sx={{
        width: collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        height: '100%',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        bgcolor: '#1E1E2D',
      }}
    >
      {/* Logo Header */}
      <Box sx={{ p: collapsed ? 1.5 : 2.5, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 70 }}>
        <Box sx={{
          width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, #C62828, #FF9800)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem',
          boxShadow: '0 4px 12px rgba(198,40,40,0.4)',
        }}>
          🍽️
        </Box>
        {!collapsed && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 800, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
              Pala Pitta Ruchulu
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', letterSpacing: 1, display: 'block' }}>
              ADMIN PANEL
            </Typography>
          </Box>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {onToggle && (
          <IconButton onClick={onToggle} size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white' } }}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        )}
      </Box>

      {/* Role Selector */}
      {!collapsed && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '12px', p: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: 1, display: 'block', mb: 1 }}>
              ACTIVE ROLE
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {(['admin', 'manager', 'cashier'] as const).map((role) => (
                <Chip
                  key={role}
                  label={role}
                  size="small"
                  onClick={() => setActiveRole(role)}
                  sx={{
                    fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                    textTransform: 'capitalize',
                    bgcolor: activeRole === role ? roleColors[role] : 'rgba(255,255,255,0.08)',
                    color: 'white',
                    '&:hover': { opacity: 0.85 },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Nav Items */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 } }}>
        {navGroups.map((group) => (
          <Box key={group.label}>
            {!collapsed && (
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: 1.5,
                  px: 2.5, py: 1, display: 'block', textTransform: 'uppercase', fontWeight: 600 }}
              >
                {group.label}
              </Typography>
            )}
            {group.items.map((item) => (
              <Tooltip key={item.href} title={collapsed ? item.label : ''} placement="right">
                <Link href={item.href} style={{ textDecoration: 'none' }} onClick={onItemClick}>
                  <ListItemButton
                    sx={{
                      mx: 1, mb: 0.4, borderRadius: '10px',
                      px: collapsed ? 1.5 : 2, py: 1.1,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      bgcolor: isActive(item.href) ? 'rgba(198,40,40,0.85)' : 'transparent',
                      '&:hover': { bgcolor: isActive(item.href) ? 'rgba(198,40,40,0.95)' : 'rgba(255,255,255,0.08)' },
                      transition: 'all 0.2s',
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive(item.href) ? 'white' : 'rgba(255,255,255,0.6)', minWidth: collapsed ? 'unset' : 38 }}>
                      <Badge badgeContent={item.badge || undefined} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '10px', height: 16, minWidth: 16 } }}>
                        {item.icon}
                      </Badge>
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: {
                            sx: {
                              fontSize: '13.5px',
                              fontWeight: isActive(item.href) ? 700 : 400,
                              color: isActive(item.href) ? 'white' : 'rgba(255,255,255,0.8)',
                            },
                          },
                        }}
                      />
                    )}
                  </ListItemButton>
                </Link>
              </Tooltip>
            ))}
            <Box sx={{ my: 0.5 }} />
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* User Profile Footer */}
      <Box sx={{ p: collapsed ? 1.5 : 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: '#C62828', width: 36, height: 36, fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>RS</Avatar>
        {!collapsed && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>Rajan Sharma</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize', display: 'block' }}>{activeRole}</Typography>
          </Box>
        )}
        {!collapsed && (
          <Tooltip title="Logout">
            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#C62828' } }}>
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {!collapsed && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Link href="/" style={{ textDecoration: 'none' }} onClick={onItemClick}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', '&:hover': { color: '#FF9800' } }}>
              ← Customer Website
            </Typography>
          </Link>
        </Box>
      )}
    </Box>
  );
}
