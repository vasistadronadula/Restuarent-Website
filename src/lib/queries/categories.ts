'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { MenuCategory } from '@/types';
import { queryKeys } from './keys';
import { mapCategory } from './mappers';
import { patchList, rollbackList } from './optimistic';

// ─── Fallback categories ──────────────────────────────────────────────────────
// Used only when the DB is unreachable, same pattern as fallback menu items.

const FALLBACK_CATEGORIES: MenuCategory[] = [
  { id: 'CAT-combos',       name: 'Unlimited & Party Combos', slug: 'combos',       icon: '🎁', image: '', sortOrder: 1,  isActive: true },
  { id: 'CAT-starters',     name: 'Starters',                 slug: 'starters',     icon: '🍗', image: '', sortOrder: 2,  isActive: true },
  { id: 'CAT-tandoori',     name: 'Tandoori',                 slug: 'tandoori',     icon: '🔥', image: '', sortOrder: 3,  isActive: true },
  { id: 'CAT-biryani',      name: 'Biryani & Pulao',          slug: 'biryani',      icon: '🍚', image: '', sortOrder: 4,  isActive: true },
  { id: 'CAT-south-indian', name: 'Curries & Bagara Spl',     slug: 'south-indian', icon: '🥘', image: '', sortOrder: 5,  isActive: true },
  { id: 'CAT-north-indian', name: 'North Indian',             slug: 'north-indian', icon: '🍛', image: '', sortOrder: 6,  isActive: true },
  { id: 'CAT-chinese',      name: 'Chinese',                  slug: 'chinese',      icon: '🥡', image: '', sortOrder: 7,  isActive: true },
  { id: 'CAT-rice',         name: 'Rice',                     slug: 'rice',         icon: '🍙', image: '', sortOrder: 8,  isActive: true },
  { id: 'CAT-breads',       name: 'Roties & Breads',          slug: 'breads',       icon: '🫓', image: '', sortOrder: 9,  isActive: true },
  { id: 'CAT-desserts',     name: 'Desserts',                 slug: 'desserts',     icon: '🍮', image: '', sortOrder: 10, isActive: true },
  { id: 'CAT-beverages',    name: 'Cool Drinks & Soups',      slug: 'beverages',    icon: '🥤', image: '', sortOrder: 11, isActive: true },
];

// ─── Read ─────────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async (): Promise<MenuCategory[]> => {
      try {
        const { data, error } = await supabase
          .from('menu_categories')
          .select('*')
          .order('sort_order', { ascending: true });

        if (error) return FALLBACK_CATEGORIES;
        return (data || []).map(mapCategory);
      } catch {
        return FALLBACK_CATEGORIES;
      }
    },
    staleTime: 60_000,
  });
}

// ─── Add ──────────────────────────────────────────────────────────────────────

export function useAddCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cat: MenuCategory) => {
      const { error } = await supabase.from('menu_categories').insert([{
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        image: cat.image || null,
        sort_order: cat.sortOrder,
        is_active: cat.isActive,
      }]);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (cat) =>
      patchList<MenuCategory>(queryClient, queryKeys.categories, (draft) =>
        draft.some((c) => c.id === cat.id) ? draft : [...draft, cat]
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cat: MenuCategory) => {
      const { error } = await supabase
        .from('menu_categories')
        .update({
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          image: cat.image || null,
          sort_order: cat.sortOrder,
          is_active: cat.isActive,
        })
        .eq('id', cat.id);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (cat) =>
      patchList<MenuCategory>(queryClient, queryKeys.categories, (draft) =>
        draft.map((c) => (c.id === cat.id ? cat : c))
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_categories').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (id) =>
      patchList<MenuCategory>(queryClient, queryKeys.categories, (draft) =>
        draft.filter((c) => c.id !== id)
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}
