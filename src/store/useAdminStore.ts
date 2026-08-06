import { create } from 'zustand';

export type AdminRole = 'admin' | 'manager' | 'cashier';

export interface AdminNotification {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

interface AdminUiState {
  activeRole: AdminRole;
  notification: AdminNotification | null;

  setActiveRole: (role: AdminRole) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearNotification: () => void;
}

/**
 * Admin chrome state only — which role's view is being shown, and the current
 * inline banner. Server data lives in TanStack Query; nothing here is cached
 * across a reload, which is deliberate on a shared terminal.
 */
export const useAdminStore = create<AdminUiState>((set) => ({
  activeRole: 'admin',
  notification: null,

  setActiveRole: (activeRole) => set({ activeRole }),
  showNotification: (message, type = 'success') =>
    set({ notification: { message, type, id: Date.now() } }),
  clearNotification: () => set({ notification: null }),
}));
