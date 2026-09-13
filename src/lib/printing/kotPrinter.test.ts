// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@/types';
import { printKitchenTicket } from './kotPrinter';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
afterEach(() => vi.restoreAllMocks());

describe('kitchen ticket printing', () => {
  it('renders customer and kitchen text as text instead of executable HTML', () => {
    const write = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write, close: vi.fn() } } as unknown as Window);
    printKitchenTicket({ id: 'PPR-ORD-20260913-abcdef0123456789abc0042', orderNumber: 186,
      customerName: '<img src=x onerror=alert(1)>', orderType: 'takeaway', notes: '</span><script>alert(1)</script>',
      items: [{ name: 'Rice & <b>curry</b>', quantity: 1, price: 100, notes: '<img src=x onerror=alert(2)>' }],
    } as Order);
    const document = new DOMParser().parseFromString(write.mock.calls[0][0], 'text/html');
    expect(document.querySelectorAll('img, b')).toHaveLength(0);
    expect(document.querySelectorAll('script')).toHaveLength(1); // The print-on-load script only.
    expect(document.body.textContent).toContain('Rice & <b>curry</b>');
    expect(document.body.textContent).toContain('ORDER #0042');
  });
  it('reports a blocked print popup', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    printKitchenTicket({ id: 'KDS-0042', items: [] } as unknown as Order);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Allow pop-ups'));
  });
});
