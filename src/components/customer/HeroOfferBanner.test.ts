// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Coupon } from '@/lib/queries/mappers';

const mocks = vi.hoisted(() => ({ coupons: [] as Coupon[], reduced: false, success: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/queries', () => ({ useCoupons: () => ({ data: mocks.coupons }) }));
vi.mock('motion/react', () => ({ useReducedMotion: () => mocks.reduced }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
import HeroOfferBanner, { OFFER_SLIDE_MS } from './HeroOfferBanner';

const coupon = (code: string, isActive = true): Coupon => ({ code, discount: 10, maxDiscount: 100, minOrder: 200, description: '', isActive });
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); mocks.reduced = false;
  mocks.coupons = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(code => coupon(code));
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const advance = () => act(() => vi.advanceTimersByTime(OFFER_SLIDE_MS));

describe('live offer carousel', () => {
  it('automatically slides through every active coupon, including offers after the fifth', () => {
    mocks.coupons.push(coupon('HIDDEN', false));
    render(createElement(HeroOfferBanner));
    for (const code of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A']) {
      expect(screen.getByRole('button', { name: new RegExp(`Copy code ${code} for`) })).toBeTruthy();
      advance();
    }
    expect(screen.queryByText('HIDDEN')).toBeNull();
  });
  it('includes newly added coupons and safely handles removal of the visible offer', () => {
    mocks.coupons = [coupon('A'), coupon('B')];
    const view = render(createElement(HeroOfferBanner));
    fireEvent.click(screen.getByRole('button', { name: 'Next offer' }));
    mocks.coupons = [...mocks.coupons, coupon('C')];
    view.rerender(createElement(HeroOfferBanner));
    advance();
    expect(screen.getByRole('button', { name: /Copy code C for/ })).toBeTruthy();
    mocks.coupons = [coupon('B')];
    view.rerender(createElement(HeroOfferBanner));
    expect(screen.getByRole('button', { name: /Copy code B for/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next offer' })).toBeNull();
    mocks.coupons = [];
    view.rerender(createElement(HeroOfferBanner));
    expect(screen.queryByRole('region')).toBeNull();
  });
  it('pauses during focus, pointer hover, and explicit pause', () => {
    render(createElement(HeroOfferBanner));
    const region = screen.getByRole('region', { name: 'Discount offers' });
    fireEvent.mouseEnter(region); advance();
    expect(screen.getByRole('button', { name: /Copy code A for/ })).toBeTruthy();
    fireEvent.mouseLeave(region);
    fireEvent.focus(screen.getByRole('button', { name: /Copy code A for/ })); advance();
    expect(screen.getByRole('button', { name: /Copy code A for/ })).toBeTruthy();
    fireEvent.blur(screen.getByRole('button', { name: /Copy code A for/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause offer slideshow' })); advance();
    expect(screen.getByRole('button', { name: /Copy code A for/ })).toBeTruthy();
  });
  it('provides manual navigation without autoplay for reduced motion', () => {
    mocks.reduced = true;
    render(createElement(HeroOfferBanner)); advance();
    expect(screen.getByRole('button', { name: /Copy code A for/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous offer' }));
    expect(screen.getByRole('button', { name: /Copy code G for/ })).toBeTruthy();
  });
  it('copies the currently visible offer and reports clipboard failure honestly', async () => {
    render(createElement(HeroOfferBanner));
    fireEvent.click(screen.getByRole('button', { name: 'Next offer' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Copy code B for/ })));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('B');
    expect(screen.getByText('Copied')).toBeTruthy();
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Next offer' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Copy code C for/ })));
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Use code C'));
  });
});
