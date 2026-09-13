// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/useAuthStore';

const nav = vi.hoisted(() => ({ pathname: '/', replace: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname, useRouter: () => ({ replace: nav.replace }) }));
import PortalBoundary from './PortalBoundary';
import AdminGuard from '@/components/admin/AdminGuard';
vi.mock('@/components/customer/PalaPittaLogo', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const user = { id: 'staff-test' } as User;
beforeEach(() => {
  nav.pathname = '/'; nav.replace.mockReset();
  useAuthStore.setState({ user: null, userRole: null, authReady: false, signingOut: false, roleError: null });
});
afterEach(cleanup);
const mount = () => render(createElement(PortalBoundary, null, createElement('p', null, 'Customer website')));

describe('portal rendering boundary', () => {
  it('never mounts the storefront while restoring an admin session or redirecting it', () => {
    const view = mount();
    expect(screen.queryByText('Customer website')).toBeNull();
    act(() => useAuthStore.setState({ user, authReady: true }));
    expect(screen.queryByText('Customer website')).toBeNull();
    act(() => useAuthStore.getState().setUserRole('admin'));
    expect(nav.replace).toHaveBeenCalledWith('/admin');
    expect(screen.queryByText('Customer website')).toBeNull();
    nav.pathname = '/admin';
    view.rerender(createElement(PortalBoundary, null, createElement('p', null, 'Admin portal')));
    expect(screen.getByText('Admin portal')).toBeTruthy();
  });
  it('renders guests after one session check and customers after role verification', () => {
    mount();
    act(() => useAuthStore.setState({ authReady: true }));
    expect(screen.getByText('Customer website')).toBeTruthy();
    act(() => useAuthStore.getState().setUser(user));
    expect(screen.queryByText('Customer website')).toBeNull();
    act(() => useAuthStore.getState().setUserRole('customer'));
    expect(screen.getByText('Customer website')).toBeTruthy();
  });
  it('does not fall through to the storefront on a role verification error', () => {
    useAuthStore.setState({ user, authReady: true, roleError: 'Network failed' });
    mount();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(screen.queryByText('Customer website')).toBeNull();
    expect(nav.replace).not.toHaveBeenCalled();
  });
  it('clears a previous account role atomically when a different user signs in', () => {
    useAuthStore.setState({ user, userRole: 'customer', authReady: true });
    mount();
    act(() => useAuthStore.getState().setUser({ id: 'different-admin' } as User));
    expect(useAuthStore.getState().userRole).toBeNull();
    expect(screen.queryByText('Customer website')).toBeNull();
  });
  it('sends a signed-out admin deep link to login, never to the customer homepage', () => {
    nav.pathname = '/admin/profile';
    useAuthStore.setState({ authReady: true });
    render(createElement(AdminGuard, null, createElement('p', null, 'Private staff data')));
    expect(nav.replace).toHaveBeenCalledWith('/login?redirect=%2Fadmin%2Fprofile');
    expect(screen.queryByText('Private staff data')).toBeNull();
  });
});
