import 'server-only';
import { PDFDocument, type PDFPage } from 'pdf-lib';
import type { Order } from '@/types';
import { createPdfText } from './pdfText';
import {
  billCounts, billHeader, billItems, billMetaLines, billPaymentLine, billSummaryLines,
  BILL_FOOTNOTE, BILL_THANKS, BILL_TITLE, BILL_UNPAID_NOTICE,
} from '@/lib/billDocument';

/** 80 mm receipt. Measure wrapped text before laying out the page so long
 * order IDs, customer names and dish names neither overlap nor get truncated. */
export async function generateThermalBillPdf(order: Order, invoiceNo?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const text = await createPdfText(doc);
  const pageWidth = 226.77;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const commands: { height: number; draw: (page: PDFPage, y: number) => void }[] = [];

  function line(value: string, size = 8, bold = false, center = false) {
    for (const wrapped of text.wrap(value, contentWidth, size, bold)) {
      commands.push({ height: size * 1.6,
        draw: (page, y) => text.draw(page, wrapped, center ? Math.max(margin, (pageWidth - text.width(wrapped, size, bold)) / 2) : margin, y, size, bold) });
    }
  }
  const rule = () => line('- '.repeat(28), 7, false, true);
  function row(left: string, right: string, size = 8, bold = false) {
    const rightWidth = text.width(right, size, bold);
    if (text.width(left, size, bold) + rightWidth + 10 > contentWidth) {
      line(left, size, bold);
      line(right, size, bold);
      return;
    }
    commands.push({ height: size * 1.6, draw: (page, y) => {
      text.draw(page, left, margin, y, size, bold);
      text.draw(page, right, pageWidth - margin - rightWidth, y, size, bold);
    } });
  }

  const header = billHeader();
  line(header.name.toUpperCase(), 12, true, true);
  for (const value of [header.tagline, header.addressLine, `Ph: ${header.phone}`]) if (value) line(value, 7.5, false, true);
  if (header.fssai) line(`FSSAI: ${header.fssai}`, 7, false, true);
  if (header.gstin) line(`GSTIN: ${header.gstin}`, 7, false, true);
  rule();
  line(BILL_TITLE, 9.5, true, true);
  line(`TOKEN #${(order.id || '').slice(-4).toUpperCase()}`, 11, true, true);
  rule();
  for (const meta of billMetaLines(order, invoiceNo)) row(`${meta.label}:`, meta.value, 7.5);
  rule();
  row('QTY / ITEM DESCRIPTION', 'AMOUNT', 7.5, true);
  rule();

  for (const item of billItems(order)) {
    const amount = item.amount.toFixed(2);
    const amountWidth = text.width(amount, 8, true);
    const nameWidth = contentWidth - 26 - amountWidth - 8;
    const names = text.wrap(item.name, nameWidth, 8, true);
    names.forEach((name, index) => commands.push({ height: 13, draw: (page, y) => {
      if (index === 0) {
        text.draw(page, String(item.qty), margin, y, 8, true);
        text.draw(page, amount, pageWidth - margin - amountWidth, y, 8, true);
      }
      text.draw(page, name, margin + 26, y, 8, true);
    } }));
    line(`@ ${item.rate.toFixed(2)}`, 7);
  }
  const counts = billCounts(order);
  rule();
  row('Total Items / Qty:', `${counts.lines} items / ${counts.units} pcs`, 7.5);
  rule();
  for (const summary of billSummaryLines(order)) {
    row(summary.label, summary.strong ? `Rs. ${summary.value}` : summary.value, summary.strong ? 9.5 : 8, summary.strong);
  }
  rule();
  const payment = billPaymentLine(order);
  row(payment.label, payment.value, 8, true);
  if (order.paymentStatus !== 'paid') line(BILL_UNPAID_NOTICE, 8, true, true);
  rule();
  line(BILL_THANKS, 8.5, true, true);
  line(BILL_FOOTNOTE, 7, false, true);
  line(header.website, 7, false, true);

  // PDF pages are limited to 200 inches. Very large tickets continue onto
  // another page instead of overflowing the valid page box.
  const pageHeight = Math.min(14_000, Math.max(380, commands.reduce((sum, command) => sum + command.height, 0) + margin * 3));
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin * 2;
  for (const command of commands) {
    if (y - command.height < margin) { page = doc.addPage([pageWidth, pageHeight]); y = pageHeight - margin * 2; }
    command.draw(page, y);
    y -= command.height;
  }
  return doc.save();
}
