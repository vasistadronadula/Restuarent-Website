import { describe, expect, it } from 'vitest';
import {
  generateOrderId,
  generateReservationId,
  generateInvoiceNo,
  generateTableId,
  generateEmployeeId,
  generateInventoryId,
  generateMenuItemId,
  generateCategoryId,
} from './idGenerator';

describe('idGenerator', () => {
  it('generates date-stamped ids with an 80-bit random suffix', () => {
    expect(generateOrderId()).toMatch(/^PPR-ORD-\d{8}-[a-f0-9]{20}$/);
    expect(generateReservationId()).toMatch(/^PPR-RES-\d{8}-[a-f0-9]{20}$/);
    expect(generateEmployeeId()).toMatch(/^PPR-EMP-\d{8}-[a-f0-9]{20}$/);
    expect(generateInventoryId()).toMatch(/^PPR-STK-\d{8}-[a-f0-9]{20}$/);
    expect(generateMenuItemId()).toMatch(/^PPR-DSH-\d{8}-[a-f0-9]{20}$/);
  });

  it('does not repeat the same id on back-to-back calls (collision floor)', () => {
    // Not a proof of uniqueness (it's random), but catches the class of bug
    // this file's own comments describe: a generator built from Date.now()
    // that repeats within the same millisecond/minute.
    const ids = new Set(Array.from({ length: 50 }, () => generateOrderId()));
    expect(ids.size).toBeGreaterThan(1);
  });

  it('derives an invoice number from a well-formed order id', () => {
    expect(generateInvoiceNo('PPR-ORD-20260725-4821')).toBe('PPR-INV-20260725-4821');
  });

  it('falls back to a fresh invoice number for a malformed/legacy order id, keeping its last 4 digits', () => {
    expect(generateInvoiceNo('ORD-LEGACY-4821')).toMatch(/^PPR-INV-\d{8}-4821$/);
  });

  it('generates a fresh invoice number when no order id is given', () => {
    expect(generateInvoiceNo()).toMatch(/^PPR-INV-\d{8}-[a-f0-9]{20}$/);
  });

  it('pads a table id to three digits', () => {
    expect(generateTableId(7)).toBe('T-007');
    expect(generateTableId(42)).toBe('T-042');
  });

  it('derives a category id from its slug, or generates one without a slug', () => {
    expect(generateCategoryId('biryani')).toBe('CAT-biryani');
    expect(generateCategoryId()).toMatch(/^CAT-\d{8}-[a-f0-9]{20}$/);
  });
});
