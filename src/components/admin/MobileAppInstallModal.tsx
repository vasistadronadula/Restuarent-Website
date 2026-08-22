'use client';

import React, { useEffect, useState } from 'react';
import {
  Download, Smartphone, CheckCircle2, Share2, PlusSquare,
  Bell, BellOff, Printer, Bluetooth, Info, Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { receivesNotifications } from '@/lib/roleAccess';
import { roleAppFor, type RoleApp } from '@/lib/roleApps';
import { enablePushNotifications, getPushState, type PushState } from '@/lib/pushClient';
import {
  connectPrinter, disconnectPrinter, isBluetoothPrinterConnected, isPrinterSupported,
  printTestReceipt, reconnectSavedPrinter, savedPrinterName,
} from '@/lib/thermalPrinter';
import type { UserRole } from '@/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function Step({
  index, title, done, children,
}: {
  index: number; title: string; done: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`p-4 rounded-2xl border transition-all ${done ? 'bg-ad-surface  border-ad-hairline ' : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800'}`}>
      <div className="flex items-center gap-2 mb-2">
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-ad-ok  flex-shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-black flex items-center justify-center flex-shrink-0">
            {index}
          </div>
        )}
        <h4 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function SetupSteps({
  app, userRole, userId, installed, deferredPrompt, isIOS, onInstall,
}: {
  app: RoleApp;
  userRole: UserRole | null;
  userId: string | undefined;
  installed: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  isIOS: boolean;
  onInstall: () => void;
}) {
  const wantsAlerts = receivesNotifications(userRole);
  const isCashier = userRole === 'cashier';

  const [pushState, setPushState] = useState<PushState>(() => getPushState());
  const [enablingPush, setEnablingPush] = useState(false);
  const [printerName, setPrinterName] = useState<string | null>(() =>
    isBluetoothPrinterConnected() ? savedPrinterName() || 'Bluetooth printer' : null
  );
  const [connectingPrinter, setConnectingPrinter] = useState(false);

  useEffect(() => {
    if (!isCashier || printerName) return;
    void reconnectSavedPrinter().then((ok) => {
      if (ok) setPrinterName(savedPrinterName() || 'Bluetooth printer');
    });
  }, [isCashier, printerName]);

  const handleEnableAlerts = async () => {
    if (!userId) return;
    setEnablingPush(true);
    try {
      const next = await enablePushNotifications(userId);
      setPushState(next);
      if (next === 'granted') toast.success('Alerts are on for this device');
      else if (next === 'denied') toast.error('Notifications are blocked in your browser settings');
    } finally {
      setEnablingPush(false);
    }
  };

  const handleConnectPrinter = async () => {
    setConnectingPrinter(true);
    try {
      const name = await connectPrinter();
      if (!name) {
        toast.error('No printer connected');
        return;
      }
      setPrinterName(name);
      const printed = await printTestReceipt();
      toast.success(printed ? `${name} connected — test slip printed` : `${name} connected`);
    } finally {
      setConnectingPrinter(false);
    }
  };

  const handleForgetPrinter = () => {
    disconnectPrinter();
    setPrinterName(null);
    toast('Printer disconnected');
  };

  const alertsStepIndex = 2;
  const printerStepIndex = wantsAlerts ? 3 : 2;

  return (
    <div className="space-y-3">
      <div className="p-3 bg-ad-accent-soft  rounded-xl border border-ad-hairline space-y-1">
        {app.highlights.map((line) => (
          <p key={line} className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
            • {line}
          </p>
        ))}
      </div>

      <Step index={1} title="Install on this phone" done={installed}>
        {installed ? (
          <p className="text-xs text-stone-500">
            Installed. Launch it any time from your home screen.
          </p>
        ) : deferredPrompt ? (
          <Button
            onClick={onInstall}
            className="w-full h-10 font-extrabold rounded-xl ad-btn ad-btn-primary shadow-md"
          >
            <Download className="w-4 h-4 mr-2" />
            Install {app.shortName}
          </Button>
        ) : isIOS ? (
          <div className="space-y-1 text-xs text-stone-600 dark:text-stone-400">
            <div className="font-bold text-ad-accent-deep  flex items-center gap-1">
              <Smartphone className="w-4 h-4" /> On iPhone (Safari)
            </div>
            <p>
              Tap <Share2 className="w-3.5 h-3.5 inline mx-0.5" /> Share → <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" /> → <strong>Add</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-1 text-xs text-stone-600 dark:text-stone-400">
            <div className="font-bold text-ad-ok  flex items-center gap-1">
              <Smartphone className="w-4 h-4" /> On Android (Chrome)
            </div>
            <p>
              Open the browser menu <strong>(⋮)</strong> → <strong>Install app</strong> / <strong>Add to Home screen</strong>.
            </p>
          </div>
        )}
      </Step>

      {wantsAlerts && (
        <Step index={alertsStepIndex} title="Turn on instant alerts" done={pushState === 'granted'}>
          {pushState === 'granted' ? (
            <p className="text-xs text-ad-ok  flex items-center gap-1.5 font-medium">
              <Bell className="w-4 h-4" />
              Alerted the moment {userRole === 'waiter' ? 'a table is booked' : 'an order comes in'}.
            </p>
          ) : pushState === 'denied' ? (
            <p className="text-xs text-ad-accent-deep  flex items-start gap-1">
              <BellOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Notifications are blocked for this site. Turn them back on in your browser&apos;s site settings.
            </p>
          ) : pushState === 'unsupported' ? (
            <p className="text-xs text-stone-500">
              This browser can&apos;t deliver background alerts. Install the app on Android with Chrome.
            </p>
          ) : (
            <>
              <Button
                onClick={handleEnableAlerts}
                disabled={enablingPush || !userId}
                className="w-full h-10 font-extrabold rounded-xl ad-btn ad-btn-primary"
              >
                {enablingPush ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                Allow notifications
              </Button>
              <p className="text-[11px] text-stone-500 mt-1">
                Your phone will ask for permission — tap <strong>Allow</strong>.
              </p>
            </>
          )}
        </Step>
      )}

      {isCashier && (
        <Step index={printerStepIndex} title="Connect receipt printer" done={!!printerName}>
          {!isPrinterSupported() ? (
            <p className="text-xs text-stone-500 flex items-start gap-1">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              This browser can&apos;t talk to Bluetooth printers. Use Chrome on Android for auto printing.
            </p>
          ) : printerName ? (
            <div className="space-y-2 text-xs">
              <p className="text-ad-ok  font-bold flex items-center gap-1">
                <Bluetooth className="w-4 h-4" />
                {printerName}
                {isBluetoothPrinterConnected() ? ' — orders print automatically' : ' — paired'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printTestReceipt().then((ok) => (ok ? toast.success('Test slip sent') : toast.error('Printer not responding')))}
                  className="font-bold text-xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Test print
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleForgetPrinter}
                  className="text-stone-500 text-xs font-bold"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                onClick={handleConnectPrinter}
                disabled={connectingPrinter}
                className="w-full h-10 font-extrabold rounded-xl ad-btn ad-btn-dark"
              >
                {connectingPrinter ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bluetooth className="w-4 h-4 mr-2" />}
                Connect printer
              </Button>
              <p className="text-[11px] text-stone-500 mt-1">
                Switch printer on, pick it from list. Every new order prints on its own.
              </p>
            </>
          )}
        </Step>
      )}
    </div>
  );
}

export default function MobileAppInstallModal({ open, onClose }: Props) {
  const { user, userRole } = useAuth();
  const app = roleAppFor(userRole);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const [isIOS] = useState(() =>
    typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
  );
  const [isStandalone] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone))
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  };

  if (!app) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl bg-white dark:bg-stone-900 border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 text-center flex flex-col items-center">
          <Avatar className="w-16 h-16 mb-2 border-2 border-ad-accent shadow-lg bg-white p-1">
            <AvatarImage src="/pala-pitta-mark.png" alt={app.name} className="object-contain" />
            <AvatarFallback className="bg-ad-accent text-white font-black text-xl">PP</AvatarFallback>
          </Avatar>
          <DialogTitle className="text-xl font-black text-stone-900 dark:text-stone-100">
            {app.name}
          </DialogTitle>
          <p className="text-xs text-stone-500 font-semibold mt-1">
            Your own app — opens straight to your screen
          </p>
        </DialogHeader>

        <div className="px-6 py-2">
          <SetupSteps
            app={app}
            userRole={userRole}
            userId={user?.id}
            installed={isStandalone || installed}
            deferredPrompt={deferredPrompt}
            isIOS={isIOS}
            onInstall={handleInstallClick}
          />
        </div>

        <DialogFooter className="p-4 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-200/80 dark:border-stone-800 flex flex-row items-center justify-between">
          <Badge variant="outline" className="bg-ad-accent-soft text-ad-accent-deep  font-bold border-ad-hairline">
            {app.shortName}
          </Badge>
          <Button variant="ghost" onClick={onClose} className="font-bold text-xs">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
