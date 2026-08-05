'use client';
import React, { useState, useEffect } from 'react';
import {
  AppBar, Toolbar, Box, Typography, Button, IconButton, Badge,
  Drawer, List, ListItem, ListItemButton, ListItemText, Divider,
  Avatar, Menu, MenuItem, Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon, ShoppingCart, Phone,
  Close, Home, Info, MenuBook, BookOnline, ContactMail, Logout,
  Login, Dashboard, Receipt,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectTotalItems, openCart, closeCart } from '@/store/cartSlice';
import { selectUser, selectUserRole, openAuthModal } from '@/store/authSlice';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, ROLE_ICONS, getRoleHome, isStaffRole, getRoleDashboardLabel } from '@/lib/roleAccess';
import CartDrawer from './CartDrawer';
import PalaPittaLogo from './PalaPittaLogo';

/**
 * Customer navbar.
 *
 * Kept to a single row on purpose. The bar carries four destinations and
 * nothing else; everything account-shaped lives behind the avatar and
 * everything else behind the drawer on mobile. Two things that used to sit
 * here have moved rather than been dropped:
 *
 * - "Home" — the logo is the Home link, which is the convention everywhere;
 *   a second one earned no space. It is still listed explicitly in the
 *   drawer, because a drawer reads as a full site index.
 * - "My Orders" — it was in the bar *and* in the account menu. Order history
 *   is account-scoped, so the account menu is the one that made sense.
 *
 * The separate red strip above the bar is gone: it cost a whole row of
 * chrome to show a phone number and a location. The phone survives as a
 * one-tap call button; the address and hours are in the drawer and footer.
 */

const PHONE_DISPLAY = '+91 70326 82089';
const PHONE_HREF = 'tel:+917032682089';

const NAV_LINKS = [
  { label: 'Home',        href: '/',            icon: <Home fontSize="small" /> },
  { label: 'Menu',        href: '/menu',        icon: <MenuBook fontSize="small" /> },
  { label: 'Reservation', href: '/reservation', icon: <BookOnline fontSize="small" /> },
  { label: 'About',       href: '/about',       icon: <Info fontSize="small" /> },
  { label: 'Contact',     href: '/contact',     icon: <ContactMail fontSize="small" /> },
];

// The drawer is the whole index, including Dashboard and My Orders.
const DRAWER_LINKS = [
  ...NAV_LINKS,
  { label: 'Dashboard', href: '/admin', icon: <Dashboard fontSize="small" /> },
  { label: 'My Orders', href: '/orders', icon: <Receipt fontSize="small" /> },
];

/** primary.main at low alpha — one definition instead of ~30 inline rgba(). */
const tint = (alpha: number) => `rgba(198, 40, 40, ${alpha})`;

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
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : '');
  const isStaff = isStaffRole(userRole);

  const closeMenu = () => setAnchorEl(null);
  const closeDrawer = () => setMobileOpen(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    dispatch(closeCart());
  }, [pathname, dispatch]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: '#fff',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: '1px solid',
          borderColor: scrolled ? tint(0.14) : tint(0.08),
          boxShadow: scrolled ? '0 2px 16px rgba(0,0,0,0.06)' : 'none',
          transition: 'border-color .25s ease, box-shadow .25s ease',
          top: 0,
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1200, mx: 'auto', width: '100%',
            px: { xs: 1.5, md: 3 },
            gap: 1,
            minHeight: { xs: '60px !important', md: '68px !important' },
          }}
        >
          <Link href="/" aria-label="Pala Pitta Ruchulu — Home" style={{ textDecoration: 'none', display: 'flex' }}>
            <PalaPittaLogo variant="light" size="small" />
          </Link>

          {/* Links sit centred-ish, pushed off the logo, with the actions pinned right */}
          <Box sx={{ flexGrow: 1 }} />

          <Box
            component="nav"
            sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, alignItems: 'center' }}
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  prefetch
                  disableRipple
                  sx={{
                    color: active ? 'primary.main' : 'text.primary',
                    fontWeight: active ? 700 : 500,
                    fontSize: '14.5px',
                    px: 1.75, py: 0.75,
                    borderRadius: '10px',
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 4, left: '50%',
                      transform: `translateX(-50%) scaleX(${active ? 1 : 0})`,
                      width: '42%', height: 2,
                      bgcolor: 'primary.main',
                      borderRadius: 2,
                      transition: 'transform .2s ease',
                    },
                    '&:hover': { bgcolor: tint(0.06), color: 'primary.main' },
                    '&:hover::after': { transform: 'translateX(-50%) scaleX(1)' },
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Box>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 }, ml: { md: 1.5 } }}>
            <Tooltip title={`Call ${PHONE_DISPLAY}`}>
              <IconButton
                component="a"
                href={PHONE_HREF}
                aria-label={`Call ${PHONE_DISPLAY}`}
                sx={{ display: { xs: 'none', md: 'inline-flex' }, color: 'primary.main' }}
              >
                <Phone fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Cart">
              <IconButton
                component={Link}
                href="/cart"
                aria-label={`Cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
                sx={{ color: 'primary.main' }}
              >
                <Badge
                  badgeContent={totalItems}
                  color="primary"
                  max={99}
                  slotProps={{ badge: { sx: { fontSize: '10px', height: 17, minWidth: 17 } } }}
                >
                  <ShoppingCart fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Admin / Staff Dashboard Button — Only displayed for staff/admin roles */}
            {isStaff && (
              <Button
                component={Link}
                href={getRoleHome(userRole)}
                startIcon={<Dashboard fontSize="small" />}
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: '13px',
                  px: 1.4,
                  py: 0.5,
                  borderRadius: '10px',
                  bgcolor: tint(0.06),
                  border: '1px solid',
                  borderColor: tint(0.18),
                  '&:hover': { bgcolor: tint(0.12), borderColor: tint(0.3) },
                }}
              >
                Dashboard
              </Button>
            )}

            {/* Log In Button — Displayed when user is NOT signed in */}
            {!user && (
              <Button
                onClick={() => dispatch(openAuthModal('login'))}
                startIcon={<Login fontSize="small" />}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  px: 1.5,
                  py: 0.6,
                  borderRadius: '10px',
                  '&:hover': { bgcolor: tint(0.07) },
                }}
              >
                Log In
              </Button>
            )}

            {/* User Avatar & Account Menu */}
            {user && (
              <>
                <Tooltip title={user.email || 'Account'}>
                  <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    aria-label="Account menu"
                    sx={{ p: 0.4 }}
                  >
                    <Avatar
                      sx={{
                        width: 34, height: 34,
                        bgcolor: 'primary.main',
                        fontSize: '14px', fontWeight: 700,
                        border: isStaff ? '2px solid' : 'none',
                        borderColor: 'secondary.main',
                      }}
                    >
                      {(userName || user.email || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Tooltip>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={closeMenu}
                  slotProps={{ paper: { sx: { mt: 1.2, borderRadius: '14px', minWidth: 232, boxShadow: '0 8px 28px rgba(0,0,0,0.14)', p: 0.6 } } }}
                >
                  <Box sx={{ px: 1.6, py: 1.1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '14px', lineHeight: 1.3 }}>
                      {userName || 'User'}
                    </Typography>
                    <Typography sx={{ color: 'primary.main', fontWeight: 700, fontSize: '11.5px', mt: 0.3 }}>
                      {userRole ? `${ROLE_ICONS[userRole] || ''} ${ROLE_LABELS[userRole]}` : 'Customer'}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: '11px', wordBreak: 'break-all', mt: 0.2 }}>
                      {user.email}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 0.5 }} />

                  {isStaff && (
                    <MenuItem
                      component={Link}
                      href={getRoleHome(userRole)}
                      onClick={closeMenu}
                      sx={{ borderRadius: '9px', my: 0.3, fontSize: '13.5px', fontWeight: 700, color: 'primary.main' }}
                    >
                      <Dashboard fontSize="small" sx={{ mr: 1.3 }} />
                      {getRoleDashboardLabel(userRole, userName)}
                    </MenuItem>
                  )}

                  <MenuItem
                    component={Link}
                    href="/orders"
                    onClick={closeMenu}
                    sx={{ borderRadius: '9px', my: 0.3, fontSize: '13.5px', fontWeight: 500 }}
                  >
                    <Receipt fontSize="small" sx={{ mr: 1.3, color: 'primary.main' }} />
                    My Orders
                  </MenuItem>

                  <MenuItem
                    onClick={() => { closeMenu(); signOutUser(); }}
                    sx={{ borderRadius: '9px', my: 0.3, fontSize: '13.5px', fontWeight: 500, color: 'primary.main' }}
                  >
                    <Logout fontSize="small" sx={{ mr: 1.3 }} />
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            )}

            <Button
              component={Link}
              href="/menu"
              variant="contained"
              color="primary"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                px: 2.4, py: 0.8,
                borderRadius: '10px',
                fontSize: '13.5px', fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              Order Now
            </Button>

            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'primary.main' }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={closeDrawer}
        slotProps={{ paper: { sx: { width: 292, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 } } }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <PalaPittaLogo size="small" />
            <IconButton onClick={closeDrawer} aria-label="Close menu" size="small"><Close /></IconButton>
          </Box>

          {/* Who you are, right at the top — on a shared phone this is the
              first thing worth knowing. */}
          {user && (
            <Box sx={{ p: 1.5, mb: 1.5, borderRadius: '12px', bgcolor: tint(0.06) }}>
              <Typography sx={{ fontWeight: 700, fontSize: '13.5px' }}>{userName || 'User'}</Typography>
              <Typography sx={{ color: 'primary.main', fontWeight: 700, fontSize: '11.5px' }}>
                {userRole ? `${ROLE_ICONS[userRole] || ''} ${ROLE_LABELS[userRole]}` : 'Customer'}
              </Typography>
            </Box>
          )}

          <Divider sx={{ mb: 1.5 }} />

          <List disablePadding sx={{ flexGrow: 1 }}>
            {isStaff && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href={getRoleHome(userRole)}
                  onClick={closeDrawer}
                  sx={{
                    borderRadius: '12px', mb: 0.5,
                    bgcolor: tint(0.1), color: 'primary.main',
                    border: '1px solid', borderColor: tint(0.2),
                  }}
                >
                  <Box sx={{ mr: 1.5, display: 'flex' }}><Dashboard fontSize="small" /></Box>
                  <ListItemText
                    primary={getRoleDashboardLabel(userRole, userName)}
                    slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '14px' } } }}
                  />
                </ListItemButton>
              </ListItem>
            )}

            {DRAWER_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <ListItem key={link.href} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={link.href}
                    onClick={closeDrawer}
                    sx={{
                      borderRadius: '12px', mb: 0.5,
                      bgcolor: active ? tint(0.08) : 'transparent',
                      color: active ? 'primary.main' : 'text.primary',
                    }}
                  >
                    <Box sx={{ mr: 1.5, display: 'flex', color: active ? 'primary.main' : 'text.secondary' }}>
                      {link.icon}
                    </Box>
                    <ListItemText
                      primary={link.label}
                      slotProps={{ primary: { sx: { fontWeight: active ? 700 : 500, fontSize: '14.5px' } } }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          <Divider sx={{ my: 1.5 }} />

          <Button
            component={Link}
            href="/menu"
            onClick={closeDrawer}
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mb: 1, borderRadius: '12px', fontSize: '14.5px' }}
          >
            Order Now
          </Button>

          {user ? (
            <Button
              onClick={() => { closeDrawer(); signOutUser(); }}
              startIcon={<Logout fontSize="small" />}
              fullWidth
              sx={{ color: 'primary.main', fontWeight: 600, borderRadius: '12px' }}
            >
              Sign Out
            </Button>
          ) : (
            <Button
              onClick={() => { closeDrawer(); dispatch(openAuthModal('login')); }}
              startIcon={<Login fontSize="small" />}
              fullWidth
              sx={{ color: 'primary.main', fontWeight: 600, borderRadius: '12px' }}
            >
              Log In
            </Button>
          )}

          <Box sx={{ mt: 2, p: 1.75, bgcolor: 'background.default', borderRadius: '12px' }}>
            <Typography
              component="a"
              href={PHONE_HREF}
              sx={{ display: 'block', color: 'primary.main', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}
            >
              📞 {PHONE_DISPLAY}
            </Typography>
            <Typography sx={{ display: 'block', color: 'text.secondary', fontSize: '12px', mt: 0.4 }}>
              📍 Madhapur, Hyderabad
            </Typography>
            <Typography sx={{ display: 'block', color: 'text.secondary', fontSize: '12px' }}>
              🕐 7 AM – 11 PM daily
            </Typography>
          </Box>
        </Box>
      </Drawer>

      <CartDrawer />
    </>
  );
}
