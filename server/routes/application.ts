import type { FastifyInstance } from 'fastify';
import { NextRequest } from 'next/server';
import * as checkout from '../../src/app/api/orders/checkout/route';
import * as guestOrders from '../../src/app/api/guest/orders/route';
import * as phone from '../../src/app/api/auth/phone/route';
import * as profile from '../../src/app/api/auth/update-profile/route';
import * as employees from '../../src/app/api/admin/employees/route';
import * as employee from '../../src/app/api/admin/employees/[id]/route';
import * as bill from '../../src/app/api/bill/[id]/pdf/route';
import * as createPayment from '../../src/app/api/razorpay/create-order/route';
import * as verifyPayment from '../../src/app/api/razorpay/verify-payment/route';
import * as paymentStatus from '../../src/app/api/razorpay/order-status/route';
import * as upload from '../../src/app/api/upload/route';
import * as pushOrder from '../../src/app/api/push/notify-new-order/route';
import * as pushReservation from '../../src/app/api/push/notify-new-reservation/route';
import * as pushStatus from '../../src/app/api/push/notify-status-update/route';
import * as pushDelay from '../../src/app/api/push/notify-delay/route';
import * as whatsappOrder from '../../src/app/api/whatsapp/send-order-confirmation/route';
import * as whatsappStatus from '../../src/app/api/whatsapp/send-status-update/route';
import * as whatsappDelay from '../../src/app/api/whatsapp/send-delay-notification/route';

type Handler = (request: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;
type Handlers = Partial<Record<'GET' | 'POST' | 'PATCH' | 'DELETE', Handler>>;

// Execute the existing business handlers in-process, without a second HTTP
// request or Next's rendering server. Both deployments share auth, pricing,
// payment verification, PDFs, upload limits and notification rules.
export const applicationRoutes: Array<[string, Handlers]> = [
  ['/api/orders/checkout', checkout], ['/api/guest/orders', guestOrders],
  ['/api/auth/phone', phone], ['/api/auth/update-profile', profile],
  ['/api/admin/employees', employees], ['/api/admin/employees/:id', employee],
  ['/api/bill/:id/pdf', bill], ['/api/upload', upload],
  ['/api/razorpay/create-order', createPayment], ['/api/razorpay/verify-payment', verifyPayment], ['/api/razorpay/order-status', paymentStatus],
  ['/api/push/notify-new-order', pushOrder], ['/api/push/notify-new-reservation', pushReservation],
  ['/api/push/notify-status-update', pushStatus], ['/api/push/notify-delay', pushDelay],
  ['/api/whatsapp/send-order-confirmation', whatsappOrder], ['/api/whatsapp/send-status-update', whatsappStatus], ['/api/whatsapp/send-delay-notification', whatsappDelay],
];

export default async function registerApplicationRoutes(app: FastifyInstance) {
  app.addContentTypeParser(/^multipart\/form-data(?:;|$)/, { parseAs: 'buffer' }, (_request, body, done) => done(null, body));
  for (const [url, handlers] of applicationRoutes) {
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE'] as const) {
      const handle = handlers[method];
      if (!handle) continue;
      app.route<{ Params: { id: string } }>({
        method, url,
        bodyLimit: url === '/api/upload' ? 11 * 1024 * 1024 : 1024 * 1024,
        config: { rateLimit: { max: url === '/api/auth/phone' ? 20 : 120, timeWindow: '1 minute' } },
        handler: async (request, reply) => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(request.headers)) {
            if (value !== undefined && !['content-length', 'transfer-encoding', 'connection', 'x-forwarded-for', 'x-real-ip', 'x-forwarded-host'].includes(key)) {
              headers.set(key, Array.isArray(value) ? value.join(', ') : value);
            }
          }
          // Forwarded IPs are accepted only through Fastify's trustProxy config.
          headers.set('x-forwarded-for', request.ip);
          headers.set('x-real-ip', request.ip);
          const body = method === 'GET' || request.body === undefined ? undefined
            : Buffer.isBuffer(request.body) ? new Uint8Array(request.body)
            : typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
          const req = new NextRequest(new URL(request.url, `${request.protocol}://${request.host}`), { method, headers, body });
          const response = await handle(req, { params: Promise.resolve(request.params) });
          reply.code(response.status);
          response.headers.forEach((value, key) => {
            if (!['content-length', 'transfer-encoding', 'connection', 'set-cookie'].includes(key)) reply.header(key, value);
          });
          const cookies = response.headers.getSetCookie();
          if (cookies.length) reply.header('set-cookie', cookies);
          if (response.status === 204 || response.status === 304) return reply.send();
          return reply.send(Buffer.from(await response.arrayBuffer()));
        },
      });
    }
  }
}
