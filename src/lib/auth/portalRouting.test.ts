import { describe, expect, it } from 'vitest';
import { getLoginDestination, getPortalRedirect } from './portalRouting';

describe('portal routing', () => {
  it('always lands staff in their own portal, regardless of customer redirect parameters', () => {
    expect(getLoginDestination('admin', '/menu')).toBe('/admin');
    expect(getLoginDestination('chef', '/checkout')).toBe('/admin/kitchen');
    expect(getLoginDestination('cashier', '/')).toBe('/admin/pos');
  });
  it('redirects staff away from public pages but preserves staff paths and password recovery', () => {
    for (const path of ['/', '/menu', '/cart', '/contact', '/login', '/profile']) {
      expect(getPortalRedirect('admin', path)).toBe('/admin');
    }
    expect(getPortalRedirect('admin', '/admin/profile')).toBeNull();
    expect(getPortalRedirect('cashier', '/cashier')).toBeNull();
    expect(getPortalRedirect('admin', '/reset-password')).toBeNull();
    expect(getPortalRedirect('customer', '/menu')).toBeNull();
  });
  it('avoids customer login loops and external redirect destinations', () => {
    expect(getLoginDestination('customer', '/admin?tab=orders')).toBe('/');
    expect(getLoginDestination('customer', '/admin/profile')).toBe('/');
    expect(getLoginDestination('customer', 'https://example.com')).toBe('/');
    expect(getLoginDestination('customer', '/checkout')).toBe('/checkout');
  });
});
