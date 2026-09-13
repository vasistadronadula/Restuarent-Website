import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateOrderId,
  generateReservationId,
  generateInvoiceNo,
  generateTableId,
  generateEmployeeId,
  generateInventoryId,
  generateMenuItemId,
  generateCategoryId,
  ORDER_ID_PATTERN,
} from './idGenerator';

describe('idGenerator', () => {
  afterEach(() => vi.useRealTimers());
  it('generates date-stamped ids with an 80-bit random suffix', () => {
    const orderId = generateOrderId();
    expect(orderId).toMatch(/^PPR-ORD-\d{8}-[a-f0-9]{19}\d{4}$/);
    expect(orderId).toMatch(ORDER_ID_PATTERN);
    expect(orderId.length).toBeLessThanOrEqual(40);
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
    expect(ids.size).toBe(50);
  });

  it('uses the restaurant date across the IST midnight boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T18:31:00Z'));
    expect(generateOrderId()).toMatch(/^PPR-ORD-20260914-/);
  });

  it('continues accepting secure legacy guest IDs without accepting short guessable IDs', () => {
    expect(ORDER_ID_PATTERN.test('PPR-ORD-20260913-abcdef0123456789abcd')).toBe(true);
    expect(ORDER_ID_PATTERN.test('PPR-ORD-20260913-1234')).toBe(false);
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
