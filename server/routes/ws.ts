import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { roomsForRole } from '../plugins/websocket';
import type { Session } from '../plugins/auth';
import { config } from '../config';

export default async function wsRoutes(app: FastifyInstance) {
  app.get('/ws', {
    websocket: true,
    onRequest: async request => {
      const origin = request.headers.origin;
      if (origin && !config.corsOrigins.includes(origin)) throw app.httpErrors.forbidden('Origin is not allowed');
      if (app.websocketServer.clients.size >= 1000) throw app.httpErrors.serviceUnavailable('Connection limit reached');
    },
  }, (socket) => {
    const clientId = randomUUID();
    let session: Session | null = null;
    let token = '';
    let authenticating = false;
    let closed = false;
    let refreshing = false;
    let messages = 0;
    let windowStart = Date.now();
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let revalidate: ReturnType<typeof setInterval> | undefined;
    const authTimeout = setTimeout(() => socket.close(4401, 'Authentication required'), 5_000);
    const send = (event: string, payload: unknown) => {
      if (socket.readyState === 1) socket.send(JSON.stringify({ event, payload }));
    };
    const cleanup = () => {
      closed = true;
      clearTimeout(authTimeout);
      clearTimeout(expiry);
      clearInterval(revalidate);
      app.wsClients.delete(clientId);
    };
    socket.on('close', cleanup);
    socket.on('error', cleanup);
    socket.on('pong', () => { const client = app.wsClients.get(clientId); if (client) client.alive = true; });
    // Attach the handler synchronously, before any asynchronous auth work.
    socket.on('message', async raw => {
      if (Date.now() - windowStart >= 10_000) { messages = 0; windowStart = Date.now(); }
      if (++messages > 30) { socket.close(4429, 'Too many messages'); return; }
      try {
        const message = JSON.parse(raw.toString());
        if (!message || typeof message !== 'object') throw new Error('Invalid message');
        if (!session) {
          if (authenticating || message.action !== 'authenticate' || typeof message.token !== 'string') {
            socket.close(4401, 'Authenticate first'); return;
          }
          authenticating = true;
          token = message.token;
          const verified = await app.verifySession(token);
          if (closed || socket.readyState !== 1) return;
          const allowed = roomsForRole(verified.role);
          if (!allowed.length) { socket.close(4403, 'Staff access required'); return; }
          session = verified;
          clearTimeout(authTimeout);
          app.wsClients.set(clientId, { socket, rooms: new Set(), alive: true });
          expiry = setTimeout(() => socket.close(4401, 'Session expired'), Math.min(verified.expiresAt - Date.now(), 2_147_483_647));
          revalidate = setInterval(async () => {
            if (refreshing || closed) return;
            refreshing = true;
            try {
              const current = await app.verifySession(token);
              if (current.role !== session?.role) socket.close(4403, 'Permissions changed');
            } catch { socket.close(4401, 'Session expired'); }
            finally { refreshing = false; }
          }, 60_000);
          send('authenticated', { rooms: allowed });
          return;
        }
        if (message.action === 'join') {
          if (!roomsForRole(session.role).includes(message.room)) { send('error', { message: 'Room access denied' }); return; }
          // One room per connection avoids duplicate notifications.
          app.wsClients.get(clientId)!.rooms = new Set([message.room]);
          send('joined', { room: message.room, realtimeReady: app.realtimeReady });
        } else if (message.action === 'ping') {
          send('pong', { realtimeReady: app.realtimeReady });
        } else if (message.action === 'leave') {
          app.wsClients.get(clientId)?.rooms.delete(message.room);
        } else {
          send('error', { message: 'Unsupported action' });
        }
      } catch {
        if (!session) socket.close(4401, 'Invalid session');
        else send('error', { message: 'Invalid message' });
      }
    });
  });
}
