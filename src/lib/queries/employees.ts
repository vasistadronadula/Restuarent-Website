'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Employee, StaffRole } from '@/types';
import { queryKeys } from './keys';
import { mapEmployee } from './mappers';
import { patchList, rollbackList } from './optimistic';

export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees,
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });
      // Same reasoning as inventory: an RLS or network failure must not render
      // as an empty team.
      if (error) throw new Error(error.message);
      return (data || []).map(mapEmployee);
    },
    staleTime: 300_000,
  });
}

/**
 * Employee create/update/delete are the only writes in this app that can't go
 * straight to `supabase.from(...)` under RLS — creating a login requires the
 * service-role key, which only exists server-side. These call the
 * /api/admin/employees route(s) instead, forwarding the current session's
 * access token so the server can verify the caller is actually an admin
 * (see src/lib/auth/requireAdmin.ts).
 */
async function callEmployeeApi(
  path: string,
  init: { method: string; body?: unknown }
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(path, {
    method: init.method,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${session.access_token}`,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Employee request failed');
}

export interface AddEmployeeInput {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  shift?: string;
  salary?: number;
  password: string;
}

export function useAddEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddEmployeeInput) =>
      callEmployeeApi('/api/admin/employees', { method: 'POST', body: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees }),
  });
}

export type UpdateEmployeeInput = { id: string } & Partial<{
  name: string;
  phone: string;
  role: StaffRole;
  shift: string;
  salary: number;
  status: 'Active' | 'Inactive';
  password: string;
}>;

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...rest }: UpdateEmployeeInput) =>
      callEmployeeApi(`/api/admin/employees/${id}`, { method: 'PATCH', body: rest }),
    // The Active/Inactive switch runs through here, so it has to move the
    // moment it's tapped rather than after a round trip to the API route and a
    // refetch of the whole team.
    onMutate: ({ id, ...rest }) =>
      patchList<Employee>(queryClient, queryKeys.employees, (draft) =>
        draft.map((emp) => {
          if (emp.id !== id) return emp;
          const next = { ...emp };
          if (rest.name !== undefined) next.name = rest.name;
          if (rest.phone !== undefined) next.phone = rest.phone;
          if (rest.role !== undefined) next.role = rest.role;
          // Shift is a free-text field on the wire but a fixed set on the
          // Employee model; only patch a value the model recognises and let
          // the refetch reconcile anything unexpected.
          if (rest.shift === 'morning' || rest.shift === 'evening' || rest.shift === 'night') {
            next.shift = rest.shift;
          }
          if (rest.salary !== undefined) next.salary = rest.salary;
          if (rest.status !== undefined) next.isActive = rest.status === 'Active';
          return next;
        })
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      callEmployeeApi(`/api/admin/employees/${id}`, { method: 'DELETE' }),
    onMutate: (id) =>
      patchList<Employee>(queryClient, queryKeys.employees, (draft) =>
        draft.filter((e) => e.id !== id)
      ),
    onError: (_err, _vars, context) => rollbackList(queryClient, context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.employees }),
  });
}
