'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { kitchenItemKey } from '@/lib/kitchen/kitchen';
import { mapOrder } from './mappers';
import { queryKeys } from './keys';
import type { Order } from '@/types';

export function usePrepareKitchenItem() {
  const client = useQueryClient();
  return useMutation({
    networkMode: 'always', // Fail a disconnected write; never replay an old kitchen tap later.
    mutationFn: async ({ order, index, prepared }: { order: Order; index: number; prepared: boolean }) => {
      const { data, error } = await supabase.rpc('set_kitchen_item_prepared', {
        p_order_id: order.id, p_item_index: index, p_expected_item: order.items[index],
        p_item_key: kitchenItemKey(order.items, index), p_prepared: prepared,
      });
      if (error) throw new Error(error.code === 'PGRST202'
        ? 'Checklist sync needs the KDS database migration. No progress was saved.' : error.message);
      if (!data?.[0]) throw new Error('Progress was not saved. Refresh and try again.');
      return mapOrder(data[0]);
    },
    onSuccess: (order) => client.setQueryData<Order[]>(queryKeys.orders, old => old?.map(o => o.id === order.id ? order : o)),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.orders }),
  });
}
