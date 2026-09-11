import type { SupabaseClient } from '@supabase/supabase-js';

export interface TenantContext {
  tenant_id: string;
  restaurant_id: string;
  branch_id: string;
}

// Fallback values mapped to the active restaurant tenant in Supabase
const FALLBACK_TENANT_CONTEXT: TenantContext = {
  tenant_id: process.env.DEFAULT_TENANT_ID || '25bc0d8a-ed2f-44bc-8de2-05c33847485b',
  restaurant_id: process.env.DEFAULT_RESTAURANT_ID || '8901efda-729f-4b74-bb2a-2d4573e0a3b3',
  branch_id: process.env.DEFAULT_BRANCH_ID || '7a7a8a63-a148-4a67-9633-6c74adaddbc3',
};

let cachedContext: TenantContext | null = null;

/**
 * Returns tenant, restaurant, and branch identifiers required by the multi-tenant database.
 */
export async function getTenantContext(client?: SupabaseClient | null): Promise<TenantContext> {
  if (cachedContext) return cachedContext;

  if (process.env.DEFAULT_TENANT_ID && process.env.DEFAULT_RESTAURANT_ID && process.env.DEFAULT_BRANCH_ID) {
    cachedContext = {
      tenant_id: process.env.DEFAULT_TENANT_ID,
      restaurant_id: process.env.DEFAULT_RESTAURANT_ID,
      branch_id: process.env.DEFAULT_BRANCH_ID,
    };
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
        return cachedContext;
      }
    } catch {
      // Degrade gracefully to fallback
    }
  }

  return FALLBACK_TENANT_CONTEXT;
}
