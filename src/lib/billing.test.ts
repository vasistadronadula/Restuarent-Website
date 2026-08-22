import { describe, expect, it } from 'vitest';
import { computeBillTotals, GST_RATE } from './billing';

describe('computeBillTotals', () => {
  it('splits GST evenly into CGST and SGST', () => {
    const bill = computeBillTotals(1000);
    expect(bill.cgst).toBeCloseTo(25, 2);
    expect(bill.sgst).toBeCloseTo(25, 2);
    expect(bill.cgst + bill.sgst).toBeCloseTo(1000 * GST_RATE, 2);
  });

  it('rounds the grand total to whole rupees', () => {
    // 999 + 5% GST = 1048.95 — must round, not truncate, and the customer
    // pays whichever rupee the printed bill actually shows.
    const bill = computeBillTotals(999);
    expect(Number.isInteger(bill.grandTotal)).toBe(true);
    expect(bill.grandTotal).toBe(Math.round(999 * (1 + GST_RATE)));
  });

  it('applies a percent discount before tax', () => {
    const bill = computeBillTotals(1000, { type: 'percent', value: 10 });
    expect(bill.discountAmount).toBeCloseTo(100, 2);
    expect(bill.taxable).toBeCloseTo(900, 2);
    expect(bill.cgst).toBeCloseTo(22.5, 2);
  });

  it('applies a flat discount, capped at the subtotal', () => {
    const overshoot = computeBillTotals(500, { type: 'flat', value: 800 });
    expect(overshoot.discountAmount).toBe(500);
    expect(overshoot.taxable).toBe(0);
    expect(overshoot.grandTotal).toBe(0);
  });

  it('clamps a bare percent number to [0, 100]', () => {
    const over = computeBillTotals(1000, 150);
    expect(over.discountAmount).toBeCloseTo(1000, 2);

    const under = computeBillTotals(1000, -20);
    expect(under.discountAmount).toBe(0);
  });

  it('adds packaging charge after tax, not before', () => {
    const withPackaging = computeBillTotals(1000, 0, 20);
    const withoutPackaging = computeBillTotals(1000, 0, 0);
    // Packaging isn't taxed — only the taxable value moves the GST lines.
    expect(withPackaging.cgst).toBe(withoutPackaging.cgst);
    expect(withPackaging.sgst).toBe(withoutPackaging.sgst);
    expect(withPackaging.grandTotal).toBe(
      Math.round(withoutPackaging.taxable + withoutPackaging.cgst + withoutPackaging.sgst + 20)
    );
  });

  it('reports a round-off that reconciles the printed total against its own lines', () => {
    const bill = computeBillTotals(333);
    const beforeRounding = bill.taxable + bill.cgst + bill.sgst + (bill.packagingCharge || 0);
    expect(bill.grandTotal - beforeRounding).toBeCloseTo(bill.roundOff, 5);
  });

  it('treats a negative or non-finite subtotal as zero rather than throwing', () => {
    expect(computeBillTotals(-500).grandTotal).toBe(0);
    expect(computeBillTotals(NaN).grandTotal).toBe(0);
  });
});
