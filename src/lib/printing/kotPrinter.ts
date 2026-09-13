import type { Order } from '@/types';
import { getOrderDisplayNumber } from '@/lib/orderNumber';
import { toast } from 'sonner';

const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

/**
 * Prints a clean 80mm Kitchen Order Ticket (KOT) using the browser thermal print preview.
 */
export function printKitchenTicket(order: Order) {
  if (typeof window === 'undefined') return;
  const orderNum = escape(getOrderDisplayNumber(order));
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const channel = order.orderType === 'dine-in'
    ? `DINE-IN · TABLE ${order.tableNumber ?? '—'}`
    : order.orderType === 'counter'
    ? 'QUICK COUNTER'
    : `TAKEAWAY · ${order.customerName || 'GUEST'}`;

  const itemsHtml = (order.items || []).map(i => `
    <tr>
      <td style="font-size:16px; font-weight:bold; width:34px; vertical-align:top;">×${escape(i.quantity)}</td>
      <td style="font-size:15px; font-weight:bold; vertical-align:top;">
        ${escape(i.name)}
        ${i.portion || i.selectedPortion ? `<div style="font-size:12px; font-weight:normal; color:#444;">Portion: ${escape(i.portion || i.selectedPortion)}</div>` : ''}
        ${i.notes ? `<div style="font-size:12px; font-style:italic; color:#b45309;">* ${escape(i.notes)}</div>` : ''}
      </td>
    </tr>
  `).join('');

  const notesHtml = order.notes ? `
    <div style="margin-top:8px; padding:6px; border:1px dashed #b45309; background:#fffbeb; font-size:12px; font-weight:bold;">
      SPECIAL INSTRUCTIONS:<br/>
      <span style="font-weight:normal; white-space:pre-wrap;">${escape(order.notes)}</span>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>KOT - ${orderNum}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; width: 72mm; margin: 0 auto; padding: 4px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .double-line { border-top: 2px solid #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          td { padding: 3px 0; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:18px; letter-spacing:0.5px;">PALA PITTA RUCHULU</div>
        <div class="center bold" style="font-size:13px; margin-top:2px;">KITCHEN ORDER TICKET (KOT)</div>
        <div class="double-line"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:20px; font-weight:900;">
          <span>ORDER ${orderNum}</span>
          <span style="font-size:14px; font-weight:bold;">${timeStr}</span>
        </div>
        <div style="font-size:14px; font-weight:bold; margin-top:4px;">${escape(channel)}</div>
        <div style="font-size:9px; overflow-wrap:anywhere;">${escape(order.id)}</div>
        <div style="font-size:11px; color:#555;">Date: ${dateStr}</div>
        <div class="line"></div>
        <table>
          <tbody>${itemsHtml}</tbody>
        </table>
        ${notesHtml}
        <div class="double-line"></div>
        <div class="center" style="font-size:11px; font-weight:bold;">--- KITCHEN COPY ---</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 800);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=380,height=600');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    toast.error('Allow pop-ups to print the kitchen ticket, then try again.');
  }
}
