import 'server-only';

/**
 * whatsapp.ts — WhatsApp Cloud API v25.0 integration.
 *
 * Server-only module that sends messages via the Meta Business API.
 * The access token is read from env and never exposed to the client.
 *
 * All public functions are fire-and-forget safe: they log errors and
 * return false rather than throwing, so an API failure never blocks a
 * checkout or KDS status-update flow.
 */

const GRAPH_API_VERSION = 'v25.0';

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return null;
  }

  return { phoneNumberId, accessToken };
}

/**
 * Normalize an Indian phone number to the WhatsApp-required format:
 * - Strips spaces, dashes, parentheses
 * - Ensures it starts with country code `91`
 * - Returns `null` if the number is clearly invalid
 */
export function normalizePhoneForWhatsApp(phone: string | undefined | null): string | null {
  if (!phone) return null;

  // Strip everything except digits and leading +
  let cleaned = phone.replace(/[^+\d]/g, '');

  // Remove leading +
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);

  // If it starts with 0, assume Indian local — replace with 91
  if (cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1);

  // If it's a 10-digit Indian number, prepend 91
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }

  // Sanity: must be 12 digits for Indian numbers
  if (cleaned.length < 10 || cleaned.length > 15) return null;

  return cleaned;
}

/* ------------------------------------------------------------------ */
/*  Low-level send                                                      */
/* ------------------------------------------------------------------ */

interface WhatsAppApiResponse {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * Send a plain text message to a WhatsApp number.
 * Returns the message ID on success, or null on failure.
 */
export async function sendTextMessage(
  to: string,
  body: string
): Promise<string | null> {
  const config = getConfig();
  if (!config) {
    console.warn('[WhatsApp] Not configured — WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN missing');
    return null;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });

    const data: WhatsAppApiResponse = await res.json();

    if (!res.ok || data.error) {
      console.error('[WhatsApp] API error:', data.error?.message || res.statusText);
      return null;
    }

    const messageId = data.messages?.[0]?.id || null;
    if (messageId) {
      console.log(`[WhatsApp] Message sent to ${to}: ${messageId}`);
    }
    return messageId;
  } catch (err) {
    console.error('[WhatsApp] Network error:', (err as Error).message);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Order confirmation bill                                             */
/* ------------------------------------------------------------------ */

interface OrderForWhatsApp {
  id: string;
  customerName: string;
  customerPhone?: string;
  orderType?: string;
  tableNumber?: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    selectedPortion?: string;
  }>;
  subtotal: number;
  cgst: number;
  sgst: number;
  discount?: number;
  grandTotal: number;
  paymentMode: string;
  paymentStatus: string;
  orderDate?: string;
  orderTime?: string;
}

function formatCurrencyWA(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

/**
 * Send a formatted order confirmation + bill receipt via WhatsApp.
 */
export async function sendOrderConfirmation(order: OrderForWhatsApp): Promise<boolean> {
  const phone = normalizePhoneForWhatsApp(order.customerPhone);
  if (!phone) {
    console.warn(`[WhatsApp] Cannot send order confirmation — invalid phone for order ${order.id}`);
    return false;
  }

  const tokenNum = order.id.slice(-4);
  const orderType = (order.orderType || 'takeaway').charAt(0).toUpperCase() +
                    (order.orderType || 'takeaway').slice(1);

  // Build items list
  const itemLines = order.items.map((item) => {
    const portion = item.selectedPortion ? ` (${item.selectedPortion})` : '';
    const lineTotal = item.price * item.quantity;
    return `🍛 ${item.quantity}× ${item.name}${portion} — ${formatCurrencyWA(lineTotal)}`;
  }).join('\n');

  const paymentLabel = order.paymentStatus === 'paid' ? '✅ Paid Online' : '💵 Pay at Counter';

  const message = [
    `🧾 *Order Confirmed — Pala Pitta Ruchulu*`,
    ``,
    `📋 *Order:* #${tokenNum} (${order.id})`,
    `👤 *Customer:* ${order.customerName}`,
    `📦 *Type:* ${orderType}`,
    order.tableNumber ? `🪑 *Table:* #${order.tableNumber}` : null,
    `📅 ${order.orderDate || 'Today'} at ${order.orderTime || ''}`,
    ``,
    `━━━━━━━━━━━━━━━━`,
    itemLines,
    `━━━━━━━━━━━━━━━━`,
    `   Subtotal: ${formatCurrencyWA(order.subtotal)}`,
    `   CGST (2.5%): ${formatCurrencyWA(order.cgst)}`,
    `   SGST (2.5%): ${formatCurrencyWA(order.sgst)}`,
    order.discount ? `   Discount: -${formatCurrencyWA(order.discount)}` : null,
    `   *Grand Total: ${formatCurrencyWA(order.grandTotal)}*`,
    `━━━━━━━━━━━━━━━━`,
    ``,
    `💰 Payment: ${paymentLabel}`,
    `⏱ Your food is being prepared fresh!`,
    ``,
    `Track your order live 👇`,
    `🔗 https://pala-pitta-ruchulu.vercel.app/orders`,
    ``,
    `Thank you for choosing Pala Pitta Ruchulu! 🙏`,
  ].filter(Boolean).join('\n');

  const result = await sendTextMessage(phone, message);
  return result !== null;
}

/* ------------------------------------------------------------------ */
/*  Order status update                                                 */
/* ------------------------------------------------------------------ */

const STATUS_MESSAGES: Record<string, { emoji: string; title: string; desc: string }> = {
  preparing: {
    emoji: '🔥',
    title: 'Cooking on Stove!',
    desc: 'Our chef has started cooking your food fresh on the stove. Delicious flavours coming your way!',
  },
  ready: {
    emoji: '🍲',
    title: 'Food Ready for Pickup!',
    desc: 'Your food is hot, fresh & packed! Please come to the takeaway counter to collect your order.',
  },
  delivered: {
    emoji: '✅',
    title: 'Order Completed!',
    desc: 'Your order has been handed over. Thank you for dining with Pala Pitta Ruchulu — enjoy your meal! 🎉',
  },
};

/**
 * Send a status update message to the customer via WhatsApp.
 */
export async function sendOrderStatusUpdate(
  orderId: string,
  customerPhone: string | undefined,
  customerName: string,
  newStatus: string,
): Promise<boolean> {
  const phone = normalizePhoneForWhatsApp(customerPhone);
  if (!phone) {
    console.warn(`[WhatsApp] Cannot send status update — invalid phone for order ${orderId}`);
    return false;
  }

  const statusInfo = STATUS_MESSAGES[newStatus];
  if (!statusInfo) {
    // We only send for preparing, ready, delivered — not for pending/cancelled
    return false;
  }

  const tokenNum = orderId.slice(-4);

  const message = [
    `${statusInfo.emoji} *${statusInfo.title}*`,
    ``,
    `📋 Order #${tokenNum}`,
    `👤 ${customerName}`,
    ``,
    statusInfo.desc,
    ``,
    `Track live 👇`,
    `🔗 https://pala-pitta-ruchulu.vercel.app/orders`,
    ``,
    `— Pala Pitta Ruchulu 🍽️`,
  ].join('\n');

  const result = await sendTextMessage(phone, message);
  return result !== null;
}
