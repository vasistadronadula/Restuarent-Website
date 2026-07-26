'use client';
import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Box, Typography, Button, IconButton, Badge,
  Drawer, List, ListItem, ListItemButton, ListItemText, Divider,
  Avatar, Menu, MenuItem, Tooltip, Chip,
} from '@mui/material';
import {
  Menu as MenuIcon, ShoppingCart, Phone, 
  Close, Home, Info, MenuBook, BookOnline, ContactMail, Logout,
  Login, Dashboard, Receipt,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectTotalItems, openCart } from '@/store/cartSlice';
import { selectUser, selectUserRole, openAuthModal } from '@/store/authSlice';
import { useAuth } from '@/context/AuthContext';
import CartDrawer from './CartDrawer';
import PalaPittaLogo from './PalaPittaLogo';

const navLinks = [
  { label: 'Home',        href: '/',            icon: <Home fontSize="small" /> },
  { label: 'About',       href: '/about',        icon: <Info fontSize="small" /> },
  { label: 'Menu',        href: '/menu',         icon: <MenuBook fontSize="small" /> },
  { label: 'Reservation', href: '/reservation',  icon: <BookOnline fontSize="small" /> },
  { label: 'My Orders',   href: '/orders',       icon: <Receipt fontSize="small" /> },
  { label: 'Contact',     href: '/contact',      icon: <ContactMail fontSize="small" /> },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  // Fine-grained Redux selectors — each component only re-renders when its slice changes
  const totalItems = useAppSelector(selectTotalItems);
  const user = useAppSelector(selectUser);
  const userRole = useAppSelector(selectUserRole);
  const { signOutUser } = useAuth();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Top Bar */}
      <Box sx={{ bgcolor: '#C62828', py: 0.3, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '11px' }}>
              <Phone sx={{ fontSize: 13 }} /> +91 70326 82089
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px' }}>
              📍 Madhapur, Hyderabad
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label="🕐 Available on Swiggy & Zomato"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '10px', height: 20 }}
            />
          </Box>
        </Box>
      </Box>

      {/* Main Navbar */}
      <AppBar
        position="sticky"
        elevation={scrolled ? 3 : 0}
        sx={{
          bgcolor: scrolled ? 'rgba(255,255,255,0.96)' : '#fff',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: '1px solid rgba(198,40,40,0.08)',
          transition: 'all 0.3s ease',
          top: 0,
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            maxWidth: 1200, mx: 'auto', width: '100%',
            px: { xs: 2, md: 3 }, py: 0.4,
            minHeight: { xs: '48px !important', md: '52px !important' },
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <PalaPittaLogo variant="light" size="small" />
          </Link>
          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Nav Links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.3, alignItems: 'center' }}>
            {user && (
              <Link href="/admin" style={{ textDecoration: 'none' }}>
                <Button
                  size="small"
                  startIcon={<Dashboard fontSize="small" />}
                  sx={{
                    bgcolor: 'rgba(198,40,40,0.12)', color: '#C62828',
                    fontWeight: 800, fontSize: '12px', px: 1.5, py: 0.5, borderRadius: '8px',
                    border: '1.5px solid rgba(198,40,40,0.3)', mr: 0.8,
                    '&:hover': { bgcolor: '#C62828', color: 'white' },
                    transition: 'all 0.2s',
                  }}
                >
                  Admin Dashboard
                </Button>
              </Link>
            )}
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} prefetch={true} style={{ textDecoration: 'none' }}>
                <Button
                  size="small"
                  sx={{
                    color: isActive(link.href) ? '#C62828' : '#424242',
                    fontWeight: isActive(link.href) ? 700 : 500,
                    fontSize: '13px', px: 1.6, py: 0.5, borderRadius: '8px', position: 'relative',
                    '&::after': isActive(link.href) ? {
                      content: '""', position: 'absolute', bottom: 2, left: '50%',
                      transform: 'translateX(-50%)', width: '50%', height: 2,
                      bgcolor: '#C62828', borderRadius: 4,
                    } : {},
                    '&:hover': { bgcolor: 'rgba(198,40,40,0.06)', color: '#C62828' },
                  }}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </Box>

          {/* Cart + Auth */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, ml: 1 }}>
            <IconButton
              onClick={() => dispatch(openCart())}
              size="small"
              sx={{
                bgcolor: totalItems > 0 ? 'rgba(198,40,40,0.08)' : 'transparent',
                border: totalItems > 0 ? '1px solid rgba(198,40,40,0.2)' : 'none',
                p: 0.7,
                '&:hover': { bgcolor: 'rgba(198,40,40,0.12)' },
              }}
            >
              <Badge badgeContent={totalItems} color="primary" max={99} slotProps={{ badge: { sx: { fontSize: '10px', height: 16, minWidth: 16 } } }}>
                <ShoppingCart sx={{ color: '#C62828', fontSize: 20 }} />
              </Badge>
            </IconButton>

            {user ? (
              <>
                <Tooltip title={user.email || 'My Profile'}>
                  <IconButton onClick={handleMenuOpen} size="small" sx={{ p: 0.3 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#C62828', fontSize: '13px', fontWeight: 700, boxShadow: '0 2px 6px rgba(198,40,40,0.3)' }}>
                      {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  slotProps={{ paper: { sx: { mt: 1, borderRadius: '14px', minWidth: 190, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', p: 0.5 } } }}
                >
                  <Box sx={{ px: 1.8, py: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '13px' }}>
                      {user.user_metadata?.full_name || (userRole === 'admin' ? 'Administrator' : 'Customer')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all', fontSize: '11px' }}>
                      {user.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <Link href="/orders" style={{ textDecoration: 'none', color: 'inherit' }} onClick={handleMenuClose}>
                    <MenuItem sx={{ borderRadius: '8px', my: 0.5, fontSize: '13px', fontWeight: 600 }}>
                      <Receipt fontSize="small" sx={{ mr: 1.2, color: '#C62828' }} /> My Orders History
                    </MenuItem>
                  </Link>
                  {userRole === 'admin' && (
                    <Link href="/admin" style={{ textDecoration: 'none', color: 'inherit' }} onClick={handleMenuClose}>
                      <MenuItem sx={{ borderRadius: '8px', my: 0.5, color: '#FF9800', fontWeight: 700, fontSize: '13px' }}>
                        <Dashboard fontSize="small" sx={{ mr: 1.2 }} /> Admin Dashboard
                      </MenuItem>
                    </Link>
                  )}
                  <MenuItem onClick={() => { handleMenuClose(); signOutUser(); }} sx={{ color: '#C62828', borderRadius: '8px', mt: 0.5, fontSize: '13px' }}>
                    <Logout fontSize="small" sx={{ mr: 1.2 }} /> Sign Out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="outlined" color="primary" size="small"
                onClick={() => dispatch(openAuthModal('login'))}
                startIcon={<Login fontSize="small" />}
                sx={{
                  borderRadius: '8px', borderColor: '#C62828', color: '#C62828',
                  fontWeight: 700, fontSize: '12px', px: 1.4, py: 0.4,
                  '&:hover': { bgcolor: 'rgba(198,40,40,0.08)', borderColor: '#8E0000' },
                }}
              >
                Log In
              </Button>
            )}

            <Link href="/menu" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained" color="primary" size="small"
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  background: 'linear-gradient(135deg, #C62828, #EF5350)',
                  px: 2, py: 0.5, borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                  '&:hover': { background: 'linear-gradient(135deg, #8E0000, #C62828)' },
                }}
              >
                Order Now
              </Button>
            </Link>

            <IconButton
              sx={{ display: { xs: 'flex', md: 'none' }, color: '#C62828', p: 0.5 }}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}
        slotProps={{ paper: { sx: { width: 280, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <PalaPittaLogo size="small" />
            <IconButton onClick={() => setMobileOpen(false)} size="small"><Close /></IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List disablePadding>
            {user && (
              <ListItem disablePadding>
                <Link href="/admin" style={{ textDecoration: 'none', width: '100%' }} onClick={() => setMobileOpen(false)}>
                  <ListItemButton sx={{ borderRadius: '12px', mb: 0.5, bgcolor: 'rgba(198,40,40,0.12)', color: '#C62828', border: '1px solid rgba(198,40,40,0.2)' }}>
                    <Box sx={{ mr: 1.5, color: '#C62828' }}><Dashboard fontSize="small" /></Box>
                    <ListItemText primary="Admin Dashboard" slotProps={{ primary: { sx: { fontWeight: 800, fontSize: '14px' } } }} />
                  </ListItemButton>
                </Link>
              </ListItem>
            )}
            {navLinks.map((link) => (
              <ListItem key={link.href} disablePadding>
                <Link href={link.href} style={{ textDecoration: 'none', width: '100%' }} onClick={() => setMobileOpen(false)}>
                  <ListItemButton sx={{ borderRadius: '12px', mb: 0.5, bgcolor: isActive(link.href) ? 'rgba(198,40,40,0.08)' : 'transparent', color: isActive(link.href) ? '#C62828' : '#424242' }}>
                    <Box sx={{ mr: 1.5, color: isActive(link.href) ? '#C62828' : '#616161' }}>{link.icon}</Box>
                    <ListItemText primary={link.label} slotProps={{ primary: { sx: { fontWeight: isActive(link.href) ? 600 : 400 } } }} />
                  </ListItemButton>
                </Link>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Link href="/menu" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
            <Button variant="contained" color="primary" fullWidth sx={{ mb: 1 }}>🍽️ Order Now</Button>
          </Link>
          <Link href="/reservation" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
            <Button variant="outlined" color="primary" fullWidth sx={{ mb: 1 }}>📅 Reserve Table</Button>
          </Link>
          <Box sx={{ mt: 3, p: 2, bgcolor: '#FFF8F2', borderRadius: '12px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>📞 +91 70326 82089</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>📍 Madhapur, Hyderabad, TS</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>🕐 7AM – 11PM Daily</Typography>
          </Box>
        </Box>
      </Drawer>

      <CartDrawer />
    </>
  );
}
