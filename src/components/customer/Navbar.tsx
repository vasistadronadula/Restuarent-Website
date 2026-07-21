'use client';
import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Box, Typography, Button, IconButton, Badge,
  Drawer, List, ListItem, ListItemButton, ListItemText, Divider,
  useScrollTrigger, Slide, Avatar, Chip,
} from '@mui/material';
import {
  Menu as MenuIcon, ShoppingCart, Phone, Restaurant,
  Close, Home, Info, MenuBook, BookOnline, ContactMail, Dashboard,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import CartDrawer from './CartDrawer';

const navLinks = [
  { label: 'Home',        href: '/',            icon: <Home fontSize="small" /> },
  { label: 'About',       href: '/about',        icon: <Info fontSize="small" /> },
  { label: 'Menu',        href: '/menu',         icon: <MenuBook fontSize="small" /> },
  { label: 'Reservation', href: '/reservation',  icon: <BookOnline fontSize="small" /> },
  { label: 'Contact',     href: '/contact',      icon: <ContactMail fontSize="small" /> },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { totalItems, openCart } = useCart();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Top Bar */}
      <Box
        sx={{
          bgcolor: '#C62828',
          py: 0.5,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Phone sx={{ fontSize: 14 }} /> +91 98765 43210
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              📍 Hyderabad, Telangana
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label="🕐 Open: 7AM – 11PM"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '11px' }}
            />
            <Link href="/admin" style={{ textDecoration: 'none' }}>
              <Chip
                icon={<Dashboard sx={{ fontSize: '14px !important', color: 'white !important' }} />}
                label="Admin Panel"
                size="small"
                sx={{ bgcolor: '#FF9800', color: 'white', fontSize: '11px', cursor: 'pointer',
                  '&:hover': { bgcolor: '#E65100' } }}
              />
            </Link>
          </Box>
        </Box>
      </Box>

      {/* Main Navbar */}
      <AppBar
        position="sticky"
        elevation={scrolled ? 4 : 0}
        sx={{
          bgcolor: scrolled ? 'rgba(255,255,255,0.95)' : '#fff',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: '1px solid rgba(198,40,40,0.1)',
          transition: 'all 0.3s ease',
          top: 0,
        }}
      >
        <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 2, md: 3 }, py: 1 }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Box
              sx={{
                width: 44, height: 44, borderRadius: '12px',
                background: 'linear-gradient(135deg, #C62828, #FF9800)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(198,40,40,0.3)',
              }}
            >
              <Restaurant sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: '#C62828', fontWeight: 800, lineHeight: 1.1,
                  fontSize: { xs: '16px', md: '20px' },
                }}
              >
                Pala Pitta Ruchulu
              </Typography>
              <Typography variant="caption" sx={{ color: '#616161', fontSize: '10px', letterSpacing: 1 }}>
                RESTAURANT
              </Typography>
            </Box>
          </Link>

          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Nav Links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, alignItems: 'center' }}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <Button
                  sx={{
                    color: isActive(link.href) ? '#C62828' : '#424242',
                    fontWeight: isActive(link.href) ? 700 : 500,
                    px: 2, py: 1, borderRadius: '10px',
                    position: 'relative',
                    '&::after': isActive(link.href) ? {
                      content: '""', position: 'absolute', bottom: 4, left: '50%',
                      transform: 'translateX(-50%)', width: '60%', height: 2,
                      bgcolor: '#C62828', borderRadius: 4,
                    } : {},
                    '&:hover': { bgcolor: 'rgba(198,40,40,0.08)', color: '#C62828' },
                  }}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </Box>

          {/* Cart + Order Now */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
            <IconButton
              onClick={openCart}
              sx={{
                bgcolor: totalItems > 0 ? 'rgba(198,40,40,0.08)' : 'transparent',
                border: totalItems > 0 ? '1px solid rgba(198,40,40,0.2)' : 'none',
                '&:hover': { bgcolor: 'rgba(198,40,40,0.12)' },
              }}
            >
              <Badge badgeContent={totalItems} color="primary" max={99}>
                <ShoppingCart sx={{ color: '#C62828' }} />
              </Badge>
            </IconButton>

            <Link href="/menu" style={{ textDecoration: 'none', display: { xs: 'none', sm: 'block' } as any }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  background: 'linear-gradient(135deg, #C62828, #EF5350)',
                  px: 2.5, py: 1,
                  '&:hover': { background: 'linear-gradient(135deg, #8E0000, #C62828)' },
                }}
              >
                Order Now
              </Button>
            </Link>

            {/* Mobile menu */}
            <IconButton
              sx={{ display: { xs: 'flex', md: 'none' }, color: '#C62828' }}
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{ paper: { sx: { width: 280, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #C62828, #FF9800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Restaurant sx={{ color: 'white', fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#C62828', fontWeight: 700 }}>Pala Pitta Ruchulu</Typography>
            </Box>
            <IconButton onClick={() => setMobileOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <List disablePadding>
            {navLinks.map((link) => (
              <ListItem key={link.href} disablePadding>
                <Link href={link.href} style={{ textDecoration: 'none', width: '100%' }} onClick={() => setMobileOpen(false)}>
                  <ListItemButton
                    sx={{
                      borderRadius: '12px', mb: 0.5,
                      bgcolor: isActive(link.href) ? 'rgba(198,40,40,0.08)' : 'transparent',
                      color: isActive(link.href) ? '#C62828' : '#424242',
                    }}
                  >
                    <Box sx={{ mr: 1.5, color: isActive(link.href) ? '#C62828' : '#616161' }}>{link.icon}</Box>
                    <ListItemText primary={link.label} slotProps={{ primary: { sx: { fontWeight: isActive(link.href) ? 600 : 400 } } }} />
                  </ListItemButton>
                </Link>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />
          <Link href="/menu" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
            <Button variant="contained" color="primary" fullWidth sx={{ mb: 1 }}>
              🍽️ Order Now
            </Button>
          </Link>
          <Link href="/reservation" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
            <Button variant="outlined" color="primary" fullWidth sx={{ mb: 1 }}>
              📅 Reserve Table
            </Button>
          </Link>
          <Link href="/admin" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
            <Button variant="text" color="secondary" fullWidth startIcon={<Dashboard />}>
              Admin Panel
            </Button>
          </Link>

          <Box sx={{ mt: 3, p: 2, bgcolor: '#FFF8F2', borderRadius: '12px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>📞 +91 98765 43210</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>📍 Hyderabad, Telangana</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>🕐 7AM – 11PM Daily</Typography>
          </Box>
        </Box>
      </Drawer>

      <CartDrawer />
    </>
  );
}
