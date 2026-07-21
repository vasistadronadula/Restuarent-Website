'use client';
import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Badge, Avatar, Box,
  Menu, MenuItem, Divider, InputBase, Tooltip, Chip,
} from '@mui/material';
import {
  Notifications, Search, AccountCircle, Settings, Logout, Restaurant,
  KeyboardArrowDown, Refresh, Menu as MenuIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useAdmin } from '@/context/AdminContext';

interface Props {
  title: string;
  sidebarWidth?: number;
  onMobileDrawerToggle?: () => void;
}

const notifications = [
  { id: 1, text: '🆕 New order from Arjun Kumar', time: '2 min ago', unread: true },
  { id: 2, text: '📅 Table 5 reservation confirmed', time: '8 min ago', unread: true },
  { id: 3, text: '⚠️ Low stock: Chicken (18 kg remaining)', time: '25 min ago', unread: true },
  { id: 4, text: '💰 ₹48,650 revenue today', time: '1 hr ago', unread: false },
  { id: 5, text: '✅ Order ORD-2026-0001 delivered', time: '2 hr ago', unread: false },
];

export default function AdminHeader({ title, onMobileDrawerToggle }: Props) {
  const { activeRole } = useAdmin();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const now = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        zIndex: 1100,
      }}
    >
      <Toolbar sx={{ px: { xs: 1.5, md: 3 }, gap: { xs: 1, sm: 2 } }}>
        {/* Mobile Toggle Button */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMobileDrawerToggle}
          sx={{ display: { md: 'none' }, color: '#212121' }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ color: '#212121', lineHeight: 1.2, fontWeight: 700, fontSize: { xs: '16px', sm: '20px' } }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>{now}</Typography>
        </Box>

        {/* Search */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center', gap: 1,
            bgcolor: '#F5F5F5', borderRadius: '12px', px: 2, py: 1,
            border: '1px solid transparent',
            '&:focus-within': { border: '1px solid rgba(198,40,40,0.3)', bgcolor: 'white' },
            transition: 'all 0.2s',
          }}
        >
          <Search sx={{ fontSize: 18, color: '#9E9E9E' }} />
          <InputBase placeholder="Search orders, customers..." sx={{ fontSize: '14px', width: 180 }} />
        </Box>

        {/* Refresh */}
        <Tooltip title="Refresh">
          <IconButton size="small" sx={{ color: '#616161' }} onClick={() => window.location.reload()}>
            <Refresh />
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)}>
            <Badge badgeContent={unreadCount} color="error">
              <Notifications sx={{ color: '#616161' }} />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* User */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: '12px', p: 0.8,
            '&:hover': { bgcolor: '#F5F5F5' }, transition: 'all 0.2s' }}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <Avatar sx={{ bgcolor: '#C62828', width: 36, height: 36, fontSize: '14px', fontWeight: 700 }}>RS</Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" sx={{ lineHeight: 1.2, fontWeight: 700 }}>Rajan Sharma</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{activeRole}</Typography>
          </Box>
          <KeyboardArrowDown sx={{ fontSize: 18, color: '#9E9E9E', display: { xs: 'none', sm: 'block' } }} />
        </Box>

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          slotProps={{ paper: { sx: { mt: 1.5, borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', minWidth: 200 } } }}
        >
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Rajan Sharma</Typography>
            <Typography variant="caption" color="text.secondary">rajan@palapittaruchulu.in</Typography>
          </Box>
          <Divider />
          <MenuItem sx={{ py: 1.5, px: 2.5, gap: 1.5 }}><AccountCircle fontSize="small" /> My Profile</MenuItem>
          <MenuItem sx={{ py: 1.5, px: 2.5, gap: 1.5 }}><Settings fontSize="small" /> Settings</MenuItem>
          <Divider />
          <Link href="/" style={{ textDecoration: 'none' }}>
            <MenuItem sx={{ py: 1.5, px: 2.5, gap: 1.5, color: '#C62828' }}>
              <Restaurant fontSize="small" /> Customer Website
            </MenuItem>
          </Link>
          <MenuItem sx={{ py: 1.5, px: 2.5, gap: 1.5, color: '#C62828' }}><Logout fontSize="small" /> Logout</MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          slotProps={{ paper: { sx: { mt: 1.5, borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', minWidth: 300, maxHeight: 400 } } }}
        >
          <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notifications</Typography>
            <Chip label={`${unreadCount} new`} size="small" color="error" />
          </Box>
          <Divider />
          {notifications.map((n) => (
            <MenuItem key={n.id} sx={{ py: 1.5, px: 2.5, alignItems: 'flex-start', gap: 1.5, bgcolor: n.unread ? 'rgba(198,40,40,0.04)' : 'transparent' }}>
              {n.unread && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#C62828', mt: 0.8, flexShrink: 0 }} />}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: n.unread ? 600 : 400 }}>{n.text}</Typography>
                <Typography variant="caption" color="text.secondary">{n.time}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
