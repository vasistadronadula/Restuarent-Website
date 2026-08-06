import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * The optimistic-update dance, written once.
 *
 * Every list mutation in this app needs the same four steps: cancel in-flight
 * refetches so a stale response can't overwrite the patch, snapshot the cache,
 * apply the change, and put the snapshot back if the write fails. RTK Query
 * bundled that into `updateQueryData(...).undo()`; TanStack leaves it to the
 * caller, and hand-rolling it per mutation is exactly how three of the old
 * `onQueryStarted` blocks ended up subtly different from each other.
 *
 * Returns the context object a mutation's `onError` needs to roll back.
 */
export async function patchList<T>(
  queryClient: QueryClient,
  key: QueryKey,
  update: (draft: T[]) => T[]
): Promise<{ previous: T[] | undefined; key: QueryKey }> {
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData<T[]>(key);
  if (previous) {
    queryClient.setQueryData<T[]>(key, update(previous));
  }
  return { previous, key };
}

/** Restores whatever `patchList` snapshotted. Safe to call with no context. */
export function rollbackList<T>(
  queryClient: QueryClient,
  context: { previous: T[] | undefined; key: QueryKey } | undefined
) {
  if (!context?.previous) return;
  queryClient.setQueryData(context.key, context.previous);
}

/**
 * Supabase's client resolves rather than throws on a failed statement, so every
 * mutation has to check `error` by hand. Throwing turns it back into something
 * `useMutation` can route to `onError`, and gives callers a real message
 * instead of RTK Query's `{ status: 'CUSTOM_ERROR' }` envelope.
 */
export function unwrap<T>(
  result: { data?: T | null; error?: { message: string; code?: string } | null },
  fallbackMessage: string,
  translateError?: (error: { message: string; code?: string }) => string
): T {
  if (result.error) {
    throw new Error(
      translateError?.(result.error) || result.error.message || fallbackMessage
    );
  }
  return result.data as T;
}
