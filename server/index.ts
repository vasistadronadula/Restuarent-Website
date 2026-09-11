import Fastify, { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import { config } from './config';
import corsPlugin from './plugins/cors';
import supabasePlugin from './plugins/supabase';
import websocketPlugin from './plugins/websocket';
import healthRoutes from './routes/health';
import wsRoutes from './routes/ws';
import orderRoutes from './routes/orders';
import authPlugin from './plugins/auth';
import realtimePlugin from './plugins/realtime';
import catalogRoutes from './routes/catalog';
import { ResourceCache } from './cache';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';

export async function buildApp(options: { logger?: boolean; realtime?: boolean; applicationRoutes?: boolean } = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: options.logger === false ? false : { level: process.env.LOG_LEVEL || 'info', redact: ['req.headers.authorization', 'req.headers.cookie'] },
    bodyLimit: 1024 * 1024,
    requestTimeout: 30_000,
    connectionTimeout: 10_000,
    keepAliveTimeout: 72_000,
    trustProxy: config.trustProxy,
    genReqId: () => randomUUID(),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: 'array' } },
  });

  // Core Utilities & Plugins
  await fastify.register(sensible);
  fastify.decorate('catalogCache', new ResourceCache());
  fastify.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
  });
  fastify.setErrorHandler((error, request, reply) => {
    const err = error as Error & { statusCode?: number; validation?: unknown };
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode <= 599 ? err.statusCode : 500;
    if (status >= 500) request.log.error({ err }, 'Request failed');
    reply.status(status).send({ error: status >= 500 ? 'Service temporarily unavailable. Please try again.' : err.message, requestId: request.id });
  });
  await fastify.register(rateLimit, { max: 240, timeWindow: '1 minute' });
  await fastify.register(compress, { threshold: 1024, encodings: ['gzip', 'deflate'] });
  await fastify.register(corsPlugin);
  await fastify.register(supabasePlugin);
  await fastify.register(authPlugin);
  await fastify.register(websocketPlugin);
  if (options.realtime !== false) await fastify.register(realtimePlugin);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(wsRoutes);
  await fastify.register(orderRoutes);
  await fastify.register(catalogRoutes);
  if (options.applicationRoutes !== false) {
    const { default: applicationRoutes } = await import('./routes/application');
    await fastify.register(applicationRoutes);
  }

  return fastify;
}

export async function start() {
  const app = await buildApp();

  try {
    const address = await app.listen({
      port: config.port,
      host: config.host,
    });
    app.log.info(`🚀 Fastify server ready and listening on ${address}`);
    app.log.info(`📡 WebSocket endpoint active at ws://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}/ws`);
  } catch (err) {
    app.log.error(err);
    await app.close();
    process.exit(1);
  }

  // Graceful shutdown
  const closeSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  let closing = false;
  for (const signal of closeSignals) {
    process.on(signal, async () => {
      if (closing) return;
      closing = true;
      const deadline = setTimeout(() => process.exit(1), 10_000);
      deadline.unref();
      app.log.info(`Received ${signal}, closing Fastify server gracefully...`);
      try {
        await app.close();
        app.log.info('Fastify server closed.');
        process.exit(0);
      } catch (closeErr) {
        app.log.error({ closeErr }, 'Error during graceful shutdown');
        process.exit(1);
      }
    });
  }
}

// Importing the app in a test or script must never bind a listening port.
if (require.main === module) {
  start().catch(error => { console.error(error); process.exitCode = 1; });
}
