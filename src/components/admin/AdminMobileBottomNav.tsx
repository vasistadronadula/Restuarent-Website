'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';

interface Props {
  onOpenMenuDrawer: () => void;
  hidden?: boolean;
}

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Home',
    href: '/admin',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
          fill={active ? 'url(#grad1)' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="grad1" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f97316" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    key: 'orders',
    label: 'Orders',
    href: '/admin/orders',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3"
          fill={active ? 'url(#grad2)' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          strokeWidth="1.8"
        />
        <path d="M8 8H16M8 12H14M8 16H12" stroke={active ? 'white' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad2" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f97316" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    href: '/admin/kitchen',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 3C7.58172 3 4 6.58172 4 11V21H20V11C20 6.58172 16.4183 3 12 3Z"
          fill={active ? 'url(#grad3)' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          strokeWidth="1.8" strokeLinecap="round"
        />
        <path d="M4 21H20M9 11H15" stroke={active ? 'white' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad3" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f97316" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    key: 'reservations',
    label: 'Tables',
    href: '/admin/reservations',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="3" rx="1.5"
          fill={active ? 'url(#grad4)' : 'none'}
          stroke={active ? 'none' : 'currentColor'}
          strokeWidth="1.8"
        />
        <path d="M5 10V19M19 10V19M8 19H16" stroke={active ? '#f97316' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
        <defs>
          <linearGradient id="grad4" x1="2" y1="7" x2="22" y2="10" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f97316" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    key: 'more',
    label: 'More',
    href: null,
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="5" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

export default function AdminMobileBottomNav({ onOpenMenuDrawer, hidden = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { orders, reservations } = useAdmin();

  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'preparing').length;
  const pendingReservations = reservations.filter((r) => r.status === 'pending' || r.status === 'confirmed').length;
  const kitchenCount = orders.filter((o) => o.status === 'preparing').length;

  const getBadge = (key: string): number => {
    if (key === 'orders') return pendingOrders;
    if (key === 'kitchen') return kitchenCount;
    if (key === 'reservations') return pendingReservations;
    return 0;
  };

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (!item.href) return false;
    return item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
  };

  const handlePress = (item: typeof NAV_ITEMS[0]) => {
    if (item.href) router.push(item.href);
    else onOpenMenuDrawer();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        // Deliberately kept BELOW MUI's default Modal/Drawer/Dialog z-index
        // (theme.zIndex.modal = 1300) so the sidebar drawer and every
        // Add/Edit dialog in the admin pages always paint above this bar
        // instead of overlaying its buttons on mobile.
        zIndex: 1250,
        display: 'flex',
        flexDirection: 'column',
        transform: hidden ? 'translateY(100%)' : 'translateY(0)',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
      }}
      className="admin-mobile-nav"
      aria-hidden={hidden}
    >
      <style>{`
        @media (min-width: 900px) {
          .admin-mobile-nav { display: none !important; }
        }
        .nav-item-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 8px 4px 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          position: relative;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .nav-item-btn:active {
          transform: scale(0.88);
        }
        .nav-item-btn.active .nav-icon-wrap {
          background: linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.15) 100%);
          border-radius: 14px;
          padding: 6px 10px;
        }
        .nav-icon-wrap {
          padding: 4px 8px;
          border-radius: 12px;
          transition: all 0.2s ease;
          position: relative;
        }
        .nav-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2px;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          transition: color 0.2s ease;
        }
        .nav-badge {
          position: absolute;
          top: -2px;
          right: -4px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          font-size: 9px;
          font-weight: 800;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-shadow: 0 2px 6px rgba(220,38,38,0.5);
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          border: 1.5px solid #FFFFFF;
        }
      `}</style>

      {/* Gradient border top */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(239,68,68,0.4), transparent)',
      }} />

      {/* Nav bar */}
      <div style={{
        display: 'flex',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 4px)',
      }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const badge = getBadge(item.key);
          return (
            <button
              key={item.key}
              className={`nav-item-btn ${active ? 'active' : ''}`}
              onClick={() => handlePress(item)}
              aria-label={item.label}
            >
              <div className="nav-icon-wrap">
                <div style={{ color: active ? '#C62828' : 'rgba(33,33,33,0.5)', display: 'flex' }}>
                  {item.icon(active)}
                </div>
                {badge > 0 && (
                  <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>
                )}
              </div>
              <span
                className="nav-label"
                style={{
                  color: active ? '#C62828' : 'rgba(33,33,33,0.45)',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
