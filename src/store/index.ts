import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage

import cartReducer from './cartSlice';
import authReducer from './authSlice';
import adminReducer from './adminSlice';
import { supabaseApi } from './supabaseApi';
import { realtimeMiddleware } from './realtimeMiddleware';

// ─── Persist Config ───────────────────────────────────────────────────────────
// Only persist cart — keep it alive across browser refreshes
const cartPersistConfig = {
  key: 'pala-pitta-cart',
  storage,
  // Don't persist isOpen state
  whitelist: ['items', 'couponCode', 'couponDiscount', 'couponMaxDiscount'],
};

const persistedCartReducer = persistReducer(cartPersistConfig, cartReducer);

// ─── Root Reducer ─────────────────────────────────────────────────────────────
const rootReducer = combineReducers({
  cart: persistedCartReducer,
  auth: authReducer,
  admin: adminReducer,
  [supabaseApi.reducerPath]: supabaseApi.reducer,
});

// ─── Store ────────────────────────────────────────────────────────────────────
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist actions are not serializable — ignore them
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(supabaseApi.middleware) // RTK Query middleware (caching, invalidation)
      .concat(realtimeMiddleware),    // Supabase Realtime → cache invalidation bridge
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

// ─── Types ────────────────────────────────────────────────────────────────────
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
