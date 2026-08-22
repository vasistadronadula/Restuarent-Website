import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { restaurantInfo } from '@/data/restaurantInfo';
import type { Order } from '@/types';
import {
  billAmount,
  billCounts,
  billHeader,
  billItems,
  billMetaLines,
  billPaymentLine,
  billSummaryLines,
  BILL_FOOTNOTE,
  BILL_THANKS,
  BILL_TITLE,
  BILL_UNPAID_NOTICE,
} from '@/lib/billDocument';

/**
 * generateThermalBillPdf
 * 
 * Creates an authentic 80mm POS Thermal Receipt PDF using pdf-lib.
 * Uses exact monospace typography, dashed borders, item rate breakdown,
 * GST numbers, and payment status — matching the physical counter printout.
 */
export async function generateThermalBillPdf(order: Order, invoiceNo?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // 80mm paper width = 226.77 pt
  const pageWidth = 226.77;

  const fontMono = await doc.embedFont(StandardFonts.Courier);
  const fontMonoBold = await doc.embedFont(StandardFonts.CourierBold);

  const black = rgb(0, 0, 0);

  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Measure content height dynamically
  const items = billItems(order);
  const metaLines = billMetaLines(order, invoiceNo);
  const summaryLines = billSummaryLines(order);

  let calculatedHeight = 220; // header & titles
  calculatedHeight += metaLines.length * 13;
  calculatedHeight += items.length * 24;
  calculatedHeight += summaryLines.length * 14;
  calculatedHeight += 120; // payment, thanks, footer

  const pageHeight = Math.max(380, calculatedHeight);
  const page = doc.addPage([pageWidth, pageHeight]);

  let y = pageHeight - 16;

  const drawCenteredText = (text: string, size: number, isBold = false) => {
    const font = isBold ? fontMonoBold : fontMono;
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = Math.max(margin, (pageWidth - textWidth) / 2);
    page.drawText(text, { x, y, size, font, color: black });
    y -= size + 3;
  };

  const drawDashedLine = () => {
    const dash = '- '.repeat(Math.floor(contentWidth / 9));
    drawCenteredText(dash, 8, false);
  };

  const drawDoubleLine = () => {
    const eq = '='.repeat(Math.floor(contentWidth / 5.2));
    drawCenteredText(eq, 8, true);
  };

  const drawRow = (left: string, right: string, size = 8.5, isBold = false) => {
    const font = isBold ? fontMonoBold : fontMono;
    page.drawText(left, { x: margin, y, size, font, color: black });
    const rightWidth = font.widthOfTextAtSize(right, size);
    page.drawText(right, { x: pageWidth - margin - rightWidth, y, size, font, color: black });
    y -= size + 4;
  };

  // 1. Header
  const header = billHeader();
  drawCenteredText(header.name.toUpperCase(), 12, true);
  if (header.tagline) drawCenteredText(header.tagline, 7.5, false);
  if (header.addressLine) drawCenteredText(header.addressLine, 7.5, false);
  if (header.phone) drawCenteredText(`Ph: ${header.phone}`, 7.5, false);
  if (header.fssai) drawCenteredText(`FSSAI: ${header.fssai}`, 7, false);
  if (header.gstin) drawCenteredText(`GSTIN: ${header.gstin}`, 7, false);

  y -= 2;
  drawDashedLine();

  // 2. Title & Token
  drawCenteredText(BILL_TITLE, 9.5, true);
  const token = (order.id || '').slice(-4).toUpperCase();
  if (token) {
    drawCenteredText(`TOKEN #${token}`, 11, true);
  }

  drawDashedLine();

  // 3. Meta lines (Bill No, Order, Date, Customer, Type, Table)
  for (const m of metaLines) {
    drawRow(`${m.label}:`, m.value, 7.5, false);
  }

  drawDashedLine();

  // 4. Item Table Header
  page.drawText('QTY', { x: margin, y, size: 7.5, font: fontMonoBold, color: black });
  page.drawText('ITEM DESCRIPTION', { x: margin + 26, y, size: 7.5, font: fontMonoBold, color: black });
  const amtHeadWidth = fontMonoBold.widthOfTextAtSize('AMOUNT', 7.5);
  page.drawText('AMOUNT', { x: pageWidth - margin - amtHeadWidth, y, size: 7.5, font: fontMonoBold, color: black });
  y -= 12;
  drawDashedLine();

  // 5. Items List
  for (const item of items) {
    // Qty
    page.drawText(`${item.qty}`, { x: margin, y, size: 8.5, font: fontMonoBold, color: black });
    // Item Name (truncate safely if very long)
    const nameMaxChars = 20;
    const nameStr = item.name.length > nameMaxChars ? item.name.slice(0, nameMaxChars - 2) + '..' : item.name;
    page.drawText(nameStr, { x: margin + 26, y, size: 8, font: fontMonoBold, color: black });
    // Amount
    const amtStr = item.amount.toFixed(2);
    const amtWidth = fontMonoBold.widthOfTextAtSize(amtStr, 8);
    page.drawText(amtStr, { x: pageWidth - margin - amtWidth, y, size: 8, font: fontMonoBold, color: black });
    y -= 10;

    // Rate breakdown row
    page.drawText(`  @ ${item.rate.toFixed(2)}`, { x: margin + 26, y, size: 7, font: fontMono, color: black });
    y -= 10;
  }

  const counts = billCounts(order);
  drawDashedLine();
  drawRow('Total Items / Qty:', `${counts.lines} items / ${counts.units} pcs`, 7.5, false);
  drawDashedLine();

  // 6. Summary lines (Subtotal, CGST, SGST, Discount, Delivery, Round-off, Grand Total)
  for (const s of summaryLines) {
    if (s.strong) {
      drawDoubleLine();
      drawRow(s.label.toUpperCase(), `Rs. ${s.value}`, 9.5, true);
      drawDoubleLine();
    } else {
      drawRow(s.label, s.value, 8, false);
    }
  }

  // 7. Payment status & mode
  const paymentLine = billPaymentLine(order);
  drawRow(paymentLine.label, paymentLine.value, 8, true);

  if (order.paymentStatus !== 'paid') {
    y -= 3;
    drawCenteredText(BILL_UNPAID_NOTICE, 8, true);
  }

  // 8. Footer
  y -= 4;
  drawDashedLine();
  drawCenteredText(BILL_THANKS, 8.5, true);
  drawCenteredText(BILL_FOOTNOTE, 7, false);
  drawCenteredText('www.palapittaruchulu.com', 7, false);

  return await doc.save();
}
