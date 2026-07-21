'use client';
import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Chip, Button, TextField, Avatar, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  InputAdornment, Tooltip, Card, CardContent,
} from '@mui/material';
import { Search, CheckCircle, Cancel, AccessTime, Event, People, Phone } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { ReservationStatus } from '@/types';

const statusConfig = {
  pending:   { label: 'Pending',   color: '#FF9800', bg: 'rgba(255,152,0,0.1)'    },
  confirmed: { label: 'Confirmed', color: '#2E7D32', bg: 'rgba(46,125,50,0.1)'   },
  completed: { label: 'Completed', color: '#616161', bg: 'rgba(97,97,97,0.1)'    },
  cancelled: { label: 'Cancelled', color: '#C62828', bg: 'rgba(198,40,40,0.1)'   },
};

export default function ReservationsPage() {
  const { reservations, updateReservationStatus } = useAdmin();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'all'>('all');
  const [selected, setSelected] = useState<typeof reservations[0] | null>(null);

  const filtered = useMemo(() => reservations.filter((r) => {
    const matchSearch = !search || r.customerName.toLowerCase().includes(search.toLowerCase()) || r.customerPhone.includes(search);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  }), [reservations, search, filterStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reservations.length };
    reservations.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [reservations]);

  return (
    <AdminLayout title="Reservations">
      {/* Status Chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((s) => (
          <Chip
            key={s}
            label={`${s === 'all' ? 'All' : statusConfig[s as ReservationStatus]?.label} (${counts[s] || 0})`}
            onClick={() => setFilterStatus(s)}
            sx={{
              fontWeight: filterStatus === s ? 700 : 500, cursor: 'pointer',
              bgcolor: filterStatus === s ? (s === 'all' ? '#C62828' : statusConfig[s as ReservationStatus]?.color) : 'white',
              color: filterStatus === s ? 'white' : '#424242',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'all 0.2s',
            }}
          />
        ))}
      </Box>

      <Paper sx={{ borderRadius: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <TextField
            size="small" placeholder="Search by name or phone..."
            value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 300 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: '#FAFAFA' }}>
              <TableRow>
                {['Customer', 'Contact', 'Guests', 'Date & Time', 'Table', 'Status', 'Request', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => {
                const sc = statusConfig[r.status];
                return (
                  <TableRow key={r.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#C62828', fontSize: '11px', fontWeight: 700 }}>
                          {r.customerName.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.customerName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.customerPhone}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <People sx={{ fontSize: 16, color: '#616161' }} />
                        <Typography variant="body2">{r.guests}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.date}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.time}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.tableNumber ? `Table ${r.tableNumber}` : '–'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '11px' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 120, display: 'block' }}>
                        {r.specialRequest || '–'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {r.status === 'pending' && (
                          <>
                            <Tooltip title="Confirm">
                              <IconButton size="small" onClick={() => updateReservationStatus(r.id, 'confirmed')}>
                                <CheckCircle sx={{ color: '#2E7D32', fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel">
                              <IconButton size="small" onClick={() => updateReservationStatus(r.id, 'cancelled')}>
                                <Cancel sx={{ color: '#C62828', fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {r.status === 'confirmed' && (
                          <Button size="small" variant="outlined" color="success"
                            onClick={() => updateReservationStatus(r.id, 'completed')}
                            sx={{ borderRadius: '8px', fontSize: '11px' }}>
                            Complete
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h2" sx={{ fontSize: '2.5rem', mb: 1 }}>📅</Typography>
            <Typography color="text.secondary">No reservations found</Typography>
          </Box>
        )}
      </Paper>
    </AdminLayout>
  );
}
