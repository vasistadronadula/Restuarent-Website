'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { queryKeys } from './keys';
import { mapCoupon, normalizeCouponCode, type Coupon } from './mappers';
import { patchList, rollbackList } from './optimistic';

export function useCoupons() {
  return useQuery({
    queryKey: queryKeys.coupons,
    queryFn: async (): Promise<Coupon[]> => {
      const { data, error } = await supabase.from('coupons').select('*').order('code');
      if (error) throw new Error(error.message);
      return (data || []).map(mapCoupon);
    },
    staleTime: 120_000,
  });
}

export function useAddCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (c: Coupon) => {
      const { error } = await supabase.from('coupons').insert([
        {
          code: normalizeCouponCode(c.code),
          discount: c.discount,
          max_discount: c.maxDiscount,
          min_order: c.minOrder,
          description: c.description,
          is_active: c.isActive,
        },
      ]);
      if (error) {
        // The primary key is the code itself, so a duplicate is the one
        // failure a manager will actually hit — say so in their words.
        throw new Error(
          error.code === '23505'
            ? `Coupon ${normalizeCouponCode(c.code)} already exists`
            : error.message
        );
      }
      return true;
    },
    onMutate: (c) =>
      patchList<Coupon>(queryClient, queryKeys.coupons, (draft) => {
        const code = normalizeCouponCode(c.code);
        return draft.some((x) => x.code === code) ? draft : [...draft, { ...c, code }];
      }),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.coupons }),
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (c: Coupon) => {
      const { error } = await supabase
        .from('coupons')
        .update({
          discount: c.discount,
          max_discount: c.maxDiscount,
          min_order: c.minOrder,
          description: c.description,
          is_active: c.isActive,
        })
        .eq('code', normalizeCouponCode(c.code));
      if (error) throw new Error(error.message);
      return true;
    },
    // Drives the active/inactive switch too, which is why it has to feel
    // instant: the toggle used to snap back until the refetch landed.
    onMutate: (c) =>
      patchList<Coupon>(queryClient, queryKeys.coupons, (draft) => {
        const code = normalizeCouponCode(c.code);
        return draft.map((x) => (x.code === code ? { ...c, code } : x));
      }),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.coupons }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('code', normalizeCouponCode(code));
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (code) =>
      patchList<Coupon>(queryClient, queryKeys.coupons, (draft) =>
        draft.filter((x) => x.code !== normalizeCouponCode(code))
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.coupons }),
  });
}
