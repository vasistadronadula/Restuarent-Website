import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

// ─── State ───────────────────────────────────────────────────────────────────

type AdminRole = 'admin' | 'manager' | 'cashier';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

interface AdminUiState {
  activeRole: AdminRole;
  notification: Notification | null;
}

const initialState: AdminUiState = {
  activeRole: 'admin',
  notification: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setActiveRole(state, action: PayloadAction<AdminRole>) {
      state.activeRole = action.payload;
    },
    showNotification(
      state,
      action: PayloadAction<{ message: string; type?: 'success' | 'error' | 'info' }>
    ) {
      state.notification = {
        message: action.payload.message,
        type: action.payload.type ?? 'success',
        id: Date.now(),
      };
    },
    clearNotification(state) {
      state.notification = null;
    },
  },
});

export const { setActiveRole, showNotification, clearNotification } = adminSlice.actions;
export default adminSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectActiveRole = (state: RootState) => state.admin.activeRole;
export const selectAdminNotification = (state: RootState) => state.admin.notification;
