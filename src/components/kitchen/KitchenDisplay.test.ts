// @vitest-environment jsdom
import React, { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@/types';

const mocks = vi.hoisted(() => ({ orders: [] as Order[], update: vi.fn(), prepare: vi.fn(), details: vi.fn(), error: vi.fn(), success: vi.fn(), refetch: vi.fn() }));
vi.mock('@/components/admin/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => createElement('div', null, children) }));
vi.mock('@/lib/queries/orders', () => ({
  useOrders: () => ({ data: mocks.orders, dataUpdatedAt: Date.now(), isError: false, isPending: false, isFetching: false, refetch: mocks.refetch }),
  useUpdateOrderStatus: () => ({ mutateAsync: mocks.update }), useUpdateOrderPrepTime: () => ({ mutateAsync: mocks.details }),
}));
vi.mock('@/lib/queries/menu', () => ({ useMenuItems: () => ({ data: [], refetch: mocks.refetch }) }));
vi.mock('@/lib/queries/kitchen', () => ({ usePrepareKitchenItem: () => ({ mutateAsync: mocks.prepare }) }));
vi.mock('@/lib/authedFetch', () => ({ postAuthedJson: vi.fn() }));
vi.mock('@/lib/audio', () => ({ playOrderChimeSound: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success, info: vi.fn() } }));
import KitchenDisplay from './KitchenDisplay';

const ticket = (overrides: Partial<Order> = {}): Order => ({ id: 'KDS-0001', orderId: 'KDS-0001', customerName: 'Not shown to kitchen',
  customerPhone: '9999999999', items: [{ name: 'Hyderabadi Chicken Dum Biryani Family Special', quantity: 2, price: 300, selectedPortion: 'full', notes: 'No peanuts' }],
  notes: 'Pack chutney separately', subtotal: 600, grandTotal: 630, cgst: 15, sgst: 15, status: 'pending', paymentMode: 'cash', paymentStatus: 'unpaid',
  kitchenProgress: {}, createdAt: new Date().toISOString(), ...overrides });

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(['orders'], mocks.orders);
  return render(createElement(QueryClientProvider, { client }, createElement(KitchenDisplay)));
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.orders = [ticket()];
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(cleanup);

describe('Kitchen display interactions', () => {
  it('keeps the full dish, portion, instructions and quantity visible without customer contact or prices', () => {
    mount();
    expect(screen.getByText('Hyderabadi Chicken Dum Biryani Family Special')).toBeTruthy();
    expect(screen.getByText('No peanuts')).toBeTruthy();
    expect(screen.getByText('Pack chutney separately')).toBeTruthy();
    expect(screen.getByText('×2')).toBeTruthy();
    expect(screen.queryByText('9999999999')).toBeNull();
    expect(screen.queryByText('₹630')).toBeNull();
  });
  it('holds the ticket while saving and prevents double submission', async () => {
    let finish!: (order: Order) => void;
    mocks.update.mockImplementation(() => new Promise<Order>(resolve => { finish = resolve; }));
    mount(); const start = screen.getByRole('button', { name: 'Start cooking' });
    fireEvent.click(start); fireEvent.click(start);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({ id: 'KDS-0001', status: 'preparing', expectedStatus: 'pending', optimistic: false });
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish(ticket({ status: 'preparing' })));
    expect(mocks.success).toHaveBeenCalled();
  });
  it('reports a failed save and leaves the action available for retry', async () => {
    mocks.update.mockRejectedValue(new Error('Order changed on another screen'));
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Start cooking' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Order changed on another screen'));
    expect((screen.getByRole('button', { name: 'Start cooking' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('checks current connectivity when an older Undo callback is invoked', async () => {
    mocks.update.mockResolvedValue(ticket({ status: 'preparing' }));
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Start cooking' }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    const undo = mocks.success.mock.calls[0][1].action.onClick;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    await act(async () => undo());
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Reconnect'));
  });
  it('blocks writes offline and resumes after reconnecting', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    mount(); const start = screen.getByRole('button', { name: 'Start cooking' }) as HTMLButtonElement;
    expect(start.disabled).toBe(true); fireEvent.click(start); expect(mocks.update).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));
    expect(start.disabled).toBe(false);
  });
  it('shows a pickup clock for ready tickets and has no preparation-delay action', () => {
    mocks.orders = [ticket({ status: 'ready', createdAt: new Date(Date.now() - 3600000).toISOString(), readyAt: new Date(Date.now() - 240000).toISOString() })];
    mount(); const card = screen.getByRole('article', { name: 'Ticket 0001' });
    expect(within(card).getByText('Waiting for pickup')).toBeTruthy();
    expect(within(card).getByText('4m')).toBeTruthy();
    expect(within(card).queryByText(/Overdue/)).toBeNull();
    expect(within(card).queryByRole('button', { name: 'Delay' })).toBeNull();
  });
  it('does not pretend to save checklist progress before the migration is installed', () => {
    mocks.orders = [ticket({ kitchenProgress: undefined })]; mount();
    expect((screen.getByRole('button', { name: /Mark prepared:/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Checklist sync needs/)).toBeTruthy();
  });
  it('exposes labelled filters and pauses keyboard shortcuts inside dialogs', () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Preparing: 0 tickets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kitchen tools and filters' }));
    expect(screen.getByLabelText('Ticket order')).toBeTruthy();
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Preparing: 0 tickets' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps channel totals stable and separates counter orders from takeaway', () => {
    mocks.orders = [ticket({ orderType: 'dine-in' }), ticket({ id: 'KDS-0002', orderType: 'takeaway' }),
      ticket({ id: 'KDS-0003', orderType: 'counter' }), ticket({ id: 'KDS-0004' })];
    mount();
    const channels = within(screen.getByRole('group', { name: 'Order channel' }));
    fireEvent.click(channels.getByRole('button', { name: 'Takeaway 2' }));
    expect(screen.getAllByRole('article').map(card => card.getAttribute('aria-label'))).toEqual(['Ticket 0002', 'Ticket 0004']);
    expect(channels.getByRole('button', { name: 'All orders 4' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New: 2 tickets' })).toBeTruthy();
    fireEvent.click(channels.getByRole('button', { name: 'Counter 1' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Ticket 0003' })).toBeTruthy();
  });
  it('filters overdue prep without treating ready pickup time as overdue', () => {
    const old = new Date(Date.now() - 30 * 60000).toISOString();
    mocks.orders = [ticket({ createdAt: old }), ticket({ id: 'KDS-0002' }),
      ticket({ id: 'KDS-0003', status: 'ready', createdAt: old, readyAt: old })];
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Overdue tickets: 1' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Ticket 0001' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });
  it('finds a sequential ticket number and restores the board when search is cleared', () => {
    mocks.orders = [ticket({ orderNumber: 186 }), ticket({ id: 'KDS-0002', orderNumber: 187 })];
    mount();
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: '#186' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Ticket 186' })).toBeTruthy();
    fireEvent.change(search, { target: { value: 'no-such-dish' } });
    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.getAllByText('No matching tickets')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(document.activeElement).toBe(search);
  });
  it('lets cooks disable single-key shortcuts and keeps typing from changing stages', () => {
    mount();
    const search = screen.getByRole('searchbox');
    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(search);
    fireEvent.keyDown(search, { key: '2' });
    expect(screen.getByRole('button', { name: 'New: 1 tickets' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Kitchen tools and filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts on' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(window, { key: '2' });
    expect(screen.getByRole('button', { name: 'New: 1 tickets' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps delay presets selected and appends the reason to existing instructions', async () => {
    mocks.details.mockResolvedValue(undefined);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Delay' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: '+15m' }));
    expect(dialog.getByRole('button', { name: '+15m' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Fresh batch cooking' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Add prep time' }));
    await waitFor(() => expect(mocks.details).toHaveBeenCalledWith(expect.objectContaining({
      delayMinutes: 15, notes: 'Pack chutney separately\nPrep delay: Fresh batch cooking', optimistic: false,
    })));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('shows an explicit all-day empty state after the kitchen is caught up', () => {
    mocks.orders = [ticket({ status: 'ready' })];
    mount();
    fireEvent.click(screen.getByRole('button', { name: /All-day prep/ }));
    expect(screen.getByText('All caught up. No items waiting to be cooked.')).toBeTruthy();
    expect(screen.getByRole('article').textContent).not.toContain('0/1 lines prepared');
  });
});
