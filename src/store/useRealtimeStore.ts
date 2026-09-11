'use client';
import { create } from 'zustand';

export const useRealtimeStore = create<{
  orders: 'connecting' | 'subscribed' | 'reconnecting';
  setOrders: (status: 'connecting' | 'subscribed' | 'reconnecting') => void;
}>((set) => ({ orders: 'connecting', setOrders: (orders) => set({ orders }) }));
