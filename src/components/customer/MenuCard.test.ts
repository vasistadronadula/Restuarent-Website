// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuItem } from '@/types';
import { useCartStore } from '@/store/useCartStore';
vi.mock('@/lib/flyToCart', () => ({ flyToCart: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import MenuCard from './MenuCard';

const dish: MenuItem = { id: 'test-biryani', name: 'Test Biryani', price: 300, image: '', category: 'biryani',
  vegStatus: 'non-veg', isAvailable: true, isPopular: true, isSpecial: true, rating: 4.8, reviewCount: 10,
  description: 'A fragrant rice dish', prepTime: 20, tags: [], portionPrices: { single: 180, full: 300, large: 500 }, maxQuantity: 2 };
beforeEach(() => useCartStore.setState({ items: [] }));
afterEach(cleanup);

describe('menu card ordering controls', () => {
  it('adds the selected portion once, switches to a stepper, and removes the correct portion', () => {
    render(createElement(MenuCard, { item: dish }));
    fireEvent.click(screen.getByRole('button', { name: 'Half' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Test Biryani to cart' }));
    expect(useCartStore.getState().items).toMatchObject([{ selectedPortion: 'single', price: 180, quantity: 1 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Add one more Test Biryani' }));
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect((screen.getByRole('button', { name: 'Test Biryani order limit reached' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Test Biryani' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Test Biryani from cart' }));
    expect(useCartStore.getState().items).toEqual([]);
  });
  it('enforces the per-dish maximum across different portion chips', () => {
    render(createElement(MenuCard, { item: dish }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Test Biryani to cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Half' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Test Biryani to cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Large' }));
    expect((screen.getByRole('button', { name: 'Test Biryani order limit reached' }) as HTMLButtonElement).disabled).toBe(true);
    expect(useCartStore.getState().items.reduce((sum, item) => sum + item.quantity, 0)).toBe(2);
  });
  it('never adds sold-out dishes and adapts if an admin removes a portion', () => {
    const view = render(createElement(MenuCard, { item: { ...dish, isAvailable: false } }));
    const add = screen.getByRole('button', { name: 'Add Test Biryani to cart' }) as HTMLButtonElement;
    expect(add.disabled).toBe(true); fireEvent.click(add);
    expect(useCartStore.getState().items).toEqual([]);
    view.rerender(createElement(MenuCard, { item: dish }));
    fireEvent.click(screen.getByRole('button', { name: 'Large' }));
    view.rerender(createElement(MenuCard, { item: { ...dish, portionPrices: { single: 180 } } }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Test Biryani to cart' }));
    expect(useCartStore.getState().items[0]).toMatchObject({ selectedPortion: 'single', price: 180 });
  });
});
