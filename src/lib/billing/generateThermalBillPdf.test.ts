import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { generateThermalBillPdf } from './generateThermalBillPdf';
import { createPdfText } from './pdfText';
import type { Order } from '@/types';

describe('thermal PDF receipts', () => {
  it('renders Telugu and Hindi names, Unicode punctuation and unsupported emoji without a WinAnsi failure', async () => {
    const order = { id: 'PPR-ORD-20260914-012345678901234567890123', customerName: 'శ్రీనివాస్ — राम 🌶️',
      items: [{ name: 'హైదరాబాద్ బిర్యానీ — Special', quantity: 1, price: 100 }],
      subtotal: 100, cgst: 2.5, sgst: 2.5, grandTotal: 105, paymentMode: 'cash', paymentStatus: 'unpaid' } as Order;
    const bytes = await generateThermalBillPdf(order);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(226.77);
    expect(bytes.length).toBeGreaterThan(1000);
  });
  it('wraps a long receipt value within the available width without discarding the text', async () => {
    const text = await createPdfText(await PDFDocument.create());
    const value = 'శ్రీనివాస్'.repeat(12);
    const lines = text.wrap(value, 100, 8);
    expect(lines.join('')).toBe(value);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every(line => text.width(line, 8) <= 100)).toBe(true);
  });
});
