'use client';

import { restaurantInfo } from '@/data/restaurantInfo';
import type { Order } from '@/types';

/**
 * thermalPrinter.ts — direct Bluetooth printing for the cashier's app.
 *
 * The cashier pairs a Bluetooth receipt printer once; from then on every new
 * order prints itself with no dialog, no paper-size guessing and no tab
 * focus required. That is the whole point of pairing: `window.print()` needs
 * a human to confirm a system dialog, which is exactly what a counter under
 * pressure can't stop to do.
 *
 * Bytes are ESC/POS — what effectively every 58mm/80mm thermal printer
 * speaks. Transport is Web Bluetooth, so this works in Chrome/Edge on
 * Android and desktop. iOS Safari has no Web Bluetooth at all: there the
 * caller falls back to the receipt dialog, which is why every function here
 * reports failure instead of throwing.
 */

// Serial-over-BLE service exposed by the common ESC/POS printer chipsets.
// Different vendors ship different UUIDs, so a paired device is scanned for
// any writable characteristic rather than assuming one.
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // 0x18F0 — most generic BT printers
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 style serial bridges
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Issc/Microchip transparent UART
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

const DEVICE_NAME_KEY = 'pala_pitta_printer_name';

// Minimal Web Bluetooth typings — TS's DOM lib doesn't ship them, and the
// alternative (`any`) would hide real mistakes in the GATT plumbing below.
interface BluetoothCharacteristic {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
}
interface BluetoothService {
  getCharacteristics: () => Promise<BluetoothCharacteristic[]>;
}
interface BluetoothGatt {
  connected: boolean;
  connect: () => Promise<BluetoothGatt>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<BluetoothService[]>;
}
interface BluetoothDeviceLike {
  id: string;
  name?: string;
  gatt?: BluetoothGatt;
  addEventListener: (type: string, listener: () => void) => void;
}
interface BluetoothLike {
  requestDevice: (options: {
    filters?: { services: string[] }[];
    acceptAllDevices?: boolean;
    optionalServices?: string[];
  }) => Promise<BluetoothDeviceLike>;
  getDevices?: () => Promise<BluetoothDeviceLike[]>;
}

function bluetooth(): BluetoothLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth ?? null;
}

export function isPrinterSupported(): boolean {
  return !!bluetooth();
}

/** Name of the last paired printer, for showing "Connected to X" on load. */
export function savedPrinterName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEVICE_NAME_KEY);
}

// Module-level so a reconnect survives component remounts — the cashier
// switching pages must not drop the printer.
let device: BluetoothDeviceLike | null = null;
let characteristic: BluetoothCharacteristic | null = null;

export function isPrinterConnected(): boolean {
  return !!characteristic && !!device?.gatt?.connected;
}

async function findWritableCharacteristic(gatt: BluetoothGatt): Promise<BluetoothCharacteristic | null> {
  const services = await gatt.getPrimaryServices();
  for (const service of services) {
    let characteristics: BluetoothCharacteristic[];
    try {
      characteristics = await service.getCharacteristics();
    } catch {
      continue;
    }
    const writable = characteristics.find(
      (c) => c.properties.write || c.properties.writeWithoutResponse
    );
    if (writable) return writable;
  }
  return null;
}

async function attach(target: BluetoothDeviceLike): Promise<boolean> {
  if (!target.gatt) return false;
  const gatt = await target.gatt.connect();
  const writable = await findWritableCharacteristic(gatt);
  if (!writable) return false;

  device = target;
  characteristic = writable;
  target.addEventListener('gattserverdisconnected', () => {
    characteristic = null;
  });
  if (target.name) localStorage.setItem(DEVICE_NAME_KEY, target.name);
  return true;
}

/**
 * Show the browser's Bluetooth picker and pair a printer. Must be called
 * from a user gesture. Returns the device name, or null if the cashier
 * cancelled or nothing writable was found.
 */
export async function connectPrinter(): Promise<string | null> {
  const bt = bluetooth();
  if (!bt) return null;

  try {
    // Filters would hide printers that advertise a vendor-specific service,
    // and a cashier staring at an empty picker has no way to recover — so
    // every device is listed and the known services are requested up front
    // (they can't be discovered after connecting otherwise).
    const chosen = await bt.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_PRINTER_SERVICES,
    });
    const ok = await attach(chosen);
    return ok ? chosen.name || 'Bluetooth printer' : null;
  } catch {
    // Cancelled picker, or a device that refused the connection.
    return null;
  }
}

/**
 * Silently reconnect a printer this browser was already granted access to.
 * Called on load so the cashier doesn't re-pair every morning. Chrome only.
 */
export async function reconnectSavedPrinter(): Promise<boolean> {
  const bt = bluetooth();
  if (!bt?.getDevices || isPrinterConnected()) return isPrinterConnected();

  try {
    const known = await bt.getDevices();
    const savedName = savedPrinterName();
    const match = known.find((d) => d.name === savedName) || known[0];
    if (!match) return false;
    return await attach(match);
  } catch {
    return false;
  }
}

export function disconnectPrinter(): void {
  try {
    device?.gatt?.disconnect();
  } catch {
    // Already gone — nothing to clean up.
  }
  device = null;
  characteristic = null;
  if (typeof window !== 'undefined') localStorage.removeItem(DEVICE_NAME_KEY);
}

// ─── ESC/POS receipt ─────────────────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;

class EscPosBuilder {
  private parts: number[] = [];
  private encoder = new TextEncoder();

  raw(...bytes: number[]) { this.parts.push(...bytes); return this; }
  text(value: string) { this.parts.push(...this.encoder.encode(value)); return this; }
  line(value = '') { return this.text(`${value}\n`); }
  init() { return this.raw(ESC, 0x40); }
  align(where: 'left' | 'center' | 'right') {
    return this.raw(ESC, 0x61, where === 'left' ? 0 : where === 'center' ? 1 : 2);
  }
  bold(on: boolean) { return this.raw(ESC, 0x45, on ? 1 : 0); }
  double(on: boolean) { return this.raw(GS, 0x21, on ? 0x11 : 0x00); }
  feed(lines = 1) { return this.raw(ESC, 0x64, lines); }
  cut() { return this.raw(GS, 0x56, 0x42, 0x00); }
  build() { return new Uint8Array(this.parts); }
}

// 32 characters is the printable width of a 58mm roll — the safe common
// denominator, and it still looks right on 80mm paper.
const WIDTH = 32;
const divider = (char = '-') => char.repeat(WIDTH);

function row(left: string, right: string): string {
  const gap = Math.max(1, WIDTH - left.length - right.length);
  return `${left}${' '.repeat(gap)}${right}`;
}

function wrapItemName(name: string, indent: number): string[] {
  const max = WIDTH - indent;
  const words = name.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (`${current} ${word}`.trim().length > max) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildReceiptBytes(order: Order, invoiceNo?: string): Uint8Array {
  const b = new EscPosBuilder();
  const money = (n: number) => n.toFixed(2);

  b.init().align('center').bold(true).double(true)
    .line(restaurantInfo.name)
    .double(false)
    .bold(false)
    .line(restaurantInfo.addressLine)
    .line(restaurantInfo.phoneDisplay);
  if (restaurantInfo.gstin) b.line(`GSTIN: ${restaurantInfo.gstin}`);
  b.line(divider());

  b.align('left')
    .line(`Order : ${order.id}`);
  if (invoiceNo) b.line(`Bill  : ${invoiceNo}`);
  b.line(`Date  : ${order.orderDate || ''} ${order.orderTime || ''}`)
    .line(`Guest : ${order.customerName || 'Walk-in'}`);
  if (order.customerPhone) b.line(`Phone : ${order.customerPhone}`);
  b.line(divider());

  for (const item of order.items || []) {
    const qty = item.quantity || 1;
    const amount = money((item.price || 0) * qty);
    const nameLines = wrapItemName(item.name || 'Item', 4);
    b.line(row(`${qty} x ${nameLines[0]}`, amount));
    for (const extra of nameLines.slice(1)) b.line(`    ${extra}`);
  }

  b.line(divider());
  b.line(row('Subtotal', money(order.subtotal || 0)));
  if (order.discount) b.line(row('Discount', `-${money(order.discount)}`));
  if (order.cgst) b.line(row('CGST 2.5%', money(order.cgst)));
  if (order.sgst) b.line(row('SGST 2.5%', money(order.sgst)));
  b.line(divider('='));
  b.bold(true).line(row('TOTAL', money(order.grandTotal || order.subtotal || 0))).bold(false);
  b.line(row(
    `Payment ${(order.paymentMode || 'cash').toUpperCase()}`,
    order.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'
  ));
  b.line(divider());

  b.align('center')
    .line('Thank you, visit again!')
    .line(restaurantInfo.website)
    .feed(3)
    .cut();

  return b.build();
}

/**
 * Send a receipt to the paired printer. Returns false when there's no
 * printer attached or the write failed, so the caller can fall back to the
 * on-screen receipt instead of a counter silently losing a ticket.
 */
export async function printOrder(order: Order, invoiceNo?: string): Promise<boolean> {
  if (!isPrinterConnected() || !characteristic) return false;

  try {
    const payload = buildReceiptBytes(order, invoiceNo);
    // BLE caps a single write at ~512 bytes and many printers choke well
    // before that, so the receipt goes out in small chunks.
    const CHUNK = 180;
    for (let i = 0; i < payload.length; i += CHUNK) {
      const chunk = payload.slice(i, i + CHUNK);
      if (characteristic.properties.write) {
        await characteristic.writeValue(chunk);
      } else if (characteristic.writeValueWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('Bluetooth print failed:', err);
    return false;
  }
}

/** Small fixed ticket so a cashier can confirm the pairing works. */
export async function printTestReceipt(): Promise<boolean> {
  if (!isPrinterConnected() || !characteristic) return false;
  const b = new EscPosBuilder();
  b.init().align('center').bold(true).line(restaurantInfo.name).bold(false)
    .line('Printer connected')
    .line(new Date().toLocaleString('en-IN'))
    .line(divider())
    .line('Orders will now print here')
    .feed(3)
    .cut();
  try {
    await characteristic.writeValue(b.build());
    return true;
  } catch {
    return false;
  }
}
