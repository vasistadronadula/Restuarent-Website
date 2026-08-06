'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { menuItems as fallbackMenuItems } from '@/data/menuData';
import type { MenuItem } from '@/types';
import { queryKeys } from './keys';
import { mapMenuItem } from './mappers';
import { patchList, rollbackList } from './optimistic';

export function useMenuItems() {
  return useQuery({
    queryKey: queryKeys.menuItems,
    queryFn: async (): Promise<MenuItem[]> => {
      try {
        // Explicit ordering: without it Postgres may return rows in any order,
        // and an UPDATE physically moves a row — so editing one dish
        // reshuffled the whole menu list under the admin's cursor.
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .order('created_at', { ascending: false });

        // The bundled demo menu is a last resort for the storefront when the
        // database is unreachable — never a stand-in for an empty table. It
        // used to fire on `data.length === 0` too, so deleting the last dish
        // repopulated the menu with demo items that the admin could then
        // neither edit nor delete.
        if (error) return fallbackMenuItems;
        return (data || []).map(mapMenuItem);
      } catch {
        return fallbackMenuItems;
      }
    },
    staleTime: 60_000,
  });
}

export function useAddMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: MenuItem) => {
      const { error } = await supabase.from('menu_items').insert([
        {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          image: item.image,
          veg_status: item.vegStatus,
          rating: item.rating,
          review_count: item.reviewCount,
          is_popular: item.isPopular,
          is_special: item.isSpecial,
          is_available: item.isAvailable,
          description: item.description,
          prep_time: item.prepTime,
          tags: item.tags,
          portion_prices: item.portionPrices,
        },
      ]);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (item) =>
      patchList<MenuItem>(queryClient, queryKeys.menuItems, (draft) =>
        draft.some((m) => m.id === item.id) ? draft : [item, ...draft]
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.menuItems }),
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: MenuItem) => {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: item.name,
          category: item.category,
          price: item.price,
          image: item.image,
          veg_status: item.vegStatus,
          rating: item.rating,
          review_count: item.reviewCount,
          is_popular: item.isPopular,
          is_special: item.isSpecial,
          is_available: item.isAvailable,
          description: item.description,
          prep_time: item.prepTime,
          tags: item.tags,
          portion_prices: item.portionPrices,
        })
        .eq('id', item.id);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (item) =>
      patchList<MenuItem>(queryClient, queryKeys.menuItems, (draft) =>
        draft.map((m) => (m.id === item.id ? item : m))
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.menuItems }),
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (id) =>
      patchList<MenuItem>(queryClient, queryKeys.menuItems, (draft) =>
        draft.filter((m) => m.id !== id)
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.menuItems }),
  });
}
