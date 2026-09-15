import type { SupabaseClient } from '@supabase/supabase-js';

export interface TenantContext {
  tenant_id: string | null;
  restaurant_id: string | null;
  branch_id: string | null;
}

let cachedContext: TenantContext | null = null;
let cachedAt = 0;
/** Tenant resolution is re-done every few minutes so one instance's first
 * request can never pin the scope for all later tenants indefinitely. */
const TENANT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Returns tenant, restaurant, and branch identifiers when multi-tenant
 * columns are in use. Single-restaurant deployments have no `branches`
 * table and no tenant env vars — in that case every field is null and
 * callers must omit tenant columns from inserts rather than writing
 * placeholder UUIDs that mean nothing.
 */
export async function getTenantContext(client?: SupabaseClient | null): Promise<TenantContext> {
  if (cachedContext && Date.now() - cachedAt < TENANT_CACHE_TTL_MS) return cachedContext;

  if (process.env.DEFAULT_TENANT_ID || process.env.DEFAULT_RESTAURANT_ID || process.env.DEFAULT_BRANCH_ID) {
    cachedContext = {
      tenant_id: process.env.DEFAULT_TENANT_ID || null,
      restaurant_id: process.env.DEFAULT_RESTAURANT_ID || null,
      branch_id: process.env.DEFAULT_BRANCH_ID || null,
    };
    cachedAt = Date.now();
    return cachedContext;
  }

  if (client) {
    try {
      const { data, error } = await client
        .from('branches')
        .select('tenant_id, restaurant_id, id')
        .eq('is_default', true)
        .maybeSingle();

      if (!error && data?.tenant_id && data?.restaurant_id && data?.id) {
        cachedContext = {
          tenant_id: data.tenant_id,
          restaurant_id: data.restaurant_id,
          branch_id: data.id,
        };
        cachedAt = Date.now();
        return cachedContext;
      }
    } catch {
      // No branches table (single-restaurant schema) — fall through to nulls.
    }
  }

  cachedContext = { tenant_id: null, restaurant_id: null, branch_id: null };
  cachedAt = Date.now();
  return cachedContext;
}

/** Strip null/undefined tenant fields so inserts work with or without the
 * optional multi-tenant columns (missing columns raise 42703). */
export function tenantInsertFields(ctx: TenantContext): Record<string, string> {
  const fields: Record<string, string> = {};
  if (ctx.tenant_id) fields.tenant_id = ctx.tenant_id;
  if (ctx.restaurant_id) fields.restaurant_id = ctx.restaurant_id;
  if (ctx.branch_id) fields.branch_id = ctx.branch_id;
  return fields;
}
