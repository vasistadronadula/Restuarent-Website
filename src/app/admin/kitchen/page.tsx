'use client';
import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, Chip } from '@mui/material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { StatCard, SectionCard, EmptyState, adminColors } from '@/components/admin/ui';
import { Order, OrderStatus } from '@/types';

const LANES: { status: OrderStatus; label: string; emoji: string; accent: string; cta: string; next: OrderStatus | null }[] = [
  { status: 'pending', label: 'Queue', emoji: '⏳', accent: '#9E9E9E', cta: '🔥 Start Cooking', next: 'preparing' },
  { status: 'preparing', label: 'Cooking Now', emoji: '🔥', accent: '#FF9800', cta: '🛎️ Mark Ready', next: 'ready' },
  { status: 'ready', label: 'Ready for Pickup', emoji: '🛎️', accent: '#2E7D32', cta: '✅ Mark Delivered', next: 'delivered' },
];

// Live "Xm ago" ticker so tickets visibly age without a page refresh — a
// kitchen's whole job is knowing what's been sitting too long.
function useNow(intervalMs = 15000) {
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

function KitchenTicket({ order, lane, onAdvance, now }: {
  order: Order; lane: typeof LANES[number]; onAdvance: (id: string, status: OrderStatus) => void; now: number;
}) {
  const age = ticketAgeMinutes(order, now);
  const isStale = lane.status !== 'pending' ? false : age >= 10;
  const isVeryStale = age >= 20;

  return (
    <Box
      sx={{
        borderRadius: adminColors.radiusMd,
        border: `2px solid ${isVeryStale ? adminColors.danger : isStale ? adminColors.warning : 'transparent'}`,
        bgcolor: adminColors.bgPanel,
        boxShadow: adminColors.shadowSm,
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box sx={{ p: 1.75, bgcolor: adminColors.bgSubtle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 800, color: adminColors.accentRed, fontSize: '14px' }}>
              {order.orderId || order.id}
            </Typography>
            {order.orderSource === 'swiggy' && (
              <Chip label="SWIGGY" size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontSize: '9px', fontWeight: 800, height: 18 }} />
            )}
            {order.orderSource === 'zomato' && (
              <Chip label="ZOMATO" size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontSize: '9px', fontWeight: 800, height: 18 }} />
            )}
            {order.tableNumber && (
              <Chip label={`Table ${order.tableNumber}`} size="small" sx={{ bgcolor: adminColors.accentRed, color: 'white', fontSize: '9px', fontWeight: 700, height: 18 }} />
            )}
          </Box>
          <Typography variant="caption" sx={{ color: adminColors.textSecondary, display: 'block', mt: 0.3 }}>
            {order.customerName || 'Diner'}
          </Typography>
        </Box>
        <Chip
          label={age <= 0 ? 'Just in' : `${age}m ago`}
          size="small"
          sx={{
            bgcolor: isVeryStale ? adminColors.dangerBg : isStale ? adminColors.warningBg : adminColors.neutralBg,
            color: isVeryStale ? adminColors.danger : isStale ? adminColors.warning : adminColors.neutral,
            fontWeight: 800, fontSize: '10px', flexShrink: 0,
          }}
        />
      </Box>

      <Box sx={{ p: 1.75 }}>
        {(order.items || []).map((item, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8,
              borderBottom: i < order.items.length - 1 ? `1px solid ${adminColors.divider}` : 'none',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: adminColors.textPrimary }}>{item.name}</Typography>
            <Chip label={`×${item.quantity || 1}`} size="small" sx={{ bgcolor: adminColors.bgSubtle, fontSize: '11px', fontWeight: 800, height: 22 }} />
          </Box>
        ))}

        {lane.next ? (
          <Box
            component="button"
            onClick={() => onAdvance(order.id, lane.next as OrderStatus)}
            sx={{
              mt: 1.5, width: '100%', border: 'none', cursor: 'pointer',
              borderRadius: adminColors.radiusSm, py: 1.4, fontSize: '13px', fontWeight: 800,
              color: 'white', bgcolor: lane.accent,
              transition: 'transform 0.1s ease', '&:active': { transform: 'scale(0.97)' },
            }}
          >
            {lane.cta}
          </Box>
        ) : (
          <Box sx={{ mt: 1.5, textAlign: 'center', py: 1, borderRadius: adminColors.radiusSm, bgcolor: adminColors.successBg }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: adminColors.success }}>🎉 Delivered</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function KitchenPage() {
  const { orders, updateOrderStatus } = useAdmin();
  const now = useNow();

  const activeOrders = orders.filter((o) => o.status !== 'cancelled');
  const deliveredCount = activeOrders.filter((o) => o.status === 'delivered').length;
  const laneOrders = (status: OrderStatus) => activeOrders.filter((o) => o.status === status);

  return (
    <AdminLayout title="Kitchen Display System">
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
          <StatCard icon="✅" label="Delivered Today" value={deliveredCount} accent={adminColors.info} />
        </Grid>
      </Grid>

      {activeOrders.length === 0 ? (
        <SectionCard>
          <EmptyState
            emoji="👨‍🍳"
            title="Kitchen queue is empty"
            subtitle="New orders from the website & POS will appear here instantly."
          />
        </SectionCard>
      ) : (
        <Grid container spacing={2}>
          {LANES.map((lane) => {
            const laneItems = laneOrders(lane.status);
            return (
              <Grid key={lane.status} size={{ xs: 12, md: 4 }}>
                <Box sx={{
                  borderRadius: adminColors.radiusLg, bgcolor: adminColors.bgSubtle,
                  border: `1px solid ${adminColors.borderSubtle}`, p: 1.5, minHeight: 200,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '13px', color: adminColors.textPrimary }}>
                      {lane.emoji} {lane.label}
                    </Typography>
                    <Chip label={laneItems.length} size="small" sx={{ bgcolor: `${lane.accent}22`, color: lane.accent, fontWeight: 800, height: 20 }} />
                  </Box>
                  {laneItems.length === 0 ? (
                    <Typography variant="caption" sx={{ color: adminColors.textMuted, display: 'block', textAlign: 'center', py: 3 }}>
                      Nothing here
                    </Typography>
                  ) : (
                    laneItems.map((order) => (
                      <KitchenTicket key={order.id} order={order} lane={lane} onAdvance={updateOrderStatus} now={now} />
                    ))
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </AdminLayout>
  );
}
