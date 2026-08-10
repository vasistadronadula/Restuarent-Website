'use client';

import {
  BILL_FOOTNOTE, BILL_THANKS, BILL_TITLE, BILL_UNPAID_NOTICE,
  billAmount, billCounts, billHeader, billItems, billMetaLines,
  billPaymentLine, billSummaryLines,
} from '@/lib/billDocument';
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
 * speaks. Two transports are supported, mirroring each other's pairing
 * shape (request access once, silently reconnect on later loads):
 *
 *  - Web Bluetooth, for wireless printers. Chrome/Edge on Android and
 *    desktop only.
 *  - Web Serial, for printers wired in over USB (the common case for a
 *    fixed counter till). Chrome/Edge on desktop only — not Android, not
 *    iOS Safari.
 *
 * `printOrder`/`printTestReceipt` write to whichever transport is
 * connected without the caller needing to know which one — a cashier's
 * printer is either paired over Bluetooth or plugged in, never both at
 * once. Neither transport exists on iOS Safari, which is why every function
 * here reports failure instead of throwing: the caller falls back to the
 * on-screen receipt dialog.
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
const PAPER_WIDTH_KEY = 'pala_pitta_printer_paper';

/** Roll width in millimetres. 80mm is the counter standard; 58mm is the
 *  handheld/portable size some outlets keep as a spare. */
export type PaperWidth = 58 | 80;

/**
 * Printable characters per line at Font A.
 *
 * This used to be hard-coded to 32 — the 58mm figure — on the reasoning that
 * it is the safe common denominator. It is safe, but on the 80mm roll this
 * counter actually uses it wastes a third of the paper and prints a receipt
 * that looks like a parking ticket: the totals column stops a centimetre short
 * of the edge and nothing lines up with the printed header. The width is a
 * setting now, defaulting to 80mm, so the bill fills the paper it is on.
 */
export const COLUMNS: Record<PaperWidth, number> = { 58: 32, 80: 48 };

export function savedPaperWidth(): PaperWidth {
  if (typeof window === 'undefined') return 80;
  return localStorage.getItem(PAPER_WIDTH_KEY) === '58' ? 58 : 80;
}

export function setPaperWidth(width: PaperWidth): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PAPER_WIDTH_KEY, String(width));
}

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

export function isBluetoothPrinterConnected(): boolean {
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
  if (!bt?.getDevices || isBluetoothPrinterConnected()) return isBluetoothPrinterConnected();

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

// ─── Wired (Web Serial / USB) pairing ────────────────────────────────────────
//
// The counter till is often plugged in rather than paired wirelessly — the
// printer never walks away and USB means one less thing to lose signal.
// Web Serial is Chrome/Edge desktop only (no Android, no iOS Safari), which
// is why this is offered alongside Bluetooth rather than instead of it.

const WIRED_LABEL_KEY = 'pala_pitta_printer_wired_label';
const BAUD_RATE_KEY = 'pala_pitta_printer_baud';

/** Baud rates covering effectively every USB/serial ESC/POS printer sold. */
export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200] as const;
export type BaudRate = typeof BAUD_RATES[number];

export function savedBaudRate(): BaudRate {
  if (typeof window === 'undefined') return 9600;
  const saved = Number(localStorage.getItem(BAUD_RATE_KEY));
  return (BAUD_RATES as readonly number[]).includes(saved) ? (saved as BaudRate) : 9600;
}

export function setBaudRate(rate: BaudRate): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BAUD_RATE_KEY, String(rate));
}

/** Name of the last paired wired printer, for showing "Connected to X" on load. */
export function savedWiredPrinterName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WIRED_LABEL_KEY);
}

// Minimal Web Serial typings — same reasoning as the Bluetooth ones above.
interface SerialPortLike {
  readonly writable: WritableStream<Uint8Array> | null;
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}
interface SerialLike {
  requestPort: () => Promise<SerialPortLike>;
  getPorts: () => Promise<SerialPortLike[]>;
  addEventListener?: (type: string, listener: (event: { target?: unknown }) => void) => void;
}

function serial(): SerialLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as unknown as { serial?: SerialLike }).serial ?? null;
}

export function isWiredPrinterSupported(): boolean {
  return !!serial();
}

let serialPort: SerialPortLike | null = null;
let serialWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
let serialDisconnectListenerAttached = false;

export function isWiredPrinterConnected(): boolean {
  return !!serialWriter;
}

function labelFor(port: SerialPortLike): string {
  const info = port.getInfo?.();
  if (info?.usbVendorId != null && info?.usbProductId != null) {
    const hex = (n: number) => n.toString(16).padStart(4, '0');
    return `USB printer (${hex(info.usbVendorId)}:${hex(info.usbProductId)})`;
  }
  return 'USB printer';
}

async function attachSerial(port: SerialPortLike, baudRate: BaudRate): Promise<boolean> {
  try {
    await port.open({ baudRate });
  } catch {
    // Already open from an earlier attach in this same page session, or a
    // device that refused the requested baud rate.
    if (!port.writable) return false;
  }
  if (!port.writable) return false;

  serialPort = port;
  serialWriter = port.writable.getWriter();

  const s = serial();
  if (s?.addEventListener && !serialDisconnectListenerAttached) {
    serialDisconnectListenerAttached = true;
    s.addEventListener('disconnect', (event) => {
      if (event.target === serialPort) {
        serialWriter = null;
        serialPort = null;
      }
    });
  }

  localStorage.setItem(WIRED_LABEL_KEY, labelFor(port));
  return true;
}

/**
 * Show the browser's Serial port picker and pair a printer. Must be called
 * from a user gesture. Returns the port label, or null if the cashier
 * cancelled or the port couldn't be opened.
 */
export async function connectWiredPrinter(baudRate: BaudRate = savedBaudRate()): Promise<string | null> {
  const s = serial();
  if (!s) return null;

  try {
    const port = await s.requestPort();
    const ok = await attachSerial(port, baudRate);
    if (!ok) return null;
    setBaudRate(baudRate);
    return savedWiredPrinterName();
  } catch {
    // Cancelled picker, or a port that refused to open.
    return null;
  }
}

/**
 * Silently reconnect a wired printer this browser was already granted
 * access to. Called on load so the cashier doesn't re-pick the port every
 * shift. Chrome/Edge desktop only.
 */
export async function reconnectSavedWiredPrinter(): Promise<boolean> {
  const s = serial();
  if (!s || isWiredPrinterConnected()) return isWiredPrinterConnected();

  try {
    const ports = await s.getPorts();
    const port = ports[0];
    if (!port) return false;
    return await attachSerial(port, savedBaudRate());
  } catch {
    return false;
  }
}

export function disconnectWiredPrinter(): void {
  try {
    serialWriter?.close();
  } catch {
    // Already gone — nothing to clean up.
  }
  try {
    serialPort?.close();
  } catch {
    // Already gone — nothing to clean up.
  }
  serialWriter = null;
  serialPort = null;
  if (typeof window !== 'undefined') localStorage.removeItem(WIRED_LABEL_KEY);
}

/** Either transport ready to print — what callers deciding "silent print or
 *  fall back to the dialog" actually want, regardless of which one it is. */
export function isPrinterConnected(): boolean {
  return isBluetoothPrinterConnected() || isWiredPrinterConnected();
}

// ─── ESC/POS receipt ─────────────────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;

/**
 * Everything sent to the printer is reduced to plain ASCII first.
 *
 * TextEncoder produces UTF-8; an ESC/POS printer decodes bytes with a
 * single-byte code page (CP437 by default). A rupee sign, an en-dash or a
 * curly apostrophe therefore arrives as two or three bytes and prints as two
 * or three pieces of line-noise — mid-way through a dish name, on a bill a
 * customer is holding. Dish names come from Menu Management, so this is not
 * hypothetical: one paste from a word processor is enough.
 */
function ascii(value: string): string {
  return (value ?? '')
    .replace(/[₹]/g, 'Rs.')
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[•·]/g, '-')
    .replace(/…/g, '...')
    // Strip accents to their base letter rather than dropping the letter.
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

class EscPosBuilder {
  private parts: number[] = [];
  private encoder = new TextEncoder();

  raw(...bytes: number[]) { this.parts.push(...bytes); return this; }
  text(value: string) { this.parts.push(...this.encoder.encode(ascii(value))); return this; }
  /**
   * The line feed is emitted as a raw byte *after* sanitising, not appended to
   * the string beforehand. `ascii()` drops every character outside printable
   * ASCII, and a line feed is one of them — appending it first meant every
   * newline in the receipt was quietly deleted and the whole bill printed as
   * one unbroken line of text. Keeping `ascii()` strict also means a dish name
   * that somehow contains a newline cannot break the column alignment.
   */
  line(value = '') { return this.text(value).raw(0x0a); }
  /** Reset, then pin the code page so a printer's own default can't reinterpret bytes. */
  init() { return this.raw(ESC, 0x40).raw(ESC, 0x74, 0x00).raw(ESC, 0x52, 0x00); }
  align(where: 'left' | 'center' | 'right') {
    return this.raw(ESC, 0x61, where === 'left' ? 0 : where === 'center' ? 1 : 2);
  }
  bold(on: boolean) { return this.raw(ESC, 0x45, on ? 1 : 0); }
  /** Double width *and* height — halves the characters that fit on a line. */
  double(on: boolean) { return this.raw(GS, 0x21, on ? 0x11 : 0x00); }
  /** Double height only, so the line still holds a full-width row. */
  tall(on: boolean) { return this.raw(GS, 0x21, on ? 0x01 : 0x00); }
  feed(lines = 1) { return this.raw(ESC, 0x64, lines); }
  cut() { return this.raw(GS, 0x56, 0x42, 0x00); }
  build() { return new Uint8Array(this.parts); }
}

/**
 * Breaks a name to fit `max` columns.
 *
 * Splits inside a word when the word itself is longer than the line, which the
 * previous version did not: it pushed the oversized word out whole, the
 * printer wrapped it wherever it ran out of paper, and the amount that was
 * supposed to be on that line landed in the middle of the next one. "Hyderabadi
 * Chicken Biryani Family Pack" on a 58mm roll was enough to do it.
 */
function wrapText(name: string, max: number): string[] {
  const width = Math.max(4, max);
  const lines: string[] = [];
  let current = '';

  for (const word of ascii(name).split(/\s+/).filter(Boolean)) {
    let remaining = word;

    // A word too long to ever fit is cut across as many lines as it needs.
    while (remaining.length > width) {
      if (current) { lines.push(current); current = ''; }
      lines.push(remaining.slice(0, width));
      remaining = remaining.slice(width);
    }

    if (!current) {
      current = remaining;
    } else if (current.length + 1 + remaining.length <= width) {
      current = `${current} ${remaining}`;
    } else {
      lines.push(current);
      current = remaining;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : ['Item'];
}

/** Builds the fixed-width text helpers for a given roll. */
function layout(width: number) {
  const divider = (char = '-') => char.repeat(width);

  /**
   * `left ......... right`, always exactly `width` columns.
   *
   * When the two sides cannot both fit, the left is truncated rather than
   * allowed to push the right onto the next line — an amount that wraps is an
   * amount the customer cannot read.
   */
  const row = (left: string, right: string): string => {
    const r = ascii(right);
    const available = Math.max(0, width - r.length - 1);
    const l = ascii(left).slice(0, available);
    return `${l}${' '.repeat(Math.max(1, width - l.length - r.length))}${r}`;
  };

  // QTY | ITEM | AMOUNT, with single spaces between the columns.
  const QTY_W = 3;
  const AMOUNT_W = 9;
  const NAME_W = width - QTY_W - AMOUNT_W - 2;

  const itemRow = (qty: string, nameLine: string, amount: string): string =>
    `${ascii(qty).padStart(QTY_W)} ${ascii(nameLine).padEnd(NAME_W).slice(0, NAME_W)} ${ascii(amount).padStart(AMOUNT_W)}`;

  const headerRow = (): string => itemRow('QTY', 'ITEM', 'AMOUNT');

  const continuation = (nameLine: string): string =>
    `${' '.repeat(QTY_W + 1)}${ascii(nameLine)}`;

  return { divider, row, itemRow, headerRow, continuation, nameWidth: NAME_W };
}

export function buildReceiptBytes(
  order: Order,
  invoiceNo?: string,
  paperWidth: PaperWidth = savedPaperWidth(),
): Uint8Array {
  const width = COLUMNS[paperWidth] ?? COLUMNS[80];
  const { divider, row, itemRow, headerRow, continuation, nameWidth } = layout(width);
  const b = new EscPosBuilder();

  const shop = billHeader();
  const items = billItems(order);
  const counts = billCounts(order);

  // ── Who is billing ────────────────────────────────────────────────────
  // Wrapped here rather than left to the printer: a printer breaks an
  // over-long line at whatever column it runs out of, which on a 58mm roll
  // splits the address mid-word and leaves a two-character orphan line.
  const centred = (value: string) => { for (const l of wrapText(value, width)) b.line(l); };

  b.init().align('center').bold(true).double(true)
    .line(shop.name)
    .double(false).bold(false);
  centred(shop.tagline);
  centred(shop.addressLine);
  b.line(`Ph: ${shop.phone}`);
  if (shop.gstin) b.line(`GSTIN: ${shop.gstin}`);
  if (shop.fssai) b.line(`FSSAI: ${shop.fssai}`);

  b.line(divider('='));
  b.bold(true).line(BILL_TITLE).bold(false);
  b.line(divider('='));

  // ── Which bill, whose ─────────────────────────────────────────────────
  b.align('left');
  for (const line of billMetaLines(order, invoiceNo)) {
    b.line(row(line.label, line.value));
  }
  b.line(divider());

  // ── What was sold ─────────────────────────────────────────────────────
  b.bold(true).line(headerRow()).bold(false);
  b.line(divider());

  for (const item of items) {
    const [first, ...rest] = wrapText(item.name, nameWidth);
    b.line(itemRow(String(item.qty), first, billAmount(item.amount)));
    for (const extra of rest) b.line(continuation(extra));
    // The unit rate, indented, so the multiplication can be checked.
    b.line(continuation(`  @ ${billAmount(item.rate)}`));
  }

  b.line(divider());
  b.line(row(`${counts.lines} item${counts.lines === 1 ? '' : 's'}`, `Total qty: ${counts.units}`));
  b.line(divider());

  // ── What it comes to ──────────────────────────────────────────────────
  for (const line of billSummaryLines(order)) {
    if (!line.strong) {
      b.line(row(line.label, line.value));
      continue;
    }
    b.line(divider('='));
    b.bold(true).tall(true).line(row(line.label, `Rs.${line.value}`)).tall(false).bold(false);
    b.line(divider('='));
  }

  // ── How it was settled ────────────────────────────────────────────────
  const payment = billPaymentLine(order);
  b.line(row(payment.label, payment.value));
  if (order.paymentStatus !== 'paid') {
    b.align('center').bold(true).line(BILL_UNPAID_NOTICE).bold(false).align('left');
  }
  b.line(divider());

  b.align('center')
    .bold(true).line(BILL_THANKS).bold(false)
    .line(shop.website)
    .line(BILL_FOOTNOTE)
    .feed(3)
    .cut();

  return b.build();
}

/**
 * Writes a receipt to whichever transport is actually connected. Bluetooth
 * goes out in small chunks — BLE caps a single write at ~512 bytes and many
 * printers choke well before that — while Web Serial has no such limit and
 * takes the whole buffer in one write.
 */
async function sendBytes(payload: Uint8Array): Promise<boolean> {
  if (characteristic && isBluetoothPrinterConnected()) {
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
  }

  if (serialWriter && isWiredPrinterConnected()) {
    await serialWriter.write(payload);
    return true;
  }

  return false;
}

/**
 * Send a receipt to the connected printer, Bluetooth or wired. Returns false
 * when there's no printer attached or the write failed, so the caller can
 * fall back to the on-screen receipt instead of a counter silently losing a
 * ticket.
 */
export async function printOrder(order: Order, invoiceNo?: string): Promise<boolean> {
  if (!isPrinterConnected()) return false;

  try {
    return await sendBytes(buildReceiptBytes(order, invoiceNo));
  } catch (err) {
    console.warn('Printer write failed:', err);
    return false;
  }
}

/**
 * Small fixed ticket so a cashier can confirm the pairing works.
 *
 * It prints a full-width ruler line on purpose: if the roll is set to 80mm but
 * the printer is a 58mm unit, the ruler wraps onto a second line and the
 * cashier can see the mismatch immediately, instead of discovering it on a
 * customer's bill.
 */
export async function printTestReceipt(): Promise<boolean> {
  if (!isPrinterConnected()) return false;

  const paper = savedPaperWidth();
  const width = COLUMNS[paper];
  const { divider, row } = layout(width);
  const shop = billHeader();
  const transport = isBluetoothPrinterConnected() ? 'Bluetooth' : 'Wired (USB)';

  const b = new EscPosBuilder();
  b.init().align('center').bold(true).double(true).line(shop.name).double(false).bold(false)
    .line('Printer connected')
    .line(divider('='))
    .align('left')
    .line(row('Connection', transport))
    .line(row('Paper', `${paper}mm`))
    .line(row('Columns', String(width)))
    .line(row('Time', new Date().toLocaleString('en-IN')))
    .line(divider())
    // A ruler exactly one line wide. If it wraps, the paper setting is wrong.
    .line('1234567890'.repeat(Math.ceil(width / 10)).slice(0, width))
    .line(divider())
    .align('center')
    .line('Orders will now print here')
    .feed(3)
    .cut();

  try {
    return await sendBytes(b.build());
  } catch {
    return false;
  }
}
