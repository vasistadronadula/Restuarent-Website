import { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      service: 'pala-pitta-fastify',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });
  fastify.get('/ready', async (_request, reply) => {
    if (!fastify.publicDb || !fastify.supabase) return reply.status(503).send({ status: 'not_ready' });
    const { error } = await fastify.publicDb.from('menu_items').select('id').limit(1).abortSignal(AbortSignal.timeout(3000));
    return reply.status(error ? 503 : 200).send({ status: error ? 'not_ready' : 'ready', realtime: fastify.realtimeReady });
  });
}
