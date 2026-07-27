'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Avatar, Stack, Chip, Divider, CircularProgress,
} from '@mui/material';
import {
  GetApp, PhoneIphone, Android, CheckCircle, Share, AddBox,
  NotificationsActive, NotificationsOff, Print, Bluetooth, InfoOutlined,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import { receivesNotifications } from '@/lib/roleAccess';
import { roleAppFor, type RoleApp } from '@/lib/roleApps';
import { enablePushNotifications, getPushState, type PushState } from '@/lib/pushClient';
import {
  connectPrinter, disconnectPrinter, isPrinterConnected, isPrinterSupported,
  printTestReceipt, reconnectSavedPrinter, savedPrinterName,
} from '@/lib/thermalPrinter';
import type { UserRole } from '@/types';
import toast from 'react-hot-toast';

// Define typed BeforeInstallPromptEvent interface for PWA prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/** One numbered setup step, so the dialog reads as a checklist. */
function Step({
  index, title, done, children,
}: {
  index: number; title: string; done: boolean; children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '16px',
        border: `1px solid ${done ? '#BBF7D0' : 'rgba(0,0,0,0.08)'}`,
        bgcolor: done ? '#F0FDF4' : '#FFFFFF',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {done ? (
          <CheckCircle sx={{ fontSize: 20, color: '#15803D' }} />
        ) : (
          <Box
            sx={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              bgcolor: 'rgba(0,0,0,0.06)', color: '#44403C',
              fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {index}
          </Box>
        )}
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#1C1917' }}>{title}</Typography>
      </Box>
      {children}
    </Box>
  );
}

/**
 * The steps themselves. Mounted only while the dialog is open, so permission
 * and printer state are read fresh on every open through state initialisers
 * rather than being pushed in from an effect.
 */
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
    isPrinterConnected() ? savedPrinterName() || 'Bluetooth printer' : null
  );
  const [connectingPrinter, setConnectingPrinter] = useState(false);

  // A printer paired on an earlier visit is still granted to this browser —
  // pick it back up so the step shows "connected" instead of asking the
  // cashier to pair the same device again.
  useEffect(() => {
    if (!isCashier || printerName) return;
    void reconnectSavedPrinter().then((ok) => {
      if (ok) setPrinterName(savedPrinterName() || 'Bluetooth printer');
    });
    // Runs once per open; printerName is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCashier]);

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
    <Stack spacing={1.5}>
      <Box sx={{ p: 1.75, bgcolor: `${app.themeColor}0D`, borderRadius: '14px', border: `1px solid ${app.themeColor}33` }}>
        {app.highlights.map((line) => (
          <Typography key={line} variant="caption" sx={{ display: 'block', lineHeight: 1.7, color: '#44403C' }}>
            • {line}
          </Typography>
        ))}
      </Box>

      {/* ── Step 1 — install ───────────────────────────────────────────── */}
      <Step index={1} title="Install on this phone" done={installed}>
        {installed ? (
          <Typography variant="caption" color="text.secondary">
            Installed. Launch it any time from your home screen.
          </Typography>
        ) : deferredPrompt ? (
          <Button
            variant="contained" size="medium" fullWidth
            onClick={onInstall}
            startIcon={<GetApp />}
            sx={{
              py: 1.1, borderRadius: '12px', fontWeight: 800, textTransform: 'none',
              bgcolor: app.themeColor, color: 'white', boxShadow: 'none',
              '&:hover': { bgcolor: app.themeColor, filter: 'brightness(0.92)' },
            }}
          >
            Install {app.shortName}
          </Button>
        ) : isIOS ? (
          <Stack spacing={0.75}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIphone sx={{ fontSize: 16 }} /> On iPhone (Safari)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Tap <Share sx={{ fontSize: 14, verticalAlign: 'middle' }} /> Share → <strong>Add to Home Screen</strong>
              <AddBox sx={{ fontSize: 14, verticalAlign: 'middle', ml: 0.3 }} /> → <strong>Add</strong>.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={0.75}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Android sx={{ fontSize: 16 }} /> On Android (Chrome)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Open the browser menu <strong>(⋮)</strong> → <strong>Install app</strong> / <strong>Add to Home screen</strong>.
            </Typography>
          </Stack>
        )}
      </Step>

      {/* ── Step 2 — notifications (only roles that receive them) ──────── */}
      {wantsAlerts && (
        <Step index={alertsStepIndex} title="Turn on instant alerts" done={pushState === 'granted'}>
          {pushState === 'granted' ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <NotificationsActive sx={{ fontSize: 15, color: '#15803D' }} />
              Alerted the moment {userRole === 'waiter' ? 'a table is booked' : 'an order comes in'}.
            </Typography>
          ) : pushState === 'denied' ? (
            <Typography variant="caption" sx={{ color: '#B45309', display: 'flex', alignItems: 'flex-start', gap: 0.5, lineHeight: 1.6 }}>
              <NotificationsOff sx={{ fontSize: 15, mt: 0.2 }} />
              Notifications are blocked for this site. Turn them back on in your browser&apos;s site settings, then reopen this dialog.
            </Typography>
          ) : pushState === 'unsupported' ? (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              This browser can&apos;t deliver background alerts. Install the app on an Android phone with Chrome to get them.
            </Typography>
          ) : (
            <>
              <Button
                variant="contained" size="medium" fullWidth
                onClick={handleEnableAlerts}
                disabled={enablingPush || !userId}
                startIcon={enablingPush ? <CircularProgress size={16} color="inherit" /> : <NotificationsActive />}
                sx={{
                  py: 1.1, borderRadius: '12px', fontWeight: 800, textTransform: 'none',
                  bgcolor: '#15803D', boxShadow: 'none', '&:hover': { bgcolor: '#166534' },
                }}
              >
                Allow notifications
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, lineHeight: 1.5 }}>
                Your phone will ask for permission — tap <strong>Allow</strong>.
              </Typography>
            </>
          )}
        </Step>
      )}

      {/* ── Step 3 — receipt printer (cashier only) ────────────────────── */}
      {isCashier && (
        <Step index={printerStepIndex} title="Connect the receipt printer" done={!!printerName}>
          {!isPrinterSupported() ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, lineHeight: 1.6 }}>
              <InfoOutlined sx={{ fontSize: 15, mt: 0.2 }} />
              This browser can&apos;t talk to Bluetooth printers, so new orders open the print dialog instead. Use Chrome on Android for automatic printing.
            </Typography>
          ) : printerName ? (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Bluetooth sx={{ fontSize: 15, color: '#15803D' }} />
                <strong>{printerName}</strong>
                {isPrinterConnected() ? ' — orders print automatically' : ' — paired, reconnects when the app opens'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small" variant="outlined" startIcon={<Print />}
                  onClick={() => printTestReceipt().then((ok) => (ok ? toast.success('Test slip sent') : toast.error('Printer not responding')))}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                >
                  Test print
                </Button>
                <Button
                  size="small" color="inherit" onClick={handleForgetPrinter}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, color: '#78716C' }}
                >
                  Disconnect
                </Button>
              </Box>
            </Stack>
          ) : (
            <>
              <Button
                variant="contained" size="medium" fullWidth
                onClick={handleConnectPrinter}
                disabled={connectingPrinter}
                startIcon={connectingPrinter ? <CircularProgress size={16} color="inherit" /> : <Bluetooth />}
                sx={{
                  py: 1.1, borderRadius: '12px', fontWeight: 800, textTransform: 'none',
                  bgcolor: '#1D4ED8', boxShadow: 'none', '&:hover': { bgcolor: '#1E40AF' },
                }}
              >
                Connect printer
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, lineHeight: 1.5 }}>
                Switch the printer on, then pick it from the list. Every new order then prints on its own — no dialog to confirm.
              </Typography>
            </>
          )}
        </Step>
      )}
    </Stack>
  );
}

/**
 * Role-aware install & setup dialog.
 *
 * Each role installs its own app (Kitchen, Billing, Tables …) that opens
 * straight onto the screen that role works in — see lib/roleApps.ts. The
 * dialog then walks through what that role actually needs: notification
 * permission for the roles that receive alerts, and a paired Bluetooth
 * receipt printer for the cashier.
 *
 * Notification permission is requested here, behind a button, rather than on
 * page load — a prompt the user opened is one browsers actually show and
 * staff understand, and a denial here is far less likely to be permanent.
 */
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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '24px',
            p: 1,
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF8F5 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          },
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Avatar
          src="/logo.png"
          alt={app.name}
          sx={{
            width: 68, height: 68, mx: 'auto', mb: 1.5,
            boxShadow: `0 8px 24px ${app.themeColor}55`,
            border: `3px solid ${app.themeColor}`,
          }}
        />
        <Typography variant="h6" sx={{ fontWeight: 900, color: '#1C1917', lineHeight: 1.2 }}>
          {app.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mt: 0.5 }}>
          Your own app — opens straight to your screen
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5 }}>
        <SetupSteps
          app={app}
          userRole={userRole}
          userId={user?.id}
          installed={isStandalone || installed}
          deferredPrompt={deferredPrompt}
          isIOS={isIOS}
          onInstall={handleInstallClick}
        />
      </DialogContent>

      <Divider sx={{ my: 1 }} />

      <DialogActions sx={{ px: 2.5, pb: 2, justifyContent: 'space-between' }}>
        <Chip
          label={app.shortName}
          size="small"
          sx={{ fontWeight: 800, fontSize: 10.5, bgcolor: `${app.themeColor}14`, color: app.themeColor }}
        />
        <Button onClick={onClose} sx={{ color: '#78716C', fontWeight: 700, textTransform: 'none' }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
