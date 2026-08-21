import { NextResponse } from 'next/server';
import { createOrderInDB } from '@/lib/db';
import { sendNewOrderPushNotification } from '@/lib/pushNotify';
import { getErrorMessage } from '@/lib/errors';
import { orderStamps } from '@/lib/orderTime';
import { log } from '@/lib/logger';
import { safeCompare } from '@/lib/webhookAuth';
import { computeBillTotals } from '@/lib/billing';
import type { VegStatus } from '@/types';

interface ZomatoWebhookItem {
  dish_id?: string;
  id?: string;
  dish_name?: string;
  name?: string;
  price?: number;
  unit_cost?: number;
  quantity?: number;
  qty?: number;
  veg_type?: string;
}
interface ZomatoWebhookBody {
  order_id?: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  items?: ZomatoWebhookItem[];
  dishes?: ZomatoWebhookItem[];
}

/**
 * Zomato Partner Webhook API Endpoint
 * URL: <site origin>/api/webhooks/zomato
 *
 * Receives incoming orders pushed by Zomato's Partner API once integrated.
 * POST only — the former GET status probe was removed: it served no
 * caller and confirmed the endpoint (plus the restaurant name and exact
 * URL) to anyone scanning for it.
 *
 * Requires the `x-webhook-secret` header to match ZOMATO_WEBHOOK_SECRET.
 */

export async function POST(request: Request) {
  // Not yet integrated with Zomato's real Partner API. Until ZOMATO_WEBHOOK_SECRET
  // is set (and shared with Zomato so they send it back on every push), this
  // endpoint refuses every request rather than accepting arbitrary orders from
  // anyone who finds the URL.
  const configuredSecret = process.env.ZOMATO_WEBHOOK_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { success: false, error: 'Zomato integration is not configured yet.' },
      { status: 503 }
    );
  }
  const providedSecret = request.headers.get('x-webhook-secret') || '';
  if (!safeCompare(providedSecret, configuredSecret)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ZomatoWebhookBody = await request.json();

    // Generate Zomato Order ID
    const dateStamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const zomatoOrderId = body.order_id ? `ZOMATO-${body.order_id}` : `ZOMATO-ORD-${dateStamp}-${rand}`;

    const items = (body.items || body.dishes || []).map((i) => ({
      menuItemId: i.dish_id || i.id || 'ITEM',
      name: i.dish_name || i.name || 'Zomato Item',
      price: Number(i.price || i.unit_cost) || 280,
      quantity: Number(i.quantity || i.qty) || 1,
      vegStatus: (i.veg_type || 'non-veg') as VegStatus,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 480;
    // Shared with the POS/storefront bill math — see the identical fix in
    // the Swiggy webhook for why this can't be inline multipliers.
    const { cgst, sgst, grandTotal } = computeBillTotals(subtotal);
    const { orderDate, orderTime } = orderStamps();

    const orderPayload = {
      id: zomatoOrderId,
      orderId: zomatoOrderId,
      customerId: body.customer_email || 'ZOMATO-USER',
      customerName: body.customer_name || 'Zomato Customer',
      customerPhone: body.customer_phone || '+91 98765 43210',
      customerAddress: body.delivery_address || 'Zomato Rider Pickup',
      items: items.length > 0 ? items : [
        { menuItemId: 'M-003', name: 'Telangana Mutton Curry', price: 380, quantity: 1, vegStatus: 'non-veg' as const },
        { menuItemId: 'M-004', name: 'Butter Naan', price: 50, quantity: 2, vegStatus: 'veg' as const },
      ],
      subtotal,
      cgst,
      sgst,
      discount: 0,
      deliveryCharge: 0,
      grandTotal,
      status: 'pending' as const,
      paymentMode: 'online' as const,
      paymentStatus: 'paid' as const,
      orderDate,
      orderTime,
      orderSource: 'zomato' as const,
    };

    await createOrderInDB(orderPayload);
    await sendNewOrderPushNotification(zomatoOrderId);

    return NextResponse.json({
      success: true,
      message: 'Zomato order received and routed to Kitchen KDS & POS',
      orderId: zomatoOrderId,
    });
  } catch (error) {
    log.error('webhook_ingest_failed', { source: 'zomato', error });
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 400 });
  }
}
