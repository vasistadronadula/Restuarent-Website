/** HTTP contract for the Go gateway and Spring Boot backend.
 * Integrates directly with Supabase sessions when used in the frontend.
 */

export type BackendRole = 'customer' | 'admin' | 'manager' | 'chef' | 'cashier' | 'waiter';

export interface BackendIdentity {
  id: string;
  email: string;
  fullName: string;
  role: BackendRole;
}

export interface BackendSession {
  access_token: string;
  token_type: 'Bearer';
  expires_at: number;
  user: BackendIdentity;
}

export type BackendResource = 'menu_items' | 'menu_categories' | 'inventory_items'
  | 'employees' | 'restaurant_tables' | 'coupons' | 'reservations';

export interface BackendRecord extends Record<string, unknown> {
  id?: string;
  code?: string;
  version?: number;
  created_at: string;
}

export interface CheckoutInput {
  customerName: string;
  customerPhone: string;
  orderType: 'takeaway' | 'dine-in';
  tableNumber?: number;
  couponCode?: string;
  items: { menuItemId: string; quantity: number; selectedPortion?: 'single' | 'full' | 'large' }[];
}

export class BackendError extends Error {
  constructor(message: string, public readonly status: number, public readonly requestId: string | null) {
    super(message);
    this.name = 'BackendError';
  }
}

export function createBackendClient(options: {
  /** Same-origin /api/v1 behind ingress, or an explicitly configured API origin. */
  baseUrl?: string;
  getToken: () => string | null | Promise<string | null>;
  fetch?: typeof fetch;
}) {
  const base = (options.baseUrl ?? '/api/v1').replace(/\/$/, '');
  const transport = options.fetch ?? globalThis.fetch;

  async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body !== undefined) headers.set('Content-Type', 'application/json');
    if (authenticated) {
      const token = await options.getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await transport(`${base}${path}`, {
      ...init, headers, credentials: 'omit', cache: 'no-store',
      signal: init.signal ?? AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error : `Request failed (${response.status})`;
      throw new BackendError(message, response.status, response.headers.get('X-Request-ID'));
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  const resourcePath = (resource: BackendResource, id?: string) =>
    `/data/${resource}${id === undefined ? '' : `/${encodeURIComponent(id)}`}`;

  function versionHeader(version?: number): Record<string, string> {
    if (version !== undefined) {
      if (!Number.isSafeInteger(version) || version < 1) throw new Error('A valid record version is required. Refresh and try again.');
      return { 'If-Match': `"${version}"` };
    }
    return {};
  }

  return {
    auth: {
      login: (email: string, password: string) => request<BackendSession>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }, false),
      register: (email: string, password: string, fullName: string) => request<BackendSession>('/auth/register', {
        method: 'POST', body: JSON.stringify({ email, password, fullName }),
      }, false),
      me: () => request<BackendIdentity>('/auth/me'),
      logout: () => request<void>('/auth/logout', { method: 'POST' }),
    },
    data: {
      list: <T extends BackendRecord = BackendRecord>(resource: BackendResource, options: { limit?: number; offset?: number; signal?: AbortSignal } = {}) => {
        const query = new URLSearchParams({ limit: String(options.limit ?? 50), offset: String(options.offset ?? 0) });
        return request<{ data: T[]; limit: number; offset: number }>(`${resourcePath(resource)}?${query}`, { signal: options.signal });
      },
      get: <T extends BackendRecord = BackendRecord>(resource: BackendResource, id: string) => request<{ data: T }>(resourcePath(resource, id)),
      create: <T extends BackendRecord = BackendRecord>(resource: BackendResource, fields: Record<string, unknown>) =>
        request<{ data: T }>(resourcePath(resource), { method: 'POST', body: JSON.stringify(fields) }),
      update: <T extends BackendRecord = BackendRecord>(resource: BackendResource, id: string, version: number, fields: Record<string, unknown>) =>
        request<{ data: T }>(resourcePath(resource, id), { method: 'PATCH', headers: versionHeader(version), body: JSON.stringify(fields) }),
      delete: (resource: BackendResource, id: string, version?: number) =>
        request<void>(resourcePath(resource, id), { method: 'DELETE', headers: versionHeader(version) }),
    },
    orders: {
      /** Persist and reuse this key for retries of the SAME basket. */
      checkout: (basket: CheckoutInput, idempotencyKey: string) => request<{ data: BackendRecord }>('/orders/checkout', {
        method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(basket),
      }),
      list: (options: { limit?: number; offset?: number; from?: string; to?: string } = {}) => {
        const query = new URLSearchParams({ limit: String(options.limit ?? 50), offset: String(options.offset ?? 0) });
        if (options.from) query.set('from', options.from);
        if (options.to) query.set('to', options.to);
        return request<{ data: BackendRecord[] }>(`/orders?${query}`);
      },
      floor: () => request<{ data: BackendRecord[] }>('/orders/floor'),
      get: (id: string) => request<{ data: BackendRecord }>(`/orders/${encodeURIComponent(id)}`),
      updateStatus: (id: string, status: 'preparing' | 'ready' | 'delivered' | 'cancelled', version?: number) =>
        request<{ data: BackendRecord }>(`/orders/${encodeURIComponent(id)}/status`, {
          method: 'PATCH', headers: versionHeader(version), body: JSON.stringify({ status }),
        }),
      collectCash: (id: string, version?: number) => request<{ data: BackendRecord }>(`/orders/${encodeURIComponent(id)}/cash-payment`, {
        method: 'POST', headers: versionHeader(version),
      }),
      updatePrep: (id: string, delayMinutes: number, notes?: string) =>
        request<{ data: BackendRecord }>(`/orders/${encodeURIComponent(id)}/prep`, {
          method: 'PATCH', body: JSON.stringify({ delayMinutes, notes }),
        }),
    },
  };
}

let defaultClient: ReturnType<typeof createBackendClient> | null = null;

/** Returns a backend client wired to the current Supabase auth session. */
export function getBackendClient() {
  if (!defaultClient) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api/v1';
    defaultClient = createBackendClient({
      baseUrl: backendUrl,
      getToken: async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase.auth.getSession();
          return data.session?.access_token ?? null;
        } catch {
          return null;
        }
      },
    });
  }
  return defaultClient;
}
