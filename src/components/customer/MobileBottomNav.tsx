'use client';

import React, { useEffect } from 'react';
import { Box, Badge, Typography } from '@mui/material';
import {
  Home, HomeOutlined,
  MenuBook, MenuBookOutlined,
  ShoppingCart, ShoppingCartOutlined,
  ReceiptLong, ReceiptLongOutlined,
  TableRestaurant, TableRestaurantOutlined,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { openCart, closeCart, selectTotalItems } from '@/store/cartSlice';

/**
 * Storefront bottom navigation for phones.
 *
 * Everything a customer does on this site used to be two taps away behind a
 * hamburger: open the drawer, then pick. The five destinations below are the
 * whole customer journey — browse, order, pay, check on it, book a table — so
 * they get permanent thumb-height buttons instead.
 *
 * Desktop keeps the top navbar and never renders this; the breakpoint matches
 * the navbar's own `md` switch so exactly one of the two is ever in charge.
 */

const NAV_HEIGHT = 62;

/** Surfaces with their own chrome, or where a nav bar competes with the task. */
const HIDDEN_PREFIXES = ['/admin', '/cashier', '/checkout', '/login', '/signup', '/reset-password'];

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  /** Cart opens the drawer in place rather than navigating away from a dish list. */
  action?: 'cart';
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: <HomeOutlined />, activeIcon: <Home /> },
  { label: 'Menu', href: '/menu', icon: <MenuBookOutlined />, activeIcon: <MenuBook /> },
  { label: 'Cart', href: '/cart', icon: <ShoppingCartOutlined />, activeIcon: <ShoppingCart />, badge: true },
  { label: 'Orders', href: '/orders', icon: <ReceiptLongOutlined />, activeIcon: <ReceiptLong /> },
  { label: 'Book', href: '/reservation', icon: <TableRestaurantOutlined />, activeIcon: <TableRestaurant /> },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const totalItems = useAppSelector(selectTotalItems);

  const hidden = !pathname || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  /**
   * Publish the height so page content can clear it. A fixed element is out of
   * flow and pushes nothing, so the footer's last row and the floating cart
   * bar both read this instead of hard-coding a number that goes stale the
   * moment the bar's height changes. Kept at 0px on desktop and on the pages
   * that hide the bar, so those surfaces reserve nothing.
   */
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const showing = !hidden && window.matchMedia('(max-width: 899.95px)').matches;
      root.style.setProperty('--ppr-bottom-nav-h', showing ? `${NAV_HEIGHT}px` : '0px');
    };
    apply();
    const mq = window.matchMedia('(max-width: 899.95px)');
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      root.style.setProperty('--ppr-bottom-nav-h', '0px');
    };
  }, [hidden]);

  if (hidden) return null;

  const isActive = (href?: string) => {
    if (!href || !pathname) return false;
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  };

  return (
    <Box
      component="nav"
      aria-label="Primary"
      sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 1250,
        height: NAV_HEIGHT,
        // The inset keeps the labels off the iOS home indicator without
        // shrinking the tap targets themselves.
        pb: 'env(safe-area-inset-bottom, 0px)',
        bgcolor: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(198,40,40,0.1)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const content = (
          <>
            <Box sx={{ display: 'flex', fontSize: 0, mb: 0.25 }}>
              {item.badge ? (
                <Badge
                  badgeContent={totalItems}
                  color="primary"
                  max={99}
                  slotProps={{ badge: { sx: { fontSize: '9px', height: 15, minWidth: 15 } } }}
                >
                  {active ? item.activeIcon : item.icon}
                </Badge>
              ) : (
                active ? item.activeIcon : item.icon
              )}
            </Box>
            <Typography
              component="span"
              sx={{ fontSize: '10.5px', fontWeight: active ? 800 : 600, lineHeight: 1 }}
            >
              {item.label}
            </Typography>
          </>
        );

        const sx = {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          border: 0,
          bgcolor: 'transparent',
          font: 'inherit',
          cursor: 'pointer',
          textDecoration: 'none',
          color: active ? 'primary.main' : 'text.secondary',
          position: 'relative',
          transition: 'color .18s ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: `translateX(-50%) scaleX(${active ? 1 : 0})`,
            width: 26, height: 3,
            borderRadius: '0 0 3px 3px',
            bgcolor: 'primary.main',
            transition: 'transform .2s ease',
          },
          '& .MuiSvgIcon-root': { fontSize: 23 },
        } as const;

        return (
          <Box
            key={item.label}
            component={Link}
            href={item.href!}
            prefetch
            onClick={() => dispatch(closeCart())}
            aria-current={active ? 'page' : undefined}
            sx={sx}
          >
            {content}
          </Box>
        );
      })}
    </Box>
  );
}
