/**
 * AdminContext.tsx — Compatibility Adapter
 *
 * This provides backward-compatible `useAdmin()` hook for all existing admin pages.
 * Internally it delegates to Redux/RTK Query so all data flows through the single store.
 * This means zero re-writes of admin page code while getting all Redux benefits.
 */

'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectActiveRole, setActiveRole, showNotification, clearNotification, selectAdminNotification } from '@/store/adminSlice';
import {
  useGetOrdersQuery, useGetReservationsQuery, useGetMenuItemsQuery,
  useGetInventoryQuery, useGetEmployeesQuery,
  useUpdateOrderStatusMutation, useUpdateReservationStatusMutation,
  useAddMenuItemMutation, useUpdateMenuItemMutation, useDeleteMenuItemMutation,
  useAddInventoryItemMutation, useUpdateInventoryItemMutation, useDeleteInventoryItemMutation,
  useCreateOrderMutation, useCreateReservationMutation,
} from '@/store/supabaseApi';
import { Order, Reservation, MenuItem, InventoryItem, Employee, Customer } from '@/types';
import toast from 'react-hot-toast';

interface AdminContextType {
  orders: Order[];
  reservations: Reservation[];
  customers: Customer[];
  employees: Employee[];
  menuItems: MenuItem[];
  inventory: InventoryItem[];
  addOrderLocallyAndDB: (newOrder: Order) => Promise<void>;
  addReservationLocallyAndDB: (newRes: Reservation) => Promise<void>;
  // Resolve to false instead of rejecting — they're bound directly to click
  // handlers, so a rejection would surface as an unhandled promise.
  updateOrderStatus: (id: string, status: Order['status']) => Promise<boolean>;
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
  activeRole: 'admin' | 'manager' | 'cashier';
  setActiveRole: (role: 'admin' | 'manager' | 'cashier') => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  isLoadingDB: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const activeRole = useAppSelector(selectActiveRole) as 'admin' | 'manager' | 'cashier';
  const notificationState = useAppSelector(selectAdminNotification);

  // RTK Query data hooks — data is cached, deduplicated, and auto-refreshed
  const { data: orders = [], isLoading: ordersLoading } = useGetOrdersQuery();
  const { data: reservations = [], isLoading: resLoading } = useGetReservationsQuery();
  const { data: menuItems = [], isLoading: menuLoading } = useGetMenuItemsQuery();
  const { data: inventory = [], isLoading: invLoading } = useGetInventoryQuery();
  const { data: employees = [], isLoading: empLoading } = useGetEmployeesQuery();

  const isLoadingDB = ordersLoading || resLoading || menuLoading || invLoading || empLoading;

  // RTK Query mutation hooks
  const [updateOrderStatusMutation] = useUpdateOrderStatusMutation();
  const [updateReservationStatusMutation] = useUpdateReservationStatusMutation();
  const [addMenuItemMutation] = useAddMenuItemMutation();
  const [updateMenuItemMutation] = useUpdateMenuItemMutation();
  const [deleteMenuItemMutation] = useDeleteMenuItemMutation();
  const [addInventoryItemMutation] = useAddInventoryItemMutation();
  const [updateInventoryItemMutation] = useUpdateInventoryItemMutation();
  const [deleteInventoryItemMutation] = useDeleteInventoryItemMutation();
  const [createOrderMutation] = useCreateOrderMutation();
  const [createReservationMutation] = useCreateReservationMutation();

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
          email: o.customerId.includes('@') ? o.customerId : `${key.replace(/\D/g, '') || 'guest'}@palapitta.com`,
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

  const notifyDispatch = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    dispatch(showNotification({ message, type }));
    setTimeout(() => {
      dispatch(clearNotification());
    }, 2500);
  };

  // ─── Adapter methods ──────────────────────────────────────────────────────
  // Both throw on failure so callers (checkout, reservation flow, POS) can
  // tell the customer/cashier the write actually failed instead of showing
  // a false "success" screen while nothing was saved.
  const addOrderLocallyAndDB = async (newOrder: Order) => {
    const result = await createOrderMutation(newOrder);
    if ('error' in result && result.error) {
      const message = (result.error as { error?: string })?.error || 'Failed to save order';
      notifyDispatch(`❌ ${message}`, 'error');
      throw new Error(message);
    }
    notifyDispatch(`🆕 New order ${newOrder.id} placed!`, 'success');
  };

  const addReservationLocallyAndDB = async (newRes: Reservation) => {
    const result = await createReservationMutation(newRes);
    if ('error' in result && result.error) {
      const message = (result.error as { error?: string })?.error || 'Failed to save reservation';
      notifyDispatch(`❌ ${message}`, 'error');
      throw new Error(message);
    }
    notifyDispatch(`📅 Reservation ${newRes.id} confirmed!`, 'success');
  };

  // These two report their own outcome (they're wired to bare onClick
  // handlers all over the admin, so they must never reject) and also return
  // whether the write landed, for callers that chain further work off it.
  const updateOrderStatus = async (id: string, status: Order['status']): Promise<boolean> => {
    const result = await updateOrderStatusMutation({ id, status });
    if ('error' in result && result.error) {
      notifyDispatch(`❌ Failed to update order ${id}`, 'error');
      return false;
    }
    notifyDispatch(`Order ${id} updated to ${status}`);
    return true;
  };

  const updateReservationStatus = async (id: string, status: Reservation['status']): Promise<boolean> => {
    const result = await updateReservationStatusMutation({ id, status });
    if ('error' in result && result.error) {
      notifyDispatch(`❌ Failed to update reservation ${id}`, 'error');
      return false;
    }
    notifyDispatch(`Reservation ${id} set to ${status}`);
    return true;
  };

  // ── CRUD adapters ─────────────────────────────────────────────────────────
  // Every one of these awaits the write and throws the server's own message
  // on failure. The page that triggered the action owns the messaging — that
  // way a failed save can't be announced as a success, which is exactly what
  // the fire-and-forget versions below used to do: they dispatched "Added
  // to inventory!" in the same tick the request left the browser, so an RLS
  // rejection or a dropped connection still read as a win.
  const runWrite = async (
    result: { error?: unknown },
    fallbackMessage: string
  ): Promise<void> => {
    if ('error' in result && result.error) {
      throw new Error((result.error as { error?: string })?.error || fallbackMessage);
    }
  };

  const addMenuItem = async (item: MenuItem) =>
    runWrite(await addMenuItemMutation(item), 'Failed to add menu item');

  const updateMenuItem = async (item: MenuItem) =>
    runWrite(await updateMenuItemMutation(item), 'Failed to update menu item');

  const deleteMenuItem = async (id: string) =>
    runWrite(await deleteMenuItemMutation(id), 'Failed to delete menu item');

  const toggleMenuItemAvailability = async (id: string) => {
    const target = menuItems.find((m) => m.id === id);
    if (!target) return;
    await runWrite(
      await updateMenuItemMutation({ ...target, isAvailable: !target.isAvailable }),
      'Failed to update availability'
    );
  };

  const addInventoryItem = async (item: InventoryItem) =>
    runWrite(await addInventoryItemMutation(item), `Failed to add ${item.name}`);

  const updateInventoryItem = async (item: InventoryItem) =>
    runWrite(await updateInventoryItemMutation(item), `Failed to update ${item.name}`);

  const deleteInventoryItem = async (id: string) => {
    const item = inventory.find((i) => i.id === id);
    await runWrite(await deleteInventoryItemMutation(id), `Failed to remove ${item?.name || 'item'}`);
  };

  const adjustInventoryQuantity = async (id: string, delta: number) => {
    const target = inventory.find((i) => i.id === id);
    if (!target) return;
    const newQty = Math.max(0, target.quantity + delta);
    const updated = { ...target, quantity: newQty, lastUpdated: new Date().toISOString().split('T')[0] };

    // The cache patch already moved the number on screen; this only reports
    // the outcome, and only once it's known. It used to celebrate the new
    // quantity before the request had even been sent.
    try {
      await runWrite(await updateInventoryItemMutation(updated), `Failed to update ${target.name}`);
      toast.success(`${target.name}: ${newQty} ${target.unit}`, { id: `stock-${id}` });
    } catch (err) {
      toast.error((err as Error).message, { id: `stock-${id}` });
    }
  };

  const notification = notificationState
    ? { message: notificationState.message, type: notificationState.type }
    : null;

  const value = useMemo(() => ({
    orders, reservations, customers, employees, menuItems, inventory,
    addOrderLocallyAndDB, addReservationLocallyAndDB,
    updateOrderStatus, updateReservationStatus,
    addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability,
    addInventoryItem, updateInventoryItem, deleteInventoryItem, adjustInventoryQuantity,
    activeRole, setActiveRole: (role: 'admin' | 'manager' | 'cashier') => dispatch(setActiveRole(role)),
    notification, showNotification: notifyDispatch, isLoadingDB,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [orders, reservations, customers, employees, menuItems, inventory, activeRole, notification, isLoadingDB]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
};
