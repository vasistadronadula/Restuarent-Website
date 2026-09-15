import 'server-only';
import { z } from 'zod';
import { ApiAuthError, requireStaff } from '@/lib/auth/apiAuth';
import { rateLimit } from '@/lib/auth/rateLimit';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const base = z.object({ orderId: z.string().trim().min(1).max(80) });
const statusInput = base.extend({ newStatus: z.enum(['preparing', 'ready', 'delivered']) });
// Reasons are rendered into WhatsApp markdown (_italic_) and push bodies.
// Strip formatting characters and cap length at the choke point so neither
// channel can carry injected markup or phishing text.
const cleanReason = (value: string) =>
  value.replace(/[*_~`#>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
const delayInput = base.extend({
  extraMinutes: z.number().int().min(1).max(1440),
  reason: z.string().trim().max(500).transform(cleanReason).pipe(z.string().max(140)).optional(),
});

/** A delayed request must not announce an old stage, and staff notifications
 * must describe a saved change rather than arbitrary client-supplied content. */
export async function prepareOrderNotification(request: Request, kind: 'status' | 'delay', channel: 'push' | 'whatsapp') {
  const { user, role } = await requireStaff(request);
  const roles = kind === 'delay' ? ['admin', 'manager', 'chef'] : ['admin', 'manager', 'chef', 'cashier'];
  if (!roles.includes(role)) throw new ApiAuthError('Order management privileges required.', 403);
  if (!rateLimit(`notify:${channel}:${kind}:user:${user.id}`, 60, 60_000).allowed) throw new ApiAuthError('Too many notifications.', 429);
  const body = await request.json().catch(() => null);
  const parsed = (kind === 'status' ? statusInput : delayInput).safeParse(body);
  if (!parsed.success) throw new ApiAuthError('Invalid notification details.', 400);
  const input = parsed.data;
  const admin = getSupabaseAdmin();
  if (!admin) throw new ApiAuthError('Notifications are unavailable.', 503);
  const { data: order, error } = await admin.from('orders')
    .select('id,status,customer_name,customer_phone,order_type,table_number,items,delay_minutes,notes')
    .eq('id', input.orderId).maybeSingle();
  if (error) throw new ApiAuthError('Could not verify the saved order.', 503);
  if (!order) throw new ApiAuthError('Order not found.', 404);

  const newStatus = 'newStatus' in input ? input.newStatus : undefined;
  const extraMinutes = 'extraMinutes' in input ? input.extraMinutes : undefined;
  const reason = 'reason' in input ? input.reason : undefined;
  if (newStatus && order.status !== newStatus) throw new ApiAuthError('Order status has changed; notification skipped.', 409);
  if (extraMinutes !== undefined && (!['pending', 'preparing', 'ready'].includes(order.status)
      || !Number.isFinite(Number(order.delay_minutes)) || Number(order.delay_minutes) < extraMinutes
      || (reason && !(typeof order.notes === 'string' && cleanReason(order.notes).includes(reason))))) {
    throw new ApiAuthError('Delay does not match the saved order.', 409);
  }
  const version = newStatus || `${order.delay_minutes}:${order.notes || ''}`;
  const allowed = rateLimit(`notify:${channel}:${kind}:order:${order.id}:${version}`, 1, 60_000).allowed;
  return { order, newStatus, extraMinutes, reason, allowed };
}
