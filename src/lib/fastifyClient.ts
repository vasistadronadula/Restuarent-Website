import { supabase } from '@/lib/supabase';

export const isFastifyEnabled = () => process.env.NEXT_PUBLIC_FASTIFY_ENABLED === 'true';

export function getFastifyHttpUrl(): string {
  return (process.env.NEXT_PUBLIC_FASTIFY_URL || '').replace(/\/$/, '');
}

export function getFastifyWsUrl(): string {
  if (process.env.NEXT_PUBLIC_FASTIFY_WS_URL) return process.env.NEXT_PUBLIC_FASTIFY_WS_URL;
  const url = new URL('/ws', getFastifyHttpUrl() || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'));
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export async function fastifyFetch<T>(path: string, options: RequestInit & { authenticated?: boolean } = {}): Promise<T> {
  const { authenticated = true, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Session expired. Please sign in again.');
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  const response = await fetch(`${getFastifyHttpUrl()}${path}`, {
    ...init, headers,
    signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}). Please try again.`);
  return body as T;
}

export function dispatchFastifyKot(payload: { orderId: string }) {
  return fastifyFetch('/api/kot/dispatch', { method: 'POST', body: JSON.stringify({ orderId: payload.orderId }) });
}

/** Auth travels in the first frame, never in URLs/logs. No mutations are
 * queued or replayed when offline. Reconnect only re-subscribes and refetches. */
export function connectFastifyWs(
  room: string,
  onMessage: (event: string, payload: unknown) => void,
  onOpen?: () => void,
  onClose?: () => void,
) {
  if (typeof window === 'undefined') return () => {};
  let socket: WebSocket | null = null;
  let stopped = false;
  let attempts = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let lastMessage = Date.now();

  const schedule = () => {
    if (stopped || retry) return;
    retry = setTimeout(() => { retry = undefined; void connect(); }, Math.min(30_000, 1000 * 2 ** Math.min(attempts++, 5)) + Math.random() * 500);
  };
  async function connect() {
    if (stopped || !navigator.onLine) { schedule(); return; }
    try {
      const { data } = await supabase.auth.getSession();
      if (stopped) return;
      if (!data.session) { onClose?.(); schedule(); return; }
      const current = new WebSocket(getFastifyWsUrl());
      socket = current;
      deadline = setTimeout(() => current.close(), 10_000);
      current.onopen = () => current.send(JSON.stringify({ action: 'authenticate', token: data.session!.access_token }));
      current.onmessage = ({ data: raw }) => {
        if (stopped || current !== socket) return;
        lastMessage = Date.now();
        try {
          const message = JSON.parse(raw);
          if (message.event === 'authenticated') current.send(JSON.stringify({ action: 'join', room }));
          else if (message.event === 'joined') {
            clearTimeout(deadline);
            attempts = 0;
            onOpen?.();
            onMessage('realtime:status', { ready: message.payload?.realtimeReady === true });
            heartbeat = setInterval(() => {
              if (Date.now() - lastMessage > 45_000) current.close();
              else if (current.readyState === WebSocket.OPEN) current.send(JSON.stringify({ action: 'ping' }));
            }, 20_000);
          } else if (message.event === 'pong') {
            onMessage('realtime:status', { ready: message.payload?.realtimeReady === true });
          } else if (message.event) onMessage(message.event, message.payload);
        } catch { current.close(1003, 'Invalid response'); }
      };
      current.onclose = () => {
        clearTimeout(deadline);
        clearInterval(heartbeat);
        if (current === socket) socket = null;
        if (!stopped) { onClose?.(); schedule(); }
      };
      current.onerror = () => current.close();
    } catch { onClose?.(); schedule(); }
  }
  const online = () => {
    clearTimeout(retry); retry = undefined;
    if (!socket) void connect();
  };
  window.addEventListener('online', online);
  void connect();
  return () => {
    stopped = true;
    clearTimeout(retry); clearTimeout(deadline); clearInterval(heartbeat);
    window.removeEventListener('online', online);
    // close even during CONNECTING; don't send a leave frame on an unopened socket.
    socket?.close();
  };
}
