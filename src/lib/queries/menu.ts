'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { MenuItem } from '@/types';
import { queryKeys } from './keys';
import { mapMenuItem } from './mappers';
import { patchList, rollbackList } from './optimistic';

export function useMenuItems() {
  return useQuery({
    queryKey: queryKeys.menuItems,
    queryFn: async (): Promise<MenuItem[]> => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });
      // Keep the last successful live catalogue on a transient failure.
      // An error must never populate staff/customer caches with seed dishes.
      if (error) throw new Error(error.message);
      return (data || []).map(mapMenuItem);
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
          max_quantity: item.maxQuantity ?? null,
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
      const { data, error } = await supabase
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
          max_quantity: item.maxQuantity ?? null,
        })
        .eq('id', item.id)
        .select('id')
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Dish was not updated. Refresh and try again.');
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
      const { data, error } = await supabase.from('menu_items').delete().eq('id', id).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Dish was not deleted. Refresh and try again.');
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
