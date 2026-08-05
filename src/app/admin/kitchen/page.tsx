'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Grid, Typography, Chip, Button, IconButton, Paper, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Tooltip,
  Badge, Switch, FormControlLabel, useMediaQuery, useTheme,
} from '@mui/material';
import {
  VolumeUp, VolumeOff, DarkMode, LightMode, History, Restore,
  LocalFireDepartment, CheckCircle, TableRestaurant, AccessTime,
  NotificationsActive, Close, Fastfood, Check, Layers,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { StatCard, SectionCard, EmptyState, adminColors } from '@/components/admin/ui';
import { Order, OrderStatus } from '@/types';
import toast from 'react-hot-toast';

const LANES: { status: OrderStatus; label: string; emoji: string; accent: string; cta: string; next: OrderStatus | null }[] = [
  { status: 'pending', label: 'New Orders (Queue)', emoji: '⏳', accent: '#D97706', cta: '🔥 Start Preparation', next: 'preparing' },
  { status: 'preparing', label: 'Cooking Now', emoji: '🔥', accent: '#EA580C', cta: '🛎️ Mark Order Ready', next: 'ready' },
  { status: 'ready', label: 'Ready for Pickup', emoji: '🛎️', accent: '#15803D', cta: '✅ Mark Delivered', next: 'delivered' },
];

// Web Audio API Synthesizer for Kitchen Chime (No external audio file required!)
function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // High chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);

    // Second higher chime note
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain2.gain.setValueAtTime(0.35, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.4);
    }, 120);
  } catch {
    // Audio context not allowed until user interaction
  }
}

function useNow(intervalMs = 10000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function ticketAgeMinutes(order: Order, now: number): number {
  if (!order.orderTime) return 0;
  const parsed = Date.parse(`${order.orderDate || ''} ${order.orderTime}`);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.round((now - parsed) / 60000));
}

// ─── Kitchen Ticket Card Component ───────────────────────────────────────────

function KitchenTicket({
  order, lane, onAdvance, now, isDarkKDS,
}: {
  order: Order;
  lane: typeof LANES[number];
  onAdvance: (id: string, status: OrderStatus) => void;
  now: number;
  isDarkKDS: boolean;
}) {
  const age = ticketAgeMinutes(order, now);
  const isWarning = age >= 10 && age < 20;
  const isCritical = age >= 20;

  let timerBg = isDarkKDS ? 'rgba(255,255,255,0.1)' : '#F5F5F5';
  let timerColor = isDarkKDS ? '#D6D3D1' : 'text.secondary';

  if (isWarning) {
    timerBg = '#FEF3C7';
    timerColor = '#B45309';
  } else if (isCritical) {
    timerBg = '#FEE2E2';
    timerColor = '#991B1B';
  }

  const cardBg = isDarkKDS ? '#1C1917' : '#FFFFFF';
  const headerBg = isDarkKDS ? '#292524' : '#FAFAF9';
  const textColor = isDarkKDS ? '#F5F5F4' : '#1C1917';
  const borderCol = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : isDarkKDS ? '#44403C' : 'rgba(0,0,0,0.08)';

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '16px',
        border: '2px solid',
        borderColor: borderCol,
        bgcolor: cardBg,
        overflow: 'hidden',
        mb: 2,
        boxShadow: isCritical ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 4px 16px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Ticket Header */}
      <Box sx={{ p: 1.75, bgcolor: headerBg, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, borderBottom: `1px solid ${isDarkKDS ? '#44403C' : '#E7E5E4'}` }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 900, color: adminColors.accentRed, fontSize: '15px' }}>
              #{order.orderId || order.id}
            </Typography>
            {order.orderSource === 'swiggy' && (
              <Chip label="SWIGGY" size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontSize: '9.5px', fontWeight: 900, height: 20 }} />
            )}
            {order.orderSource === 'zomato' && (
              <Chip label="ZOMATO" size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontSize: '9.5px', fontWeight: 900, height: 20 }} />
            )}
            {order.tableNumber && (
              <Chip label={`TABLE ${order.tableNumber}`} size="small" icon={<TableRestaurant sx={{ fontSize: '12px !important', color: 'white !important' }} />}
                sx={{ bgcolor: adminColors.accentRed, color: 'white', fontSize: '9.5px', fontWeight: 900, height: 20 }} />
            )}
            {(!order.orderSource || order.orderSource === 'direct') && !order.tableNumber && (
              <Chip label="TAKEAWAY" size="small" sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontSize: '9.5px', fontWeight: 900, height: 20 }} />
            )}
          </Box>
          <Typography variant="caption" sx={{ color: isDarkKDS ? '#A8A29E' : '#78716C', display: 'block', mt: 0.4, fontWeight: 700 }}>
            👤 {order.customerName || 'Diner'} • 📞 {order.customerPhone || 'N/A'}
          </Typography>
        </Box>

        <Chip
          icon={<AccessTime sx={{ fontSize: '12px !important', color: `${timerColor} !important` }} />}
          label={age <= 0 ? 'JUST NOW' : `${age} MINS AGO`}
          size="small"
          sx={{
            bgcolor: timerBg,
            color: timerColor,
            fontWeight: 900, fontSize: '10px', flexShrink: 0,
          }}
        />
      </Box>

      {/* Items List */}
      <Box sx={{ p: 2 }}>
        {(order.items || []).map((item, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1,
              borderBottom: i < order.items.length - 1 ? `1px solid ${isDarkKDS ? '#292524' : '#F5F5F4'}` : 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Box className={item.vegStatus === 'veg' ? 'veg-indicator' : 'non-veg-indicator'} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: textColor, fontSize: '14px' }}>
                  {item.name}
                </Typography>
                {item.selectedPortion && (
                  <Chip
                    label={item.selectedPortion.toUpperCase()}
                    size="small"
                    sx={{ height: 16, fontSize: '8.5px', fontWeight: 800, bgcolor: isDarkKDS ? '#44403C' : '#E7E5E4', color: isDarkKDS ? 'white' : 'text.primary' }}
                  />
                )}
              </Box>
            </Box>

            <Chip
              label={`×${item.quantity || 1}`}
              size="small"
              sx={{ bgcolor: isDarkKDS ? '#44403C' : '#F5F5F4', color: isDarkKDS ? '#F5F5F4' : '#1C1917', fontSize: '13px', fontWeight: 900, height: 26, px: 0.5 }}
            />
          </Box>
        ))}

        {/* Special Instructions Note */}
        {order.notes && (
          <Box sx={{ mt: 1.5, p: 1.2, bgcolor: isDarkKDS ? '#451A03' : '#FEF3C7', borderRadius: '10px', border: '1px solid #F59E0B' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: isDarkKDS ? '#FDE68A' : '#92400E', display: 'block' }}>
              ⚠️ Kitchen Note: &quot;{order.notes}&quot;
            </Typography>
          </Box>
        )}

        {/* Advance Ticket CTA */}
        {lane.next ? (
          <Button
            fullWidth
            onClick={() => onAdvance(order.id, lane.next as OrderStatus)}
            sx={{
              mt: 2, py: 1.4, borderRadius: '12px', fontSize: '14px', fontWeight: 900,
              color: 'white', bgcolor: lane.accent,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              '&:hover': { bgcolor: lane.accent, opacity: 0.9 },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            {lane.cta}
          </Button>
        ) : (
          <Box sx={{ mt: 2, textAlign: 'center', py: 1.2, borderRadius: '12px', bgcolor: isDarkKDS ? '#064E3B' : '#F0FDF4', border: '1px solid #6EE7B7' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: isDarkKDS ? '#A7F3D0' : '#15803D' }}>
              🎉 Order Ready & Completed
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

// ─── Main Kitchen Display System Page ─────────────────────────────────────────

export default function KitchenPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const now = useNow();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const isDarkKDS = false;
  const [recallOpen, setRecallOpen] = useState(false);
  const [prevPendingCount, setPrevPendingCount] = useState(0);

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== 'cancelled'), [orders]);
  const deliveredToday = useMemo(() => activeOrders.filter((o) => o.status === 'delivered'), [activeOrders]);

  const laneOrders = (status: OrderStatus) => activeOrders.filter((o) => o.status === status);
  const pendingOrders = laneOrders('pending');

  // Trigger sound chime when a new pending order comes in
  useEffect(() => {
    if (soundEnabled && pendingOrders.length > prevPendingCount && prevPendingCount >= 0) {
      playKitchenChime();
      toast.success('🔔 New Order Arrived on Kitchen Line!', { duration: 4000 });
    }
    setPrevPendingCount(pendingOrders.length);
  }, [pendingOrders.length, prevPendingCount, soundEnabled]);

  // Station Item Aggregation: Compute total active quantities of each dish across pending & preparing
  const dishAggregation = useMemo(() => {
    const activePrepOrders = activeOrders.filter((o) => o.status === 'pending' || o.status === 'preparing');
    const counts: Record<string, number> = {};
    activePrepOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        counts[item.name] = (counts[item.name] || 0) + (item.quantity || 1);
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [activeOrders]);

  const handleRecallOrder = async (orderId: string) => {
    const ok = await updateOrderStatus(orderId, 'ready');
    if (ok) {
      toast.success(`Order #${orderId} recalled back to Ready lane! 🛎️`);
      setRecallOpen(false);
    }
  };

  return (
    <AdminLayout title="Kitchen Display System (KDS)">
      <Box sx={{ bgcolor: isDarkKDS ? '#0C0A09' : 'transparent', p: isDarkKDS ? 2 : 0, borderRadius: '24px', transition: 'all 0.3s ease' }}>

        {/* KDS Header Controls */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: `1px solid ${isDarkKDS ? '#292524' : adminColors.border}`, bgcolor: isDarkKDS ? '#1C1917' : 'white', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocalFireDepartment sx={{ color: adminColors.accentRed, fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: isDarkKDS ? 'white' : 'text.primary', lineHeight: 1.2 }}>
                  Kitchen Display Monitor (KDS)
                </Typography>
                <Typography variant="caption" sx={{ color: isDarkKDS ? '#A8A29E' : 'text.secondary', fontWeight: 600 }}>
                  Real-time ticket bumping & station batch prep
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Audio Alert Toggle */}
              <Tooltip title={soundEnabled ? 'Kitchen Sound Enabled' : 'Kitchen Sound Muted'}>
                <Button
                  size="small"
                  variant={soundEnabled ? 'contained' : 'outlined'}
                  color={soundEnabled ? 'warning' : 'inherit'}
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    if (next) playKitchenChime();
                  }}
                  startIcon={soundEnabled ? <VolumeUp /> : <VolumeOff />}
                  sx={{ borderRadius: '12px', fontWeight: 800, px: 2 }}
                >
                  {soundEnabled ? 'Sound On' : 'Muted'}
                </Button>
              </Tooltip>

              {/* Ticket Recall Drawer Action */}
              <Button
                size="small" variant="outlined" color="primary"
                onClick={() => setRecallOpen(true)}
                startIcon={<History />}
                sx={{ borderRadius: '12px', fontWeight: 800, px: 2 }}
              >
                Recall Tickets ({deliveredToday.length})
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Station Dish Batch Aggregation Bar */}
        {dishAggregation.length > 0 && (
          <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: `1px solid ${isDarkKDS ? '#44403C' : '#FFD8A8'}`, bgcolor: isDarkKDS ? '#292524' : '#FFF8F2', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Layers sx={{ color: adminColors.accentRed, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: isDarkKDS ? '#FDE047' : '#C62828' }}>
                🔥 BATCH COOKING SUMMARY — ACTIVE ITEMS IN PREP ({dishAggregation.reduce((s, [, qty]) => s + qty, 0)})
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {dishAggregation.map(([dishName, totalQty]) => (
                <Chip
                  key={dishName}
                  label={`${dishName} × ${totalQty}`}
                  sx={{
                    bgcolor: isDarkKDS ? '#44403C' : '#FFFFFF',
                    color: isDarkKDS ? '#F5F5F4' : '#1C1917',
                    border: `1px solid ${isDarkKDS ? '#78716C' : '#FFCCBC'}`,
                    fontWeight: 900,
                    fontSize: '12.5px',
                    py: 1.8,
                    px: 0.5,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  }}
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* Metric Lane Counters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {LANES.map((lane) => (
            <Grid key={lane.status} size={{ xs: 6, md: 3 }}>
              <StatCard
                icon={lane.emoji}
                label={lane.label}
                value={laneOrders(lane.status).length}
                accent={lane.accent}
              />
            </Grid>
          ))}
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon="✅" label="Delivered Today" value={deliveredToday.length} accent={adminColors.success} />
          </Grid>
        </Grid>

        {/* Kanban Board Lanes */}
        {activeOrders.length === 0 ? (
          <SectionCard sx={{ bgcolor: isDarkKDS ? '#1C1917' : 'white' }}>
            <EmptyState
              emoji="👨‍🍳"
              title="Kitchen queue is clear!"
              subtitle="New incoming orders from website & POS will sound an alert and appear here instantly."
            />
          </SectionCard>
        ) : (
          <Grid container spacing={2.5}>
            {LANES.map((lane) => {
              const laneItems = laneOrders(lane.status);
              return (
                <Grid key={lane.status} size={{ xs: 12, md: 4 }}>
                  <Box
                    sx={{
                      borderRadius: '20px',
                      bgcolor: isDarkKDS ? '#1C1917' : '#FAFAF9',
                      border: `1.5px solid ${isDarkKDS ? '#292524' : 'rgba(0,0,0,0.08)'}`,
                      p: 2,
                      minHeight: 300,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, mb: 2 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: '15px', color: isDarkKDS ? 'white' : adminColors.textPrimary }}>
                        {lane.emoji} {lane.label}
                      </Typography>
                      <Chip
                        label={laneItems.length}
                        size="small"
                        sx={{ bgcolor: lane.accent, color: 'white', fontWeight: 900, height: 24, fontSize: '12px' }}
                      />
                    </Box>

                    {laneItems.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 6, border: '2px dashed rgba(0,0,0,0.08)', borderRadius: '16px' }}>
                        <Typography variant="caption" sx={{ color: isDarkKDS ? '#A8A29E' : 'text.secondary', fontWeight: 700 }}>
                          No tickets in {lane.label}
                        </Typography>
                      </Box>
                    ) : (
                      laneItems.map((order) => (
                        <KitchenTicket
                          key={order.id}
                          order={order}
                          lane={lane}
                          onAdvance={updateOrderStatus}
                          now={now}
                          isDarkKDS={isDarkKDS}
                        />
                      ))
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Ticket Recall Drawer Modal */}
        <Dialog open={recallOpen} onClose={() => setRecallOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            📜 Ticket Recall (Completed Orders Today)
            <IconButton size="small" onClick={() => setRecallOpen(false)}><Close /></IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ py: 2 }}>
            {deliveredToday.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No completed orders available for recall.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {deliveredToday.map((order) => (
                  <Paper key={order.id} sx={{ p: 2, borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Order #{order.orderId || order.id} • {order.customerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(order.items || []).map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </Typography>
                    </Box>

                    <Button
                      size="small" variant="outlined" color="warning"
                      startIcon={<Restore />}
                      onClick={() => handleRecallOrder(order.id)}
                      sx={{ borderRadius: '10px', fontWeight: 800 }}
                    >
                      Recall Ticket
                    </Button>
                  </Paper>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRecallOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
}
