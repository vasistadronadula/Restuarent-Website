// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/useAuthStore';

type ProfileResult = { data: { role: string } | null; error: { message: string } | null };
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), lookup: vi.fn(), insert: vi.fn(),
  callback: null as null | ((event: string, session: Session | null) => unknown),
}));
vi.mock('@/lib/supabase', () => ({ supabase: {
  auth: {
    getSession: mocks.getSession,
    onAuthStateChange: (cb: typeof mocks.callback) => { mocks.callback = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
  },
  from: () => {
    const query = { select: () => query, eq: () => query, ilike: () => query, maybeSingle: mocks.lookup, insert: mocks.insert };
    return query;
  },
} }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { AuthProvider } from './AuthContext';

const user = { id: 'verified-admin', email: 'test@example.invalid', user_metadata: {} } as User;
const session = { user } as Session;
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, session: null, userRole: null, authReady: false, roleError: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('role restoration', () => {
  it('keeps auth callbacks synchronous and deduplicates concurrent restore/event lookups', async () => {
    let resolve!: (result: ProfileResult) => void;
    mocks.lookup.mockImplementation(() => new Promise<ProfileResult>(done => { resolve = done; }));
    mocks.getSession.mockResolvedValue({ data: { session } });
    render(createElement(AuthProvider, null));
    await waitFor(() => expect(mocks.lookup).toHaveBeenCalledTimes(1));
    let returned: unknown;
    act(() => { returned = mocks.callback?.('INITIAL_SESSION', session); });
    expect(returned).toBeUndefined();
    await act(async () => { await new Promise(done => setTimeout(done, 5)); });
    expect(mocks.lookup).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ data: { role: 'admin' }, error: null }));
    await waitFor(() => expect(useAuthStore.getState().userRole).toBe('admin'));
    expect(useAuthStore.getState().authReady).toBe(true);
  });
  it('does not downgrade an admin to customer or insert a profile after a failed lookup', async () => {
    mocks.lookup.mockResolvedValue({ data: null, error: { message: 'Offline' } });
    mocks.getSession.mockResolvedValue({ data: { session } });
    render(createElement(AuthProvider, null));
    await waitFor(() => expect(useAuthStore.getState().roleError).toBeTruthy());
    expect(useAuthStore.getState().userRole).toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('does not let a late role response restore a signed-out account', async () => {
    let resolve!: (result: ProfileResult) => void;
    mocks.lookup.mockImplementation(() => new Promise<ProfileResult>(done => { resolve = done; }));
    mocks.getSession.mockResolvedValue({ data: { session } });
    render(createElement(AuthProvider, null));
    await waitFor(() => expect(mocks.lookup).toHaveBeenCalledTimes(1));
    act(() => { mocks.callback?.('SIGNED_OUT', null); });
    await act(async () => resolve({ data: { role: 'admin' }, error: null }));
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().userRole).toBeNull();
  });
});
