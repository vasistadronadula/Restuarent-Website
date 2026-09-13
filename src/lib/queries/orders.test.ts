// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ insert: vi.fn().mockResolvedValue({ error: null }), menu: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ insert: mocks.insert, select: () => ({ order: mocks.menu }) }) } }));
vi.mock('@/lib/tenantContext', () => ({ getTenantContext: async () => ({}) }));
import { useCreateOrder, useGuestOrders } from './orders';
import { useMenuItems } from './menu';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const TestWrapper = ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client }, children);
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('order data flows', () => {
  it('reports a menu database failure without replacing the catalogue with seed dishes', async () => {
    mocks.menu.mockResolvedValue({ data: null, error: { message: 'Menu unavailable' } });
    const { result } = renderHook(() => useMenuItems(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error?.message).toBe('Menu unavailable');
  });
  it('exposes guest fetch errors instead of reporting an empty order history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Tracking unavailable' }), { status: 503 })));
    const { result } = renderHook(() => useGuestOrders(['order']), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Tracking unavailable');
    expect(result.current.data).toBeUndefined();
  });
  it('loads every saved guest order in API-sized batches', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `order-${i}`);
    const fetch = vi.fn().mockImplementation(async (_url, init) => new Response(JSON.stringify(
      JSON.parse(init.body).ids.map((id: string) => ({ id, items: [] }))
    )));
    vi.stubGlobal('fetch', fetch);
    const { result } = renderHook(() => useGuestOrders(ids), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toHaveLength(51));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[0][1].body).ids).toHaveLength(50);
  });
  it('saves order-wide POS cooking instructions for the KDS', async () => {
    const { result } = renderHook(() => useCreateOrder(), { wrapper: wrapper() });
    await act(() => result.current.mutateAsync({ id: 'KDS-0042', notes: 'Severe peanut allergy',
      items: [{ name: 'Rice', price: 100, quantity: 1 }] }));
    expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({ notes: 'Severe peanut allergy' })]);
  });
});
