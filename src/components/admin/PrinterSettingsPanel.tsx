'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bluetooth, Cable, Loader2, Printer } from 'lucide-react';

import { useAutoPrint } from '@/hooks/useAutoPrint';
import {
  BAUD_RATES, type BaudRate,
  connectPrinter, connectWiredPrinter,
  disconnectPrinter, disconnectWiredPrinter,
  isBluetoothPrinterConnected, isPrinterSupported,
  isWiredPrinterConnected, isWiredPrinterSupported,
  printTestReceipt, reconnectSavedPrinter, reconnectSavedWiredPrinter,
  savedBaudRate, savedPaperWidth, savedPrinterName, savedWiredPrinterName,
  setBaudRate, setPaperWidth, type PaperWidth,
} from '@/lib/thermalPrinter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * PrinterSettingsPanel — everything a cashier needs to control the counter
 * printer from one place, reachable mid-shift instead of buried inside the
 * one-time PWA install modal.
 *
 * Bluetooth and wired (Web Serial/USB) are shown as two independent sections
 * because a till has one physical printer connected one way, not both — the
 * cashier pairs whichever section matches their hardware and leaves the
 * other alone. Test print always reports what a real order would actually
 * print to (see thermalPrinter.ts's sendBytes: Bluetooth takes priority if
 * both happen to be connected), so "Test print" under either section shows
 * the truth rather than a guess.
 */
export default function PrinterSettingsPanel({ open, onClose }: Props) {
  const [autoPrint, setAutoPrint] = useAutoPrint();
  const [paperWidth, setPaperWidthState] = useState<PaperWidth>(() => savedPaperWidth());
  const [baud, setBaud] = useState<BaudRate>(() => savedBaudRate());

  const [btName, setBtName] = useState<string | null>(() =>
    isBluetoothPrinterConnected() ? savedPrinterName() : null
  );
  const [wiredName, setWiredName] = useState<string | null>(() =>
    isWiredPrinterConnected() ? savedWiredPrinterName() : null
  );
  const [connectingBt, setConnectingBt] = useState(false);
  const [connectingWired, setConnectingWired] = useState(false);
  const [testing, setTesting] = useState(false);

  // Silently re-attach whatever was paired last time, the moment the panel
  // opens — a cashier opening this to check status shouldn't have to
  // re-pick a device that's still plugged in / in range.
  useEffect(() => {
    if (!open) return;
    if (!btName) void reconnectSavedPrinter().then((ok) => { if (ok) setBtName(savedPrinterName()); });
    if (!wiredName) void reconnectSavedWiredPrinter().then((ok) => { if (ok) setWiredName(savedWiredPrinterName()); });
  }, [open, btName, wiredName]);

  const handleConnectBluetooth = async () => {
    setConnectingBt(true);
    try {
      const name = await connectPrinter();
      if (!name) { toast.error('No Bluetooth printer connected'); return; }
      setBtName(name);
      toast.success(`${name} paired`);
    } finally {
      setConnectingBt(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    disconnectPrinter();
    setBtName(null);
    toast('Bluetooth printer disconnected');
  };

  const handleConnectWired = async () => {
    setConnectingWired(true);
    try {
      const name = await connectWiredPrinter(baud);
      if (!name) { toast.error('No wired printer connected'); return; }
      setWiredName(name);
      toast.success(`${name} paired`);
    } finally {
      setConnectingWired(false);
    }
  };

  const handleDisconnectWired = () => {
    disconnectWiredPrinter();
    setWiredName(null);
    toast('Wired printer disconnected');
  };

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      const ok = await printTestReceipt();
      if (ok) toast.success('Test slip sent');
      else toast.error('Printer not responding');
    } finally {
      setTesting(false);
    }
  };

  const handleBaudChange = (rate: BaudRate) => {
    setBaudRate(rate);
    setBaud(rate);
  };

  const handlePaperWidthChange = (width: PaperWidth) => {
    setPaperWidth(width);
    setPaperWidthState(width);
  };

  const anyConnected = !!btName || !!wiredName;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black text-stone-900 dark:text-stone-100">
            <Printer className="w-5 h-5 text-ad-accent" />
            Printer Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auto-print */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800">
            <div className="min-w-0 pr-3">
              <Label className="text-sm font-bold text-stone-800 dark:text-stone-200">Auto-print new orders</Label>
              <p className="text-xs text-stone-500 mt-0.5">Every new order prints itself — no tap needed</p>
            </div>
            <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
          </div>

          {/* Paper width */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-wide text-stone-500">Paper width</Label>
            <div className="flex gap-2">
              {([58, 80] as const).map((w) => (
                <Button
                  key={w}
                  type="button"
                  size="sm"
                  variant={paperWidth === w ? 'default' : 'outline'}
                  onClick={() => handlePaperWidthChange(w)}
                  className={`flex-1 font-bold rounded-xl ${paperWidth === w ? 'ad-btn ad-btn-primary' : ''}`}
                >
                  {w}mm
                </Button>
              ))}
            </div>
          </div>

          {/* Bluetooth */}
          <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-stone-200">
              <Bluetooth className="w-4 h-4 text-ad-ink" /> Bluetooth
            </div>
            {!isPrinterSupported() ? (
              <p className="text-xs text-stone-500">Not supported in this browser.</p>
            ) : btName ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-ad-ok ">{btName} — paired</p>
                <Button variant="ghost" size="sm" onClick={handleDisconnectBluetooth} className="text-stone-500 text-xs font-bold h-8 px-2">
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleConnectBluetooth}
                disabled={connectingBt}
                className="w-full h-9 font-bold rounded-xl ad-btn ad-btn-dark"
              >
                {connectingBt ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Bluetooth className="w-3.5 h-3.5 mr-2" />}
                Pair Bluetooth printer
              </Button>
            )}
          </div>

          {/* Wired (USB / Web Serial) */}
          <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-stone-200">
              <Cable className="w-4 h-4 text-stone-600" /> Wired (USB)
            </div>
            {!isWiredPrinterSupported() ? (
              <p className="text-xs text-stone-500">Not supported in this browser — use Chrome or Edge on a desktop.</p>
            ) : wiredName ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-ad-ok ">{wiredName} — paired</p>
                <Button variant="ghost" size="sm" onClick={handleDisconnectWired} className="text-stone-500 text-xs font-bold h-8 px-2">
                  Disconnect
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-stone-500 flex-shrink-0">Baud rate</Label>
                  <select
                    value={baud}
                    onChange={(e) => handleBaudChange(Number(e.target.value) as BaudRate)}
                    className="text-xs font-bold border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                  >
                    {BAUD_RATES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <Button
                  size="sm"
                  onClick={handleConnectWired}
                  disabled={connectingWired}
                  className="w-full h-9 font-bold rounded-xl bg-stone-700 hover:bg-stone-800 text-white"
                >
                  {connectingWired ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Cable className="w-3.5 h-3.5 mr-2" />}
                  Pair USB printer
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPrint}
            disabled={!anyConnected || testing}
            className="font-bold text-xs rounded-xl"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Printer className="w-3.5 h-3.5 mr-1.5" />}
            Test print
          </Button>
          <Button variant="ghost" onClick={onClose} className="font-bold text-xs">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
