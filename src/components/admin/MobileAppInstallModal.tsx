'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Avatar, Stack, Chip, Divider,
} from '@mui/material';
import {
  GetApp, PhoneIphone, Android, CheckCircle, Share, AddBox,
} from '@mui/icons-material';

// Define typed BeforeInstallPromptEvent interface for PWA prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MobileAppInstallModal({ open, onClose }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(() =>
    typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
  );
  const [isStandalone] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone))
  );

  useEffect(() => {
    // Listen for PWA install prompt event

    // Listen for PWA install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      onClose();
    }
  };

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
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          },
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Avatar
          src="/logo.png"
          alt="Pala Pitta Logo"
          sx={{
            width: 72,
            height: 72,
            mx: 'auto',
            mb: 1.5,
            boxShadow: '0 8px 24px rgba(198, 40, 40, 0.3)',
            border: '3px solid #C62828',
          }}
        />
        <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
          Install Mobile Admin App
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mt: 0.5 }}>
          Pala Pitta Ruchulu Admin & POS
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5 }}>
        {isStandalone ? (
          <Box sx={{ textCenter: 'center', py: 2, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 48, color: '#16A34A', mb: 1 }} />
            <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Already Installed on Your Phone! 🎉
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              You are currently using the installed Admin App. You can access it anytime from your home screen.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ p: 2, bgcolor: 'rgba(198, 40, 40, 0.05)', borderRadius: '16px', border: '1px solid rgba(198, 40, 40, 0.15)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#C62828', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                ⚡ Quick Mobile Features
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                • 1-Tap Access from Phone Home Screen<br />
                • Real-time Order & Table Alerts<br />
                • Full Kitchen KDS & POS Terminal<br />
                • Fast & Offline-ready Interface
              </Typography>
            </Box>

            {deferredPrompt ? (
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleInstallClick}
                startIcon={<GetApp />}
                sx={{
                  py: 1.5,
                  borderRadius: '14px',
                  fontWeight: 800,
                  bgcolor: '#C62828',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(198, 40, 40, 0.35)',
                  '&:hover': { bgcolor: '#B71C1C' },
                }}
              >
                Direct 1-Click Install App
              </Button>
            ) : isIOS ? (
              <Box sx={{ bgcolor: '#FFF8F2', p: 2, borderRadius: '16px', border: '1px solid #FFE0B2' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#E65100', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIphone sx={{ fontSize: 20 }} /> How to Install on iPhone (iOS):
                </Typography>
                <Stack spacing={1} sx={{ fontSize: '13px', color: '#424242' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Step 1" size="small" color="warning" sx={{ height: 20, fontSize: '10px', fontWeight: 800 }} />
                    <Typography variant="body2">Tap the <strong>Share</strong> button <Share sx={{ fontSize: 16, verticalAlign: 'middle', color: '#0284C7' }} /> in Safari.</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Step 2" size="small" color="warning" sx={{ height: 20, fontSize: '10px', fontWeight: 800 }} />
                    <Typography variant="body2">Scroll down and tap <strong>Add to Home Screen</strong> <AddBox sx={{ fontSize: 16, verticalAlign: 'middle' }} />.</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Step 3" size="small" color="warning" sx={{ height: 20, fontSize: '10px', fontWeight: 800 }} />
                    <Typography variant="body2">Tap <strong>Add</strong> top right to launch!</Typography>
                  </Box>
                </Stack>
              </Box>
            ) : (
              <Box sx={{ bgcolor: '#F0FDF4', p: 2, borderRadius: '16px', border: '1px solid #BBF7D0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Android sx={{ fontSize: 20 }} /> How to Install on Android Phone:
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px', lineHeight: 1.5 }}>
                  1. Tap Chrome / Browser menu <strong>(⋮)</strong> top right.<br />
                  2. Tap <strong>&quot;Install App&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.<br />
                  3. Launch directly from your phone app icon!
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>

      <Divider sx={{ my: 1 }} />

      <DialogActions sx={{ px: 2.5, pb: 2, justifyContent: 'center' }}>
        <Button onClick={onClose} sx={{ color: '#64748B', fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
