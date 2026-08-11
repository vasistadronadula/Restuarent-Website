import { MenuItem } from '@/types';
import rawMenuItems from './menuItems.json';

/**
 * The full real menu — single source of truth shared with the Supabase seed
 * script (scripts/seedDatabase.mjs reads the same menuItems.json). This is
 * the client-side fallback used only if the `menu_items` table is empty or
 * unreachable; day-to-day the app reads from the database so admins can
 * edit prices/availability without a redeploy.
 */
export const menuItems: MenuItem[] = (rawMenuItems as Array<Record<string, unknown>>).map((item) => ({
  id: item.id as string,
  name: item.name as string,
  description: item.description as string,
  price: item.price as number,
  category: item.category as string,
  vegStatus: item.vegStatus as MenuItem['vegStatus'],
  rating: 4.5,
  reviewCount: 0,
  image: item.image as string,
  isPopular: Boolean(item.isPopular),
  isAvailable: true,
  isSpecial: Boolean(item.isSpecial),
  tags: (item.tags as string[]) || [],
  prepTime: item.prepTime as number,
  portionPrices: item.portionPrices as MenuItem['portionPrices'],
}));

export const categoryLabels: Record<string, string> = {
  combos: 'Unlimited & Party Combos',
  starters: 'Starters',
  tandoori: 'Tandoori',
  biryani: 'Biryani & Pulao',
  'south-indian': 'Curries & Bagara Spl',
  'north-indian': 'North Indian',
  chinese: 'Chinese',
  rice: 'Rice',
  breads: 'Roties & Breads',
  desserts: 'Desserts',
  beverages: 'Cool Drinks & Soups',
};
