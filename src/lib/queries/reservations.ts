'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { generateReservationId } from '@/lib/idGenerator';
import type { Reservation, ReservationStatus } from '@/types';
import { queryKeys } from './keys';
import { mapReservation } from './mappers';
import { patchList, rollbackList } from './optimistic';

export function useReservations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reservations,
    queryFn: async (): Promise<Reservation[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map(mapReservation);
    },
    staleTime: 60_000,
    // Staff-only listing — no customer page reads this list (booking a table
    // only ever calls useCreateReservation), see useInventory.
    enabled,
  });
}

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReservationStatus }) => {
      const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: ({ id, status }) =>
      patchList<Reservation>(queryClient, queryKeys.reservations, (draft) =>
        draft.map((r) => (r.id === id ? { ...r, status } : r))
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.reservations }),
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      resData: Partial<Reservation> & { tableId?: string; tableNumber?: number }
    ): Promise<Reservation> => {
      const resId = resData.id || generateReservationId();
      const newRes: Reservation = {
        id: resId,
        customerName: resData.customerName || 'Guest',
        customerPhone: resData.customerPhone || '',
        email: resData.email || '',
        guests: resData.guests || 2,
        date: resData.date || new Date().toISOString().split('T')[0],
        time: resData.time || '19:30',
        specialRequest: resData.specialRequest || '',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      const { error } = await supabase.from('reservations').insert([
        {
          id: resId, // PPR-RES-20260725-3914
          name: newRes.customerName,
          phone: newRes.customerPhone,
          email: newRes.email,
          guests: newRes.guests,
          date: newRes.date,
          time: newRes.time,
          request: newRes.specialRequest,
          status: 'confirmed',
          table_id: resData.tableId || null,
          table_number: resData.tableNumber || null,
          user_id: resData.userId || null,
        },
      ]);
      if (error) throw new Error(error.message);

      return newRes;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reservations }),
  });
}
