'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { InventoryItem } from '@/types';
import { queryKeys } from './keys';
import { mapInventory } from './mappers';
import { patchList, rollbackList } from './optimistic';

export function useInventory() {
  return useQuery({
    queryKey: queryKeys.inventory,
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });
      // Surface the failure instead of returning []. Swallowing it made a
      // permission or network error look exactly like "you have no stock
      // items", which is the one reading a manager must not be given.
      if (error) throw new Error(error.message);
      return (data || []).map(mapInventory);
    },
    staleTime: 120_000,
  });
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: InventoryItem) => {
      const { error } = await supabase.from('inventory_items').insert([
        {
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity ?? item.currentStock ?? 0,
          unit: item.unit,
          min_quantity: item.minQuantity ?? item.minStockThreshold ?? 5,
          unit_cost: item.costPerUnit ?? item.unitCost ?? 0,
          // The column has always existed and the form has always collected
          // it, but nothing wrote it — so every supplier name typed into the
          // dialog was discarded on save and read back as blank.
          supplier: item.supplier ?? '',
          last_restocked: new Date().toISOString().split('T')[0],
        },
      ]);
      if (error) throw new Error(error.message);
      return true;
    },
    // Show the new item immediately and roll it back if the insert fails —
    // the list previously sat unchanged until a full refetch came back.
    onMutate: (item) =>
      patchList<InventoryItem>(queryClient, queryKeys.inventory, (draft) =>
        draft.some((i) => i.id === item.id) ? draft : [item, ...draft]
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory }),
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: InventoryItem) => {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: item.name,
          category: item.category,
          quantity: item.quantity ?? item.currentStock ?? 0,
          unit: item.unit,
          min_quantity: item.minQuantity ?? item.minStockThreshold ?? 5,
          unit_cost: item.costPerUnit ?? item.unitCost ?? 0,
          supplier: item.supplier ?? '',
          // Whatever the caller decided, not "today" unconditionally. Every
          // edit used to stamp a restock date — including the minus button,
          // so drawing stock down marked the item as freshly restocked.
          last_restocked: item.lastRestocked || new Date().toISOString().split('T')[0],
        })
        .eq('id', item.id);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (item) =>
      patchList<InventoryItem>(queryClient, queryKeys.inventory, (draft) =>
        draft.map((i) => (i.id === item.id ? item : i))
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory }),
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (id) =>
      patchList<InventoryItem>(queryClient, queryKeys.inventory, (draft) =>
        draft.filter((i) => i.id !== id)
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory }),
  });
}
