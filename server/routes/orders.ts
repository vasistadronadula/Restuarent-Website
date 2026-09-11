import type { FastifyInstance, FastifyRequest } from 'fastify';

const statuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
const id = { type: 'string', minLength: 1, maxLength: 100 };
const status = { type: 'string', enum: statuses };
const params = { type: 'object', required: ['id'], additionalProperties: false, properties: { id } };

export default async function orderRoutes(app: FastifyInstance) {
  const staff = async (request: FastifyRequest) => {
    await app.authenticate(request);
    if (!['admin', 'manager', 'chef', 'cashier'].includes(request.session!.role)) {
      throw app.httpErrors.forbidden('Order access is required');
    }
  };
  const saved = (data: unknown, error: { code?: string; message: string } | null) => {
    if (error) {
      app.log.warn({ code: error.code }, 'Order operation rejected');
      if (error.code === '42501') throw app.httpErrors.forbidden('You cannot change this order');
      if (error.code === 'P0001' || error.code === '23514') throw app.httpErrors.conflict(error.message);
      throw app.httpErrors.serviceUnavailable('Order could not be saved. Refresh and try again.');
    }
    if (!data) throw app.httpErrors.conflict('Order changed on another screen. Refresh and try again.');
    app.publishChange('orders', 'UPDATE');
    return data;
  };

  app.get<{ Querystring: { mine?: boolean } }>('/api/orders', {
    onRequest: app.authenticate,
    schema: { querystring: { type: 'object', additionalProperties: false, properties: { mine: { type: 'boolean' } } } },
  }, async request => {
    const { db, role, userId } = request.session!;
    const mine = request.query.mine || role === 'customer';
    if (!mine && role === 'waiter') throw app.httpErrors.forbidden('Use the floor view');
    let query = db.from('orders').select('*').order('created_at', { ascending: false }).order('id').limit(mine ? 200 : 1000);
    if (mine) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw app.httpErrors.serviceUnavailable('Orders are temporarily unavailable');
    return data || [];
  });

  app.get('/api/orders/floor', { onRequest: app.authenticate }, async request => {
    if (!['admin', 'manager', 'waiter', 'cashier'].includes(request.session!.role)) throw app.httpErrors.forbidden();
    const { data, error } = await request.session!.db.rpc('get_floor_orders');
    if (error) throw app.httpErrors.serviceUnavailable('Floor orders are temporarily unavailable');
    return data || [];
  });

  app.patch<{ Params: { id: string }; Body: { status: string; expectedStatus: string } }>('/api/orders/:id/status', {
    onRequest: staff,
    schema: { params, body: { type: 'object', required: ['status', 'expectedStatus'], additionalProperties: false, properties: { status, expectedStatus: status } } },
  }, async request => {
    const { data, error } = await request.session!.db.from('orders')
      .update({ status: request.body.status }).eq('id', request.params.id).eq('status', request.body.expectedStatus).select('*').maybeSingle();
    return saved(data, error);
  });

  app.patch<{ Params: { id: string }; Body: { delayMinutes: number; notes?: string; expected?: { status: string; notes?: string; delayMinutes: number } } }>('/api/orders/:id/prep', {
    onRequest: staff,
    schema: { params, body: {
      type: 'object', additionalProperties: false, required: ['delayMinutes'], properties: {
        delayMinutes: { type: 'integer', minimum: 0, maximum: 1440 }, notes: { type: 'string', maxLength: 2000 },
        expected: { type: 'object', additionalProperties: false, required: ['status', 'delayMinutes'], properties: {
          status, notes: { type: 'string', maxLength: 2000 }, delayMinutes: { type: 'integer', minimum: 0, maximum: 1440 },
        } },
      },
    } },
  }, async request => {
    const { delayMinutes, notes, expected } = request.body;
    let query = request.session!.db.from('orders').update({ delay_minutes: delayMinutes, ...(notes !== undefined ? { notes } : {}) }).eq('id', request.params.id);
    if (expected) {
      query = query.eq('status', expected.status);
      query = expected.notes ? query.eq('notes', expected.notes) : query.or('notes.is.null,notes.eq.');
      query = expected.delayMinutes === 0 ? query.or('delay_minutes.is.null,delay_minutes.eq.0') : query.eq('delay_minutes', expected.delayMinutes);
    }
    const { data, error } = await query.select('*').maybeSingle();
    return saved(data, error);
  });

  app.post<{ Body: { orderId: string; index: number; expectedItem: object; itemKey: string; prepared: boolean } }>('/api/kitchen/items', {
    onRequest: staff,
    schema: { body: { type: 'object', additionalProperties: false, required: ['orderId', 'index', 'expectedItem', 'itemKey', 'prepared'], properties: {
      orderId: id, index: { type: 'integer', minimum: 0, maximum: 499 }, expectedItem: { type: 'object', additionalProperties: true },
      itemKey: { type: 'string', minLength: 1, maxLength: 1000 }, prepared: { type: 'boolean' },
    } } },
  }, async request => {
    const body = request.body;
    const { data, error } = await request.session!.db.rpc('set_kitchen_item_prepared', {
      p_order_id: body.orderId, p_item_index: body.index, p_expected_item: body.expectedItem, p_item_key: body.itemKey, p_prepared: body.prepared,
    });
    return saved(data?.[0], error);
  });

  app.post<{ Body: { orderId: string } }>('/api/kot/dispatch', {
    onRequest: staff,
    schema: { body: { type: 'object', required: ['orderId'], additionalProperties: false, properties: { orderId: id } } },
  }, async request => {
    // A KOT refers to an already committed order; arbitrary client-supplied
    // items and customer details must never become a kitchen ticket.
    const { data, error } = await request.session!.db.from('orders').select('id').eq('id', request.body.orderId).maybeSingle();
    if (error) throw app.httpErrors.serviceUnavailable('Could not read the order');
    if (!data) throw app.httpErrors.notFound('Order not found');
    app.publishChange('orders', 'UPDATE');
    return { success: true, orderId: data.id };
  });
}
