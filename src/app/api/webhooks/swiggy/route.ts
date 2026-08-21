import { NextResponse } from 'next/server';
import { createOrderInDB } from '@/lib/db';
import { sendNewOrderPushNotification } from '@/lib/pushNotify';
import { getErrorMessage } from '@/lib/errors';
import { orderStamps } from '@/lib/orderTime';
import { log } from '@/lib/logger';
import { safeCompare } from '@/lib/webhookAuth';
import { computeBillTotals } from '@/lib/billing';
import type { VegStatus } from '@/types';

interface SwiggyWebhookItem {
  item_id?: string;
  id?: string;
  title?: string;
  name?: string;
  price?: number;
  rate?: number;
  quantity?: number;
  veg_status?: string;
}
interface SwiggyWebhookBody {
  order_id?: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  items?: SwiggyWebhookItem[];
  cart?: SwiggyWebhookItem[];
}

/**
 * Swiggy Partner Webhook API Endpoint
 * URL: <site origin>/api/webhooks/swiggy
 *
 * Receives incoming orders pushed by Swiggy's Partner API once integrated.
 * POST only — the former GET status probe was removed: it served no
 * caller and confirmed the endpoint (plus the restaurant name and exact
 * URL) to anyone scanning for it.
 *
 * Requires the `x-webhook-secret` header to match SWIGGY_WEBHOOK_SECRET.
 */

export async function POST(request: Request) {
  // Not yet integrated with Swiggy's real Partner API. Until SWIGGY_WEBHOOK_SECRET
  // is set (and shared with Swiggy so they send it back on every push), this
  // endpoint refuses every request rather than accepting arbitrary orders from
  // anyone who finds the URL.
  const configuredSecret = process.env.SWIGGY_WEBHOOK_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      { success: false, error: 'Swiggy integration is not configured yet.' },
      { status: 503 }
    );
  }
  const providedSecret = request.headers.get('x-webhook-secret') || '';
  if (!safeCompare(providedSecret, configuredSecret)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: SwiggyWebhookBody = await request.json();

    // Generate Swiggy Order ID
    const dateStamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const swiggyOrderId = body.order_id ? `SWIGGY-${body.order_id}` : `SWIGGY-ORD-${dateStamp}-${rand}`;

    const items = (body.items || body.cart || []).map((i) => ({
      menuItemId: i.item_id || i.id || 'ITEM',
      name: i.title || i.name || 'Swiggy Item',
      price: Number(i.price || i.rate) || 250,
      quantity: Number(i.quantity) || 1,
      vegStatus: (i.veg_status || 'non-veg') as VegStatus,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 450;
    // Shared with the POS/storefront bill math — inline GST multipliers here
    // would silently desync from billing.ts the next time the rate or
    // rounding rule changes there.
    const { cgst, sgst, grandTotal } = computeBillTotals(subtotal);
    const { orderDate, orderTime } = orderStamps();

    const orderPayload = {
      id: swiggyOrderId,
      orderId: swiggyOrderId,
      customerId: body.customer_email || 'SWIGGY-USER',
      customerName: body.customer_name || 'Swiggy Customer',
      customerPhone: body.customer_phone || '+91 98765 43210',
      customerAddress: body.delivery_address || 'Swiggy Delivery Pickup',
      items: items.length > 0 ? items : [
        { menuItemId: 'M-001', name: 'Hyderabadi Chicken Biryani', price: 320, quantity: 1, vegStatus: 'non-veg' as const },
        { menuItemId: 'M-002', name: 'Mirchi Ka Salan', price: 130, quantity: 1, vegStatus: 'veg' as const },
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
      orderSource: 'swiggy' as const,
    };

    await createOrderInDB(orderPayload);
    await sendNewOrderPushNotification(swiggyOrderId);

    return NextResponse.json({
      success: true,
      message: 'Swiggy order received and routed to Kitchen KDS & POS',
      orderId: swiggyOrderId,
    });
  } catch (error) {
    log.error('webhook_ingest_failed', { source: 'swiggy', error });
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 400 });
  }
}
