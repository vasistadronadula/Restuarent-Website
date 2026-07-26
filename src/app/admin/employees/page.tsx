'use client';
import React from 'react';
import {
  Box, Paper, Typography, Grid, Chip, Avatar, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, Tooltip, Button,
} from '@mui/material';
import { Edit, Phone, Email } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';

const roleColors = {
  admin:   { bg: 'rgba(198,40,40,0.1)',    color: '#C62828' },
  manager: { bg: 'rgba(21,101,192,0.1)',   color: '#1565C0' },
  cashier: { bg: 'rgba(46,125,50,0.1)',    color: '#2E7D32' },
  chef:    { bg: 'rgba(255,152,0,0.1)',    color: '#FF9800' },
  waiter:  { bg: 'rgba(123,31,162,0.1)',   color: '#7B1FA2' },
};

export default function EmployeesPage() {
  const { employees } = useAdmin();

  const total = employees.length;
  const active = employees.filter(e => e.isActive).length;

  return (
    <AdminLayout title="Employee Management">
      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total Staff', value: total, emoji: '👥', color: '#1565C0' },
          { label: 'Active Today', value: active, emoji: '✅', color: '#2E7D32' },
          { label: 'Off Today', value: total - active, emoji: '🏠', color: '#FF9800' },
          { label: 'Monthly Payroll', value: `₹${employees.reduce((s,e)=>s+e.salary,0).toLocaleString()}`, emoji: '💰', color: '#C62828' },
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
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Typography variant="h6" sx={{fontWeight: 700}}>All Employees</Typography>
          <Button variant="contained" size="small" color="primary" sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #C62828, #EF5350)' }}>
            + Add Employee
          </Button>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: '#FAFAFA' }}>
              <TableRow>
                {['Employee', 'Contact', 'Role', 'Shift', 'Salary', 'Join Date', 'Status', 'Actions'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((emp) => {
                const rc = roleColors[emp.role as keyof typeof roleColors];
                return (
                  <TableRow key={emp.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: '#C62828', fontWeight: 700 }}>{emp.avatar}</Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{emp.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Phone sx={{ fontSize: 13, color: '#9E9E9E' }} />
                        <Typography variant="caption">{emp.phone}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Email sx={{ fontSize: 13, color: '#9E9E9E' }} />
                        <Typography variant="caption">{emp.email}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={emp.role.charAt(0).toUpperCase() + emp.role.slice(1)} size="small"
                        sx={{ bgcolor: rc.bg, color: rc.color, fontWeight: 700, textTransform: 'capitalize' }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={`${emp.shift} shift`} size="small" sx={{ bgcolor: '#F5F5F5', textTransform: 'capitalize', fontSize: '11px' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{emp.salary.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">/month</Typography>
                    </TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{emp.joinDate}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        label={emp.isActive ? '● Active' : '● Inactive'}
                        size="small"
                        sx={{ bgcolor: emp.isActive ? 'rgba(46,125,50,0.1)' : 'rgba(0,0,0,0.06)', color: emp.isActive ? '#2E7D32' : '#9E9E9E', fontWeight: 700, fontSize: '11px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit Employee">
                        <IconButton size="small"><Edit sx={{ fontSize: 18, color: '#1565C0' }} /></IconButton>
                      </Tooltip>
                    </TableCell>
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
