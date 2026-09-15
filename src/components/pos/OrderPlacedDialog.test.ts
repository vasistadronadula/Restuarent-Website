// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const printer = vi.hoisted(() => ({ print: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/thermalPrinter', () => ({ isPrinterConnected: () => true, printOrder: printer.print, savedPrinterName: () => 'Test printer' }));
vi.mock('@/components/bill/ThermalBill', () => ({ default: () => null }));
vi.mock('@/components/bill/PrintBillPortal', () => ({ default: () => null }));
import OrderPlacedDialog from './OrderPlacedDialog';
import type { Order } from '@/types';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('sends one automatic print job through Strict Mode replay and ordinary rerenders', async () => {
  const order = { id: 'order', items: [], subtotal: 100, grandTotal: 105, paymentStatus: 'paid' } as unknown as Order;
  const element = (open: boolean) => React.createElement(React.StrictMode, null,
    React.createElement(OrderPlacedDialog, { order: { ...order }, open, onNewOrder: () => {} }));
  const view = render(element(false));
  expect(printer.print).not.toHaveBeenCalled();
  view.rerender(element(true));
  await waitFor(() => expect(printer.print).toHaveBeenCalledOnce());
  view.rerender(element(true));
  expect(printer.print).toHaveBeenCalledOnce();
});
