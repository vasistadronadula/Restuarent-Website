import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { config } from '../config';

export default fp(async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) {
        cb(null, true);
        return;
      }

      if (config.corsOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(Object.assign(new Error('Origin is not allowed'), { statusCode: 403 }), false);
      }
    },
    credentials: false,
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
});
