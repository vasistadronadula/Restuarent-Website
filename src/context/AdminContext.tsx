/**
 * AdminContext.tsx — Compatibility Adapter
 *
 * Provides the `useAdmin()` hook every admin page already consumes. Internally
 * it delegates to TanStack Query (server data) and the Zustand admin store (UI
 * state), so the pages keep one shared, deduplicated cache without each of them
 * having to know which hook owns which table.
 */

'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { toast } from 'sonner';

import { useAdminStore } from '@/store/useAdminStore';
import {
  useOrders, useReservations, useMenuItems, useInventory, useEmployees,
  useUpdateOrderStatus, useUpdateOrderPrepTime, useUpdateReservationStatus,
  useAddMenuItem, useUpdateMenuItem, useDeleteMenuItem,
  useAddInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem,
  useCreateOrder, useCreateReservation,
  useCategories, useAddCategory, useUpdateCategory, useDeleteCategory,
} from '@/lib/queries';
import { Order, Reservation, MenuItem, InventoryItem, Employee, Customer, MenuCategory } from '@/types';

interface AdminContextType {
  orders: Order[];
  reservations: Reservation[];
  customers: Customer[];
  employees: Employee[];
  menuItems: MenuItem[];
  inventory: InventoryItem[];
  categories: MenuCategory[];
  addOrderLocallyAndDB: (newOrder: Order) => Promise<void>;
  addReservationLocallyAndDB: (newRes: Reservation) => Promise<void>;
  // Resolve to false instead of rejecting — they're bound directly to click
  // handlers, so a rejection would surface as an unhandled promise.
  updateOrderStatus: (id: string, status: Order['status']) => Promise<boolean>;
  updateOrderPrepTime: (id: string, delayMinutes: number, notes?: string) => Promise<boolean>;
  updateReservationStatus: (id: string, status: Reservation['status']) => Promise<boolean>;
  // Each rejects with the server's own message when the write fails, so the
  // caller can await it and report the real outcome instead of assuming one.
  addMenuItem: (item: MenuItem) => Promise<void>;
  updateMenuItem: (item: MenuItem) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  toggleMenuItemAvailability: (id: string) => Promise<void>;
  addInventoryItem: (item: InventoryItem) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  adjustInventoryQuantity: (id: string, delta: number) => Promise<void>;
  addCategory: (cat: MenuCategory) => Promise<void>;
  updateCategory: (cat: MenuCategory) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  activeRole: 'admin' | 'manager' | 'cashier';
  setActiveRole: (role: 'admin' | 'manager' | 'cashier') => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  isLoadingDB: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const activeRole = useAdminStore((s) => s.activeRole);
  const setActiveRole = useAdminStore((s) => s.setActiveRole);
  const notificationState = useAdminStore((s) => s.notification);

  // Server data — cached, deduplicated, and kept fresh by RealtimeProvider.
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: reservations = [], isLoading: resLoading } = useReservations();
  const { data: menuItems = [], isLoading: menuLoading } = useMenuItems();
  const { data: inventory = [], isLoading: invLoading } = useInventory();
  const { data: employees = [], isLoading: empLoading } = useEmployees();
  const { data: categories = [], isLoading: catLoading } = useCategories();

  const isLoadingDB = ordersLoading || resLoading || menuLoading || invLoading || empLoading || catLoading;

  const updateOrderStatusMutation = useUpdateOrderStatus();
  const updateOrderPrepTimeMutation = useUpdateOrderPrepTime();
  const updateReservationStatusMutation = useUpdateReservationStatus();
  const addMenuItemMutation = useAddMenuItem();
  const updateMenuItemMutation = useUpdateMenuItem();
  const deleteMenuItemMutation = useDeleteMenuItem();
  const addInventoryItemMutation = useAddInventoryItem();
  const updateInventoryItemMutation = useUpdateInventoryItem();
  const deleteInventoryItemMutation = useDeleteInventoryItem();
  const createOrderMutation = useCreateOrder();
  const createReservationMutation = useCreateReservation();
  const addCategoryMutation = useAddCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  // Derive customers from orders (same logic as before)
  const customers: Customer[] = useMemo(() => {
    const customerMap: Record<string, Customer> = {};
    orders.forEach((o) => {
      const key = o.customerPhone || o.customerId || o.customerName || 'GUEST';
      if (!customerMap[key]) {
        const name = o.customerName || 'Guest Diner';
        const nameParts = name.split(' ');
        const avatar = nameParts.length > 1
          ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase();
        customerMap[key] = {
          id: key, name, phone: o.customerPhone || '',
          email: (o.customerId && o.customerId.includes('@')) ? o.customerId : `${key.replace(/\D/g, '') || 'guest'}@palapitta.com`,
          address: o.customerAddress || 'Hyderabad', city: 'Hyderabad',
          totalOrders: 0, totalSpent: 0, loyaltyPoints: 0,
          joinDate: o.orderDate || '2026-07-01', lastVisit: o.orderDate || '2026-07-22',
          avatar, isVip: false, favoriteItems: [],
        };
      }
      const c = customerMap[key];
      c.totalOrders += 1;
      c.totalSpent += (o.grandTotal || o.subtotal || 0);
      c.loyaltyPoints = Math.floor(c.totalSpent / 10);
      c.isVip = c.totalSpent >= 2500 || c.totalOrders >= 3;
      if (o.orderDate && o.orderDate > c.lastVisit) c.lastVisit = o.orderDate;
    });
    return Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    useAdminStore.getState().showNotification(message, type);
    setTimeout(() => {
      useAdminStore.getState().clearNotification();
    }, 2500);
  };

  // ─── Adapter methods ──────────────────────────────────────────────────────
  // Both throw on failure so callers (checkout, reservation flow, POS) can
  // tell the customer/cashier the write actually failed instead of showing
  // a false "success" screen while nothing was saved.
  const addOrderLocallyAndDB = async (newOrder: Order) => {
    try {
      await createOrderMutation.mutateAsync(newOrder);
    } catch (err) {
      const message = (err as Error).message || 'Failed to save order';
      notify(message, 'error');
      throw new Error(message);
    }
    notify(`New order ${newOrder.id} placed`, 'success');
  };

  const addReservationLocallyAndDB = async (newRes: Reservation) => {
    try {
      await createReservationMutation.mutateAsync(newRes);
    } catch (err) {
      const message = (err as Error).message || 'Failed to save reservation';
      notify(message, 'error');
      throw new Error(message);
    }
    notify(`Reservation ${newRes.id} confirmed`, 'success');
  };

  // These two report their own outcome (they're wired to bare onClick
  // handlers all over the admin, so they must never reject) and also return
  // whether the write landed, for callers that chain further work off it.
  const updateOrderStatus = async (id: string, status: Order['status']): Promise<boolean> => {
    try {
      await updateOrderStatusMutation.mutateAsync({ id, status });
    } catch {
      notify(`Failed to update order ${id}`, 'error');
      return false;
    }
    notify(`Order ${id} updated to ${status}`);

    // Fire-and-forget: notify customer via WhatsApp
    if (['preparing', 'ready', 'delivered'].includes(status)) {
      fetch('/api/whatsapp/send-status-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, newStatus: status }),
      }).catch(() => {/* non-critical */});
    }

    return true;
  };

  const updateOrderPrepTime = async (id: string, delayMinutes: number, notes?: string): Promise<boolean> => {
    try {
      await updateOrderPrepTimeMutation.mutateAsync({ id, delayMinutes, notes });
    } catch {
      notify(`Failed to update prep time for order ${id}`, 'error');
      return false;
    }
    notify(`Added +${delayMinutes}m delay to order ${id}`);
    return true;
  };

  const updateReservationStatus = async (
    id: string, status: Reservation['status']
  ): Promise<boolean> => {
    try {
      await updateReservationStatusMutation.mutateAsync({ id, status });
    } catch {
      notify(`Failed to update reservation ${id}`, 'error');
      return false;
    }
    notify(`Reservation ${id} set to ${status}`);
    return true;
  };

  // ── CRUD adapters ─────────────────────────────────────────────────────────
  // Every one of these awaits the write and surfaces the server's own message
  // on failure. The page that triggered the action owns the messaging — that
  // way a failed save can't be announced as a success, which is exactly what
  // the fire-and-forget versions used to do: they announced "Added to
  // inventory!" in the same tick the request left the browser, so an RLS
  // rejection or a dropped connection still read as a win.
  const addMenuItem = async (item: MenuItem) => {
    await addMenuItemMutation.mutateAsync(item);
  };

  const updateMenuItem = async (item: MenuItem) => {
    await updateMenuItemMutation.mutateAsync(item);
  };

  const deleteMenuItem = async (id: string) => {
    await deleteMenuItemMutation.mutateAsync(id);
  };

  const toggleMenuItemAvailability = async (id: string) => {
    const target = menuItems.find((m) => m.id === id);
    if (!target) return;
    await updateMenuItemMutation.mutateAsync({ ...target, isAvailable: !target.isAvailable });
  };

  const addInventoryItem = async (item: InventoryItem) => {
    await addInventoryItemMutation.mutateAsync(item);
  };

  const updateInventoryItem = async (item: InventoryItem) => {
    await updateInventoryItemMutation.mutateAsync(item);
  };

  const deleteInventoryItem = async (id: string) => {
    await deleteInventoryItemMutation.mutateAsync(id);
  };

  const adjustInventoryQuantity = async (id: string, delta: number) => {
    const target = inventory.find((i) => i.id === id);
    if (!target) return;
    const newQty = Math.max(0, target.quantity + delta);
    const updated = {
      ...target,
      quantity: newQty,
      // `currentStock` is the alias the inventory table actually renders. Only
      // `quantity` used to be patched, so the optimistic cache update changed
      // a field nothing displayed and the number on screen sat still until the
      // refetch landed — which is what made the +/- buttons feel broken.
      currentStock: newQty,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    // The cache patch already moved the number on screen; this only reports
    // the outcome, and only once it's known. It used to celebrate the new
    // quantity before the request had even been sent.
    try {
      await updateInventoryItemMutation.mutateAsync(updated);
      toast.success(`${target.name}: ${newQty} ${target.unit}`, { id: `stock-${id}` });
    } catch (err) {
      toast.error((err as Error).message, { id: `stock-${id}` });
    }
  };

  const addCategory = async (cat: MenuCategory) => {
    await addCategoryMutation.mutateAsync(cat);
  };

  const updateCategory = async (cat: MenuCategory) => {
    await updateCategoryMutation.mutateAsync(cat);
  };

  const deleteCategory = async (id: string) => {
    await deleteCategoryMutation.mutateAsync(id);
  };

  const notification = notificationState
    ? { message: notificationState.message, type: notificationState.type }
    : null;

  const value = useMemo(() => ({
    orders, reservations, customers, employees, menuItems, inventory, categories,
    addOrderLocallyAndDB, addReservationLocallyAndDB,
    updateOrderStatus, updateOrderPrepTime, updateReservationStatus,
    addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability,
    addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryQuantity,
    addCategory, updateCategory, deleteCategory,
    activeRole, setActiveRole,
    notification, showNotification: notify, isLoadingDB,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [orders, reservations, customers, employees, menuItems, inventory, categories, activeRole, notification, isLoadingDB]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
};
