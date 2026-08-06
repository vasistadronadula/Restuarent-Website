'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { queryKeys } from './keys';
import { mapRestaurantTable, type RestaurantTable } from './mappers';
import { patchList, rollbackList } from './optimistic';

export function useTables() {
  return useQuery({
    queryKey: queryKeys.tables,
    queryFn: async (): Promise<RestaurantTable[]> => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []).map(mapRestaurantTable);
    },
    staleTime: 120_000,
  });
}

/** Table IDs already booked for a given date + time slot. */
export function useBookedTableSlots(
  date: string,
  timeSlot: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.bookedTableSlots(date, timeSlot),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('table_reservations')
        .select('table_id')
        .eq('date', date)
        .eq('time_slot', timeSlot);
      if (error) throw new Error(error.message);
      return (data || []).map((r: { table_id: string }) => r.table_id);
    },
    // Nothing to ask for until the diner has picked both halves of the slot.
    enabled: (options?.enabled ?? true) && Boolean(date && timeSlot),
    staleTime: 30_000, // refresh often — slot availability changes
  });
}

export function useAddTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (t: {
      id: string;
      tableNumber: number;
      capacity: number;
      description: string;
    }) => {
      const { error } = await supabase.from('restaurant_tables').insert([
        {
          id: t.id,
          table_number: t.tableNumber,
          capacity: t.capacity,
          description: t.description,
          is_active: true,
        },
      ]);
      if (error) {
        throw new Error(
          error.code === '23505' ? `Table ${t.tableNumber} already exists` : error.message
        );
      }
      return true;
    },
    onMutate: (t) =>
      patchList<RestaurantTable>(queryClient, queryKeys.tables, (draft) =>
        draft.some((x) => x.id === t.id)
          ? draft
          : [...draft, { ...t, isActive: true, createdAt: new Date().toISOString() }].sort(
              (a, b) => a.tableNumber - b.tableNumber
            )
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tables }),
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (t: RestaurantTable) => {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ capacity: t.capacity, description: t.description, is_active: t.isActive })
        .eq('id', t.id);
      if (error) throw new Error(error.message);
      return true;
    },
    onMutate: (t) =>
      patchList<RestaurantTable>(queryClient, queryKeys.tables, (draft) =>
        draft.map((x) => (x.id === t.id ? t : x))
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tables }),
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
      if (error) {
        // A table with bookings is referenced by table_reservations.
        throw new Error(
          error.code === '23503'
            ? 'This table still has bookings — release or complete them first'
            : error.message
        );
      }
      return true;
    },
    onMutate: (id) =>
      patchList<RestaurantTable>(queryClient, queryKeys.tables, (draft) =>
        draft.filter((x) => x.id !== id)
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tables }),
  });
}

/** Lock a table slot when a reservation is confirmed. */
export function useBookTableSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slot: {
      id: string;
      tableId: string;
      reservationId: string;
      date: string;
      timeSlot: string;
    }) => {
      const { error } = await supabase.from('table_reservations').insert([
        {
          id: slot.id,
          table_id: slot.tableId,
          reservation_id: slot.reservationId,
          date: slot.date,
          time_slot: slot.timeSlot,
        },
      ]);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allTableSlots });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
    },
  });
}

/** Free a table slot when a reservation is completed or cancelled. */
export function useReleaseTableSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const { error } = await supabase
        .from('table_reservations')
        .delete()
        .eq('reservation_id', reservationId);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allTableSlots });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
    },
  });
}
