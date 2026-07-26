'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';

const SIDEBAR_WIDTH = 260;
const COLLAPSED_WIDTH = 68;

interface NavItem {
  label: string;
  href: string;
  badge?: number;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface Props {
  collapsed?: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
}



export default function AdminSidebar({ collapsed = false, onToggle, onItemClick }: Props) {
  const pathname = usePathname();
  const { orders, reservations, inventory } = useAdmin();
  const { user, signOutUser } = useAuth();

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending' || o.status === 'preparing').length;
  const activeReservationsCount = reservations.filter((r) => r.status === 'confirmed' || r.status === 'pending').length;
  const lowStockCount = inventory.filter((i) => i.quantity <= i.minQuantity).length;

  const adminName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Admin';
  const adminEmail = user?.email || '';
  const initials = adminName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'AD';

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        {
          label: 'Dashboard',
          href: '/admin',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'Operations',
      items: [
        {
          label: 'Orders',
          href: '/admin/orders',
          badge: pendingOrdersCount,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 12H15M9 16H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          label: 'Reservations',
          href: '/admin/reservations',
          badge: activeReservationsCount,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 10H21M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8 14H10V16H8V14Z" fill="currentColor" />
              <path d="M14 14H16V16H14V14Z" fill="currentColor" />
            </svg>
          ),
        },
        {
          label: 'Kitchen KDS',
          href: '/admin/kitchen',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 4C8.68629 4 6 6.68629 6 10V18H18V10C18 6.68629 15.3137 4 12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M4 18H20M10 18V14M14 18V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'Management',
      items: [
        {
          label: 'Customers',
          href: '/admin/customers',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 21C3 17.134 5.68629 14 9 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16 11C18.2091 11 20 12.7909 20 15V21H14V15C14 12.7909 15.7909 11 18 11H16Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
        {
          label: 'Menu Mgmt',
          href: '/admin/menu-management',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M15 8C15 8 14.5 11 12 11C9.5 11 9 8 9 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M17 3L19 5L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
        {
          label: 'Inventory',
          href: '/admin/inventory',
          badge: lowStockCount,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 8L12 3L3 8V16L12 21L21 16V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M12 3V21M3 8L12 13L21 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'Finance & POS',
      items: [
        {
          label: 'Cashier POS',
          href: '/admin/pos',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M2 10H22" stroke="currentColor" strokeWidth="1.8" />
              <path d="M6 14H10M14 14H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          label: 'Reports',
          href: '/admin/reports',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          label: 'Bills',
          href: '/admin/bills',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2V8H20M12 17V11M9 14H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          label: 'Coupons',
          href: '/admin/coupons',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 9C4.10457 9 5 8.10457 5 7C5 5.89543 4.10457 5 3 5V4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V5C19.8954 5 19 5.89543 19 7C19 8.10457 19.8954 9 21 9V17C21 17 20.5523 17 21 17C19.8954 17 19 17.8954 19 19V20C19 20.5523 18.5523 21 18 21H4C3.44772 21 3 20.5523 3 20V19C3 17.8954 2.10457 17 1 17V9C1 9 2 9 3 9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M9 3L9 21" stroke="currentColor" strokeWidth="1.7" strokeDasharray="2 2" />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'HR & Staff',
      items: [
        {
          label: 'Employees',
          href: '/admin/employees',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 21C4 17.134 7.58172 14 12 14C16.4183 14 20 17.134 20 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ),
        },
      ],
    },
  ];

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <>
      <style>{`
        .admin-sidebar {
          width: ${collapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH}px;
          height: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          background: #FFFFFF;
          border-right: 1px solid rgba(0,0,0,0.06);
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          position: relative;
        }
        .sidebar-logo-area {
          display: flex;
          align-items: center;
          justify-content: ${collapsed ? 'center' : 'space-between'};
          padding: ${collapsed ? '18px 14px' : '18px 20px'};
          min-height: 70px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          flex-shrink: 0;
        }
        .sidebar-logo-icon {
          width: 38px; height: 38px; border-radius: 12px;
          background: linear-gradient(135deg, #c62828, #e65100);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 12px; font-weight: 900; letter-spacing: -0.5px;
          box-shadow: 0 4px 16px rgba(198,40,40,0.3);
          flex-shrink: 0;
        }
        .sidebar-logo-text {
          flex: 1;
          padding-left: 12px;
          overflow: hidden;
        }
        .sidebar-logo-name {
          font-size: 14px; font-weight: 900;
          color: #212121; letter-spacing: -0.3px;
          white-space: nowrap; text-overflow: ellipsis; overflow: hidden;
        }
        .sidebar-logo-tagline {
          font-size: 10px; color: rgba(33,33,33,0.55);
          font-weight: 500; margin-top: 1px;
        }
        .toggle-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(0,0,0,0.03);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: rgba(33,33,33,0.5); flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .toggle-btn:hover { background: rgba(198,40,40,0.08); color: #C62828; }
        .sidebar-nav {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 12px 10px; scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.1) transparent;
        }
        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .nav-group { margin-bottom: 6px; }
        .nav-group-label {
          font-size: 9.5px; font-weight: 700; letter-spacing: 1.4px;
          color: rgba(33,33,33,0.4); text-transform: uppercase;
          padding: ${collapsed ? '8px 0 4px' : '8px 10px 4px'};
          display: ${collapsed ? 'none' : 'block'};
          white-space: nowrap;
        }
        .nav-item-link {
          display: flex; align-items: center;
          gap: ${collapsed ? '0' : '11px'};
          justify-content: ${collapsed ? 'center' : 'flex-start'};
          padding: ${collapsed ? '10px 0' : '10px 12px'};
          border-radius: 12px; margin-bottom: 2px;
          text-decoration: none; position: relative;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          overflow: hidden;
        }
        .nav-item-link.active {
          background: linear-gradient(135deg, rgba(198,40,40,0.1) 0%, rgba(230,81,0,0.07) 100%);
          border: 1px solid rgba(198,40,40,0.16);
        }
        .nav-item-link:not(.active):hover {
          background: rgba(0,0,0,0.035);
        }
        .nav-item-link.active::before {
          content: '';
          position: absolute; left: 0; top: 25%; bottom: 25%;
          width: 3px; border-radius: 0 2px 2px 0;
          background: linear-gradient(180deg, #f97316, #ef4444);
        }
        .nav-icon {
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
        }
        .nav-icon.active { color: #C62828; }
        .nav-icon.inactive { color: rgba(33,33,33,0.55); }
        .nav-item-link:hover .nav-icon.inactive { color: rgba(33,33,33,0.85); }
        .nav-label {
          font-size: 13px; font-weight: 500; white-space: nowrap;
          flex: 1; overflow: hidden; text-overflow: ellipsis;
          transition: color 0.15s;
        }
        .nav-label.active { color: #C62828; font-weight: 700; }
        .nav-label.inactive { color: rgba(33,33,33,0.7); }
        .nav-item-link:hover .nav-label.inactive { color: rgba(33,33,33,0.9); }
        .nav-badge {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white; font-size: 9px; font-weight: 800;
          min-width: 18px; height: 18px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 5px;
          box-shadow: 0 2px 6px rgba(220,38,38,0.4);
        }
        .nav-badge.collapsed-pos {
          position: absolute; top: 4px; right: 4px;
          min-width: 14px; height: 14px; font-size: 8px; border-radius: 7px;
        }
        .sidebar-footer {
          padding: ${collapsed ? '14px 10px' : '16px 14px'};
          border-top: 1px solid rgba(0,0,0,0.06);
          background: #FFF8F2;
        }
        .sidebar-user {
          display: flex; align-items: center;
          gap: ${collapsed ? '0' : '12px'};
          justify-content: ${collapsed ? 'center' : 'flex-start'};
        }
        .sidebar-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #c62828, #e65100);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 12px; font-weight: 800;
          flex-shrink: 0; border: 1.5px solid rgba(0,0,0,0.06);
        }
        .sidebar-user-info { flex: 1; overflow: hidden; }
        .sidebar-user-name {
          font-size: 12px; font-weight: 700; color: #212121;
          white-space: nowrap; text-overflow: ellipsis; overflow: hidden;
        }
        .sidebar-user-email {
          font-size: 10px; color: rgba(33,33,33,0.55);
          white-space: nowrap; text-overflow: ellipsis; overflow: hidden;
        }
        .logout-btn {
          width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid rgba(239,68,68,0.2);
          background: rgba(239,68,68,0.06); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: rgba(220,38,38,0.75); flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .logout-btn:hover { background: rgba(239,68,68,0.12); color: #ef4444; }
        .sidebar-bottom-link {
          display: block; padding: 10px 14px 2px;
          font-size: 11px; font-weight: 600;
          color: rgba(33,33,33,0.5); text-decoration: none;
          transition: color 0.15s;
        }
        .sidebar-bottom-link:hover { color: #f97316; }
      `}</style>

      <div className="admin-sidebar">
        {/* Logo */}
        <div className="sidebar-logo-area">
          <div className="sidebar-logo-icon">PPR</div>
          {!collapsed && (
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-name">Pala Pitta</div>
              <div className="sidebar-logo-tagline">Admin Dashboard</div>
            </div>
          )}
          {onToggle && (
            <button className="toggle-btn" onClick={onToggle} aria-label="Toggle sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                {collapsed ? (
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`nav-item-link ${active ? 'active' : ''}`}
                    onClick={onItemClick}
                    style={{ display: 'flex' }}
                  >
                    <span className={`nav-icon ${active ? 'active' : 'inactive'}`}>
                      {item.icon}
                      {collapsed && item.badge && item.badge > 0 ? (
                        <span className="nav-badge collapsed-pos">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      ) : null}
                    </span>
                    {!collapsed && (
                      <>
                        <span className={`nav-label ${active ? 'active' : 'inactive'}`}>
                          {item.label}
                        </span>
                        {item.badge && item.badge > 0 ? (
                          <span className="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                        ) : null}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <Link href="/" className="sidebar-bottom-link" onClick={onItemClick}>
            ← Back to Website
          </Link>
        )}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{adminName}</div>
                <div className="sidebar-user-email">{adminEmail}</div>
              </div>
            )}
            {!collapsed && (
              <button className="logout-btn" onClick={signOutUser} title="Logout" aria-label="Logout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17L21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
