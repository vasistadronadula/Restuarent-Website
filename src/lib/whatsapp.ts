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
/*  Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

function formatCurrencyWA(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr?: string): string {
  if (!timeStr) {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return timeStr;
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

/**
 * Send a formatted order confirmation + bill receipt via WhatsApp.
 * Production-quality message with brand identity, full bill breakdown,
 * and a clear call-to-action.
 */
export async function sendOrderConfirmation(order: OrderForWhatsApp): Promise<boolean> {
  const phone = normalizePhoneForWhatsApp(order.customerPhone);
  if (!phone) {
    console.warn(`[WhatsApp] Cannot send order confirmation — invalid phone for order ${order.id}`);
    return false;
  }

  const tokenNum = order.id.slice(-4).toUpperCase();
  const firstName = (order.customerName || 'Guest').split(' ')[0];
  const orderTypeLabel = (() => {
    const t = (order.orderType || 'takeaway').toLowerCase();
    if (t.includes('dine')) return 'Dine-in 🪑';
    if (t.includes('take') || t.includes('pick') || t.includes('counter')) return 'Takeaway 🥡';
    return order.orderType || 'Takeaway 🥡';
  })();

  // Build items list — max width friendly, quantity pill, portion label
  const itemLines = order.items.map((item) => {
    const portion = item.selectedPortion ? ` (${item.selectedPortion})` : '';
    const lineTotal = item.price * item.quantity;
    return `  • ${item.quantity}× ${item.name}${portion}\n      ${formatCurrencyWA(item.price)} × ${item.quantity} = *${formatCurrencyWA(lineTotal)}*`;
  }).join('\n');

  const hasDiscount = (order.discount ?? 0) > 0;
  const paymentBadge = order.paymentStatus === 'paid' ? '✅ *Paid Online*' : '💵 *Pay at Counter*';
  const paymentModeLabel = order.paymentMode === 'online' ? 'Online / UPI' : order.paymentMode === 'card' ? 'Card' : 'Cash';

  const message = [
    `🍽️ *Pala Pitta Ruchulu — Order Confirmed!*`,
    ``,
    `Namaste ${firstName} 🙏 Your order has been received and is in our kitchen queue.`,
    ``,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    `🎫 *Token:* #${tokenNum}`,
    `📦 *Type:* ${orderTypeLabel}`,
    order.tableNumber ? `🪑 *Table:* No. ${order.tableNumber}` : null,
    `📅 *Date:* ${formatDate(order.orderDate)} at ${formatTime(order.orderTime)}`,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    ``,
    `*🧾 Your Items*`,
    itemLines,
    ``,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    `  Subtotal         ${formatCurrencyWA(order.subtotal)}`,
    `  CGST (2.5%)      ${formatCurrencyWA(order.cgst)}`,
    `  SGST (2.5%)      ${formatCurrencyWA(order.sgst)}`,
    hasDiscount ? `  Discount         -${formatCurrencyWA(order.discount!)}` : null,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    `  *TOTAL         ${formatCurrencyWA(order.grandTotal)}*`,
    ``,
    `💳 *Payment:* ${paymentBadge}`,
    `   Mode: ${paymentModeLabel}`,
    ``,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    `⏱️ *Estimated Prep:* 15–25 minutes`,
    `📍 Collect from our counter when ready`,
    ``,
    `Track your order live:`,
    `👉 https://pala-pitta-ruchulu.vercel.app/orders`,
    ``,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    `🌶️ *Pala Pitta Ruchulu* — Authentic Telugu & South Indian Cuisine`,
    `📞 Need help? Reply to this message`,
    ``,
    `_Hyderabad's most-loved flavours, made fresh for you!_ 🤍`,
  ].filter((l) => l !== null).join('\n');

  const result = await sendTextMessage(phone, message);
  return result !== null;
}

/* ------------------------------------------------------------------ */
/*  Order status update                                                 */
/* ------------------------------------------------------------------ */

interface StatusConfig {
  emoji: string;
  headline: string;
  body: string;
  eta?: string;
  cta?: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  preparing: {
    emoji: '🔥',
    headline: 'Your food is cooking!',
    body: `Our chef has started preparing your order fresh on the stove. Every dish is made to order — your patience makes it perfect!`,
    eta: '15–20 minutes',
    cta: `We'll ping you the moment it's ready 🤞`,
  },
  ready: {
    emoji: '✅',
    headline: 'Order Ready — Come & Get It!',
    body: `Your food is piping hot, freshly packed, and waiting for you at our counter. Please collect within 10 minutes for the best taste!`,
    cta: '🏃 Head to the counter now — your food is getting impatient!',
  },
  delivered: {
    emoji: '🎉',
    headline: 'Order Complete — Enjoy Your Meal!',
    body: `Your order has been successfully handed over. We hope every bite is as good as we intended!`,
    cta: `Rate us on Google or share your experience with friends 💛`,
  },
};

/**
 * Send a rich status update message to the customer via WhatsApp.
 * Each stage has a distinct tone: urgency builds from preparing → ready → done.
 */
export async function sendOrderStatusUpdate(
  orderId: string,
  customerPhone: string | undefined,
  customerName: string,
  newStatus: string,
  extra?: { orderType?: string; tableNumber?: number; itemCount?: number }
): Promise<boolean> {
  const phone = normalizePhoneForWhatsApp(customerPhone);
  if (!phone) {
    console.warn(`[WhatsApp] Cannot send status update — invalid phone for order ${orderId}`);
    return false;
  }

  const cfg = STATUS_CONFIGS[newStatus];
  if (!cfg) {
    // Only notify for preparing, ready, delivered
    return false;
  }

  const tokenNum = orderId.slice(-4).toUpperCase();
  const firstName = (customerName || 'Guest').split(' ')[0];
  const orderTypeLabel = (() => {
    const t = ((extra?.orderType) || 'takeaway').toLowerCase();
    if (t.includes('dine')) return 'Dine-in';
    if (t.includes('take') || t.includes('pick') || t.includes('counter')) return 'Takeaway';
    return extra?.orderType || 'Takeaway';
  })();

  const lines: (string | null)[] = [
    `${cfg.emoji} *${cfg.headline}*`,
    ``,
    `Hi ${firstName}! Here's your live update:`,
    ``,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    `🎫 Token: *#${tokenNum}*`,
    `📦 Type: ${orderTypeLabel}`,
    extra?.tableNumber ? `🪑 Table: No. ${extra.tableNumber}` : null,
    extra?.itemCount ? `🍱 Items: ${extra.itemCount}` : null,
    `🔔 Status: *${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}*`,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    ``,
    cfg.body,
    ``,
    cfg.eta ? `⏳ *ETA:* ${cfg.eta}` : null,
    cfg.cta ? cfg.cta : null,
    ``,
    `Track live: 👉 https://pala-pitta-ruchulu.vercel.app/orders`,
    ``,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    `🌶️ *Pala Pitta Ruchulu* — Authentic South Indian Cuisine`,
  ];

  const message = lines.filter((l) => l !== null).join('\n');
  const result = await sendTextMessage(phone, message);
  return result !== null;
}

/* ------------------------------------------------------------------ */
/*  Prep-time delay notification                                        */
/* ------------------------------------------------------------------ */

/**
 * Notify the customer that their order needs a few more minutes.
 * Called when the kitchen extends prep time via the KDS delay dialog.
 */
export async function sendPrepDelayNotification(
  orderId: string,
  customerPhone: string | undefined,
  customerName: string,
  extraMinutes: number,
  reason?: string
): Promise<boolean> {
  const phone = normalizePhoneForWhatsApp(customerPhone);
  if (!phone) return false;

  const tokenNum = orderId.slice(-4).toUpperCase();
  const firstName = (customerName || 'Guest').split(' ')[0];

  const message = [
    `⏳ *A Little More Time — We're On It!*`,
    ``,
    `Hi ${firstName}, our kitchen wants you to know:`,
    ``,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    `🎫 Token: *#${tokenNum}*`,
    `🕐 Extra wait: *+${extraMinutes} minutes*`,
    reason ? `📝 Reason: _${reason}_` : `📝 Reason: _Ensuring the best quality for you_`,
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`,
    ``,
    `Great food takes a little extra love — and yours deserves it! 🙏`,
    `We apologise for the short wait and promise it'll be worth it.`,
    ``,
    `Track live: 👉 https://pala-pitta-ruchulu.vercel.app/orders`,
    ``,
    `🌶️ *Pala Pitta Ruchulu* — Authentic South Indian Cuisine`,
  ].join('\n');

  const result = await sendTextMessage(phone, message);
  return result !== null;
}
