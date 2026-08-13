'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bluetooth, Loader2, Printer } from 'lucide-react';

import { useAutoPrint } from '@/hooks/useAutoPrint';
import {
  connectPrinter, disconnectPrinter,
  isBluetoothPrinterConnected, isPrinterSupported,
  printTestReceipt, reconnectSavedPrinter,
  savedPaperWidth, savedPrinterName, type PaperWidth,
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
 * One transport (Bluetooth) and no manual paper-width picker: the roll size
 * is read off the paired printer itself (see thermalPrinter.ts's
 * `widthFromDeviceName`), so there's nothing here for a cashier to get wrong.
 */
export default function PrinterSettingsPanel({ open, onClose }: Props) {
  const [autoPrint, setAutoPrint] = useAutoPrint();
  const [paperWidth, setPaperWidthState] = useState<PaperWidth>(() => savedPaperWidth());

  const [btName, setBtName] = useState<string | null>(() =>
    isBluetoothPrinterConnected() ? savedPrinterName() : null
  );
  const [connectingBt, setConnectingBt] = useState(false);
  const [testing, setTesting] = useState(false);

  // Silently re-attach whatever was paired last time, the moment the panel
  // opens — a cashier opening this to check status shouldn't have to
  // re-pick a device that's still plugged in / in range.
  useEffect(() => {
    if (!open || btName) return;
    void reconnectSavedPrinter().then((ok) => {
      if (ok) {
        setBtName(savedPrinterName());
        setPaperWidthState(savedPaperWidth());
      }
    });
  }, [open, btName]);

  const handleConnectBluetooth = async () => {
    setConnectingBt(true);
    try {
      const name = await connectPrinter();
      if (!name) { toast.error('No Bluetooth printer connected'); return; }
      setBtName(name);
      setPaperWidthState(savedPaperWidth());
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

  const anyConnected = !!btName;

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

          {/* Bluetooth */}
          <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-800 dark:text-stone-200">
              <Bluetooth className="w-4 h-4 text-ad-ink" /> Bluetooth
            </div>
            {!isPrinterSupported() ? (
              <p className="text-xs text-stone-500">Not supported in this browser.</p>
            ) : btName ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-ad-ok ">{btName} — paired · {paperWidth}mm roll detected</p>
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
