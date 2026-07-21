'use client';
import React from 'react';
import {
  Box, Paper, Typography, Grid, Chip, LinearProgress, Alert, Button, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
} from '@mui/material';
import { Warning, CheckCircle, LocalShipping, Inventory as InventoryIcon, Refresh } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

export default function InventoryPage() {
  const { inventory } = useAdmin();

  const lowStock = inventory.filter(i => i.quantity <= i.minQuantity);
  const goodStock = inventory.filter(i => i.quantity > i.minQuantity);

  const getStockLevel = (item: typeof inventory[0]) => {
    const pct = (item.quantity / (item.minQuantity * 3)) * 100;
    if (pct >= 70) return { color: '#2E7D32', label: 'Good', pct: Math.min(pct, 100) };
    if (pct >= 40) return { color: '#FF9800', label: 'Medium', pct };
    return { color: '#C62828', label: 'Low', pct: Math.max(pct, 5) };
  };

  return (
    <AdminLayout title="Inventory Management">
      {/* Alerts */}
      {lowStock.length > 0 && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '14px' }}>
          <Typography sx={{fontWeight: 700}}>⚠️ {lowStock.length} items are running low on stock!</Typography>
          {lowStock.map(i => <Typography key={i.id} variant="body2">• {i.name}: {i.quantity} {i.unit} remaining (min: {i.minQuantity} {i.unit})</Typography>)}
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total Items', value: inventory.length, color: '#1565C0', emoji: '📦' },
          { label: 'Low Stock', value: lowStock.length, color: '#C62828', emoji: '⚠️' },
          { label: 'Good Stock', value: goodStock.length, color: '#2E7D32', emoji: '✅' },
          { label: 'Inventory Value', value: `₹${inventory.reduce((s, i) => s + i.quantity * i.costPerUnit, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#FF9800', emoji: '💰' },
        ].map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
            <Paper sx={{ p: 2.5, borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ fontSize: '2rem' }}>{stat.emoji}</Typography>
              <Box>
                <Typography variant="h5" sx={{fontWeight: 800, color: stat.color}}>{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Typography variant="h6" sx={{fontWeight: 700}}>Stock Levels</Typography>
          <Tooltip title="Refresh Stock">
            <IconButton size="small"><Refresh /></IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: '#FAFAFA' }}>
              <TableRow>
                {['Item', 'Category', 'Current Stock', 'Min Required', 'Stock Level', 'Cost/Unit', 'Value', 'Status', 'Updated'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.map((item) => {
                const stock = getStockLevel(item);
                const isLow = item.quantity <= item.minQuantity;
                return (
                  <TableRow key={item.id} hover sx={{ '&:last-child td': { border: 0 }, bgcolor: isLow ? 'rgba(198,40,40,0.02)' : 'transparent' }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isLow && <Warning sx={{ color: '#C62828', fontSize: 16 }} />}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={item.category} size="small" sx={{ bgcolor: '#F5F5F5', fontSize: '10px' }} /></TableCell>
                    <TableCell>
                      <Typography variant="body2" color={isLow ? 'error' : 'text.primary'} sx={{ fontWeight: 700 }}>
                        {item.quantity} {item.unit}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{item.minQuantity} {item.unit}</Typography></TableCell>
                    <TableCell sx={{ width: 140 }}>
                      <LinearProgress variant="determinate" value={stock.pct}
                        sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.08)',
                          '& .MuiLinearProgress-bar': { bgcolor: stock.color, borderRadius: 4 } }} />
                    </TableCell>
                    <TableCell><Typography variant="body2">₹{item.costPerUnit.toLocaleString()}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>₹{(item.quantity * item.costPerUnit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Typography></TableCell>
                    <TableCell>
                      <Chip label={stock.label} size="small" sx={{ bgcolor: stock.color + '22', color: stock.color, fontWeight: 700, fontSize: '10px' }} />
                    </TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{item.lastUpdated}</Typography></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </AdminLayout>
  );
}
