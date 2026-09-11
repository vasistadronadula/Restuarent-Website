import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import type { UserRole } from '../../src/types';

export const roomsForRole = (role: UserRole): string[] => {
  switch (role) {
    case 'admin': case 'manager': return ['kitchen', 'cashier', 'pos', 'tables'];
    case 'chef': return ['kitchen'];
    case 'cashier': return ['cashier', 'pos'];
    case 'waiter': return ['tables'];
    default: return [];
  }
};

export interface WsClientMeta {
  socket: WebSocket;
  rooms: Set<string>;
  alive: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    wsClients: Map<string, WsClientMeta>;
    broadcastToRoom: (room: string, data: { event: string; payload: unknown }) => void;
    publishChange: (table: string, eventType: string) => void;
    realtimeReady: boolean;
  }
}

export default fp(async function websocketPlugin(app) {
  await app.register(websocket, { options: { maxPayload: 16 * 1024, perMessageDeflate: false } });
  const clients = new Map<string, WsClientMeta>();
  app.decorate('wsClients', clients);
  app.decorate('realtimeReady', false);

  app.decorate('broadcastToRoom', (room: string, data: { event: string; payload: unknown }) => {
    const message = JSON.stringify(data);
    for (const client of clients.values()) {
      if (!client.rooms.has(room) || client.socket.readyState !== 1) continue;
      // A suspended tablet cannot hold unbounded copies of the event stream.
      if (client.socket.bufferedAmount > 64 * 1024) { client.socket.close(1013, 'Reconnect to refresh'); continue; }
      client.socket.send(message, error => { if (error) client.socket.terminate(); });
    }
  });
  app.decorate('publishChange', (table: string, eventType: string) => {
    if (table === 'menu_items' || table === 'menu_categories') app.catalogCache.clear();
    // Invalidation only: customer identity and payment data never enter the
    // shared stream. Each client re-reads through its own RLS-scoped session.
    for (const room of ['kitchen', 'cashier', 'pos', 'tables']) {
      app.broadcastToRoom(room, { event: 'db:change', payload: { table, eventType } });
    }
  });

  const heartbeat = setInterval(() => {
    for (const client of clients.values()) {
      if (!client.alive) { client.socket.terminate(); continue; }
      client.alive = false;
      client.socket.ping();
    }
  }, 30_000);
  heartbeat.unref();
  app.addHook('preClose', async () => {
    clearInterval(heartbeat);
    for (const client of clients.values()) client.socket.close(1001, 'Server restarting');
    // Do not let half-open sockets prevent a deploy from shutting down.
    for (const socket of app.websocketServer.clients) socket.terminate();
    clients.clear();
  });
});
