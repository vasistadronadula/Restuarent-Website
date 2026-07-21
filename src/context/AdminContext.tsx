'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Order, Reservation, Customer, Employee, MenuItem, InventoryItem } from '@/types';
import { orders as initialOrders } from '@/data/mockData';
import { reservations as initialReservations } from '@/data/mockData';
import { customers as initialCustomers } from '@/data/mockData';
import { employees as initialEmployees } from '@/data/mockData';
import { inventory as initialInventory } from '@/data/mockData';
import { menuItems as initialMenuItems } from '@/data/menuData';

interface AdminContextType {
  orders: Order[];
  reservations: Reservation[];
  customers: Customer[];
  employees: Employee[];
  menuItems: MenuItem[];
  inventory: InventoryItem[];
  updateOrderStatus: (id: string, status: Order['status']) => void;
  updateReservationStatus: (id: string, status: Reservation['status']) => void;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  toggleMenuItemAvailability: (id: string) => void;
  activeRole: 'admin' | 'manager' | 'cashier';
  setActiveRole: (role: 'admin' | 'manager' | 'cashier') => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [customers] = useState<Customer[]>(initialCustomers);
  const [employees] = useState<Employee[]>(initialEmployees);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [inventory] = useState<InventoryItem[]>(initialInventory);
  const [activeRole, setActiveRole] = useState<'admin' | 'manager' | 'cashier'>('admin');
  const [notification, setNotification] = useState<AdminContextType['notification']>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    showNotification(`Order status updated to ${status}`);
  };

  const updateReservationStatus = (id: string, status: Reservation['status']) => {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    showNotification(`Reservation ${status}`);
  };

  const addMenuItem = (item: MenuItem) => {
    setMenuItems((prev) => [...prev, item]);
    showNotification('Menu item added successfully!');
  };

  const updateMenuItem = (item: MenuItem) => {
    setMenuItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));
    showNotification('Menu item updated!');
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
    showNotification('Menu item deleted.', 'info');
  };

  const toggleMenuItemAvailability = (id: string) => {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isAvailable: !m.isAvailable } : m))
    );
  };

  return (
    <AdminContext.Provider
      value={{
        orders, reservations, customers, employees, menuItems, inventory,
        updateOrderStatus, updateReservationStatus,
        addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemAvailability,
        activeRole, setActiveRole,
        notification, showNotification,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
};
