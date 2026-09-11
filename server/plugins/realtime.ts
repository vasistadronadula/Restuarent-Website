import fp from 'fastify-plugin';

export default fp(async function realtimePlugin(app) {
  if (!app.supabase) return;
  // One database subscription per service instance fans committed changes out
  // to all staff screens, including writes made by checkout, POS and Supabase.
  const channel = app.supabase.channel('fastify:operations');
  for (const table of ['orders', 'reservations', 'restaurant_tables', 'table_reservations', 'menu_items', 'menu_categories', 'coupons', 'inventory', 'employees']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, event => app.publishChange(table, event.eventType));
  }
  app.addHook('onReady', async () => {
    channel.subscribe(status => {
      app.realtimeReady = status === 'SUBSCRIBED';
      for (const room of ['kitchen', 'cashier', 'pos', 'tables']) {
        app.broadcastToRoom(room, { event: 'realtime:status', payload: { ready: app.realtimeReady } });
      }
    });
  });
  app.addHook('onClose', async () => { await app.supabase!.removeChannel(channel); });
});
