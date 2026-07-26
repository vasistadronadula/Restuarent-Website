'use client';
import React, { useState } from 'react';
import {
  Box, Typography, Grid, Avatar, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem as MuiMenuItem, Switch,
  CircularProgress, Stack, InputAdornment, useMediaQuery, useTheme,
} from '@mui/material';
import { Edit, Phone, Email, Add, Close, Delete, Visibility, VisibilityOff, Casino, ContentCopy } from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAddEmployeeMutation, useUpdateEmployeeMutation, useDeleteEmployeeMutation } from '@/store/supabaseApi';
import { generateEmployeeId } from '@/lib/idGenerator';
import { Employee, StaffRole } from '@/types';
import { ROLE_LABELS, ROLE_ALLOWED_PREFIXES } from '@/lib/roleAccess';
import { PageHeader, StatCard, SectionCard, RoleBadge, EmptyState, adminColors, roleColors } from '@/components/admin/ui';
import toast from 'react-hot-toast';

const ROLES: StaffRole[] = ['admin', 'manager', 'chef', 'cashier', 'waiter'];
const SHIFTS = ['morning', 'evening', 'night'];

const roleAccessSummary = (role: StaffRole): string => {
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  if (allowed === 'all') return 'Full access — every admin page';
  return `Access: ${allowed.join(', ')}`;
};

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const emptyForm = { name: '', email: '', phone: '', role: 'waiter' as StaffRole, shift: 'morning', salary: '25000', password: '' };

// ─── Add Employee Dialog ────────────────────────────────────────────────────
function AddEmployeeDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (email: string, password: string) => void }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [addEmployee, { isLoading }] = useAddEmployeeMutation();
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => { setForm(emptyForm); setErrors({}); setShowPassword(false); };

  const handleSave = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email is required';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const result = await addEmployee({
      id: generateEmployeeId(),
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      role: form.role,
      shift: form.shift,
      salary: Number(form.salary) || 0,
      password: form.password,
    });

    if ('error' in result && result.error) {
      toast.error((result.error as { error?: string }).error || 'Failed to add employee');
      return;
    }
    onCreated(form.email.trim().toLowerCase(), form.password);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth fullScreen={isMobile}
      slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : adminColors.radiusLg } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: adminColors.accentRed, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        + Add New Employee
        {isMobile && <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={!!errors.name} helperText={errors.name} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Login Email *" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={!!errors.email} helperText={errors.email || 'This becomes their login username.'} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Role *</InputLabel>
              <Select value={form.role} label="Role *" onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
                {ROLES.map((r) => <MuiMenuItem key={r} value={r}>{ROLE_LABELS[r]}</MuiMenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, ml: 0.5, color: adminColors.textMuted }}>
              {roleAccessSummary(form.role)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Shift</InputLabel>
              <Select value={form.shift} label="Shift" onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                {SHIFTS.map((s) => <MuiMenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MuiMenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Monthly Salary (₹)" type="number" value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth label="Initial Password *" type={showPassword ? 'text' : 'password'}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={!!errors.password} helperText={errors.password || 'Share this with them directly — no email is sent.'}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Generate password">
                        <IconButton size="small" onClick={() => setForm({ ...form, password: generateTempPassword() })}>
                          <Casino fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small" onClick={() => setShowPassword((v) => !v)}>
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 2.5, gap: 1 }}>
        <Button onClick={() => { reset(); onClose(); }} sx={{ color: '#616161' }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={isLoading}
          sx={{ bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark }, borderRadius: '10px', fontWeight: 700 }}>
          {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Create Login & Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Edit Employee Dialog ───────────────────────────────────────────────────
function EditEmployeeDialog({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [updateEmployee, { isLoading }] = useUpdateEmployeeMutation();
  const [form, setForm] = useState(() => ({
    name: employee?.name || '', phone: employee?.phone || '',
    role: (employee?.role || 'waiter') as StaffRole, shift: employee?.shift || 'morning',
    salary: String(employee?.salary || 0),
  }));

  if (!employee) return null;

  const handleSave = async () => {
    const result = await updateEmployee({
      id: employee.id, name: form.name.trim(), phone: form.phone.trim(),
      role: form.role, shift: form.shift, salary: Number(form.salary) || 0,
    });
    if ('error' in result && result.error) {
      toast.error((result.error as { error?: string }).error || 'Failed to update employee');
      return;
    }
    toast.success(`${form.name.trim()} updated`);
    onClose();
  };

  return (
    <Dialog open={!!employee} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}
      slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : adminColors.radiusLg } } }}>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Edit {employee.name}
        {isMobile && <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={form.role} label="Role" onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
                {ROLES.map((r) => <MuiMenuItem key={r} value={r}>{ROLE_LABELS[r]}</MuiMenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, ml: 0.5, color: adminColors.textMuted }}>
              {roleAccessSummary(form.role)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Shift</InputLabel>
              <Select value={form.shift} label="Shift" onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                {SHIFTS.map((s) => <MuiMenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MuiMenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Monthly Salary (₹)" type="number" value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 2.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: '#616161' }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={isLoading}
          sx={{ bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark }, borderRadius: '10px', fontWeight: 700 }}>
          {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Credentials Reveal Dialog ──────────────────────────────────────────────
function CredentialsDialog({ creds, onClose }: { creds: { email: string; password: string } | null; onClose: () => void }) {
  if (!creds) return null;
  const copy = () => {
    navigator.clipboard?.writeText(`Email: ${creds.email}\nPassword: ${creds.password}`);
    toast.success('Copied to clipboard');
  };
  return (
    <Dialog open={!!creds} onClose={onClose} maxWidth="xs" fullWidth
      slotProps={{ paper: { sx: { borderRadius: adminColors.radiusLg } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: adminColors.success }}>✅ Employee Added</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: adminColors.textSecondary, mb: 2 }}>
          Share these login details with them directly — they won&apos;t be shown again.
        </Typography>
        <Box sx={{ p: 2, borderRadius: adminColors.radiusMd, bgcolor: adminColors.bgSubtle, border: `1px solid ${adminColors.borderSubtle}` }}>
          <Typography variant="caption" sx={{ color: adminColors.textMuted, fontWeight: 700 }}>EMAIL</Typography>
          <Typography sx={{ fontWeight: 700, mb: 1.5, wordBreak: 'break-all' }}>{creds.email}</Typography>
          <Typography variant="caption" sx={{ color: adminColors.textMuted, fontWeight: 700 }}>PASSWORD</Typography>
          <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '16px' }}>{creds.password}</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button startIcon={<ContentCopy />} onClick={copy} sx={{ color: adminColors.accentRed }}>Copy</Button>
        <Button variant="contained" onClick={onClose} sx={{ bgcolor: adminColors.accentRed, borderRadius: '10px', fontWeight: 700 }}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const { employees } = useAdmin();
  const [updateEmployee] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('md'));

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);

  const total = employees.length;
  const active = employees.filter((e) => e.isActive).length;

  const initials = (name: string) => name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleToggleActive = async (emp: Employee) => {
    const result = await updateEmployee({ id: emp.id, status: emp.isActive ? 'Inactive' : 'Active' });
    if ('error' in result && result.error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success(emp.isActive ? `${emp.name} deactivated — login disabled` : `${emp.name} reactivated`);
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Remove ${emp.name}? Their login will be permanently revoked.`)) return;
    const result = await deleteEmployee(emp.id);
    if ('error' in result && result.error) {
      toast.error('Failed to remove employee');
      return;
    }
    toast.success(`${emp.name} removed`);
  };

  return (
    <AdminLayout title="Employee Management">
      <PageHeader
        title="Team & Access"
        subtitle="Add staff, assign roles, and control exactly which pages each person can reach."
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)}
            sx={{ bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark }, borderRadius: '12px', fontWeight: 700 }}>
            Add Employee
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="👥" label="Total Staff" value={total} accent={adminColors.info} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="✅" label="Active" value={active} accent={adminColors.success} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="🏠" label="Inactive" value={total - active} accent={adminColors.neutral} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="💰" label="Monthly Payroll" value={`₹${employees.reduce((s, e) => s + e.salary, 0).toLocaleString()}`} accent={adminColors.accentOrange} />
        </Grid>
      </Grid>

      <SectionCard noPadding>
        {employees.length === 0 ? (
          <EmptyState emoji="👥" title="No staff accounts yet" subtitle='Click "Add Employee" to create the first login.' />
        ) : isMobile ? (
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack spacing={1.5}>
              {employees.map((emp) => (
                <Box key={emp.id} sx={{ p: 1.75, borderRadius: adminColors.radiusMd, border: `1px solid ${adminColors.borderSubtle}`, bgcolor: adminColors.bgSubtle }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
                      <Avatar sx={{ bgcolor: roleColors[emp.role]?.color || adminColors.accentRed, fontWeight: 700 }}>{initials(emp.name)}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{emp.name}</Typography>
                        <RoleBadge role={emp.role} />
                      </Box>
                    </Box>
                    <Switch size="small" checked={emp.isActive} onChange={() => handleToggleActive(emp)} color="success" />
                  </Box>
                  <Stack spacing={0.4} sx={{ mt: 1.25 }}>
                    {emp.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Phone sx={{ fontSize: 13, color: '#9E9E9E' }} />
                        <Typography variant="caption">{emp.phone}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Email sx={{ fontSize: 13, color: '#9E9E9E' }} />
                      <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{emp.email}</Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
                    <Button size="small" startIcon={<Edit sx={{ fontSize: 16 }} />} onClick={() => setEditing(emp)}
                      sx={{ flex: 1, borderRadius: adminColors.radiusSm, fontSize: '11px', bgcolor: 'white', border: `1px solid ${adminColors.border}` }}>
                      Edit
                    </Button>
                    <IconButton size="small" onClick={() => handleDelete(emp)} sx={{ bgcolor: 'white', border: `1px solid ${adminColors.border}`, color: adminColors.accentRed }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={{ bgcolor: adminColors.bgSubtle }}>
                <TableRow>
                  {['Employee', 'Contact', 'Role', 'Shift', 'Salary', 'Status', 'Actions'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: roleColors[emp.role]?.color || adminColors.accentRed, fontWeight: 700 }}>{initials(emp.name)}</Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{emp.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {emp.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Phone sx={{ fontSize: 13, color: '#9E9E9E' }} />
                          <Typography variant="caption">{emp.phone}</Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Email sx={{ fontSize: 13, color: '#9E9E9E' }} />
                        <Typography variant="caption">{emp.email}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><RoleBadge role={emp.role} size="medium" /></TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ textTransform: 'capitalize', bgcolor: adminColors.bgSubtle, px: 1, py: 0.4, borderRadius: '8px', fontWeight: 600 }}>
                        {emp.shift}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{emp.salary.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">/month</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={emp.isActive ? 'Deactivate — revokes login' : 'Reactivate — restores login'}>
                        <Switch size="small" checked={emp.isActive} onChange={() => handleToggleActive(emp)} color="success" />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Edit Employee">
                          <IconButton size="small" onClick={() => setEditing(emp)}><Edit sx={{ fontSize: 18, color: '#1565C0' }} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Remove — revokes login permanently">
                          <IconButton size="small" onClick={() => handleDelete(emp)}><Delete sx={{ fontSize: 18, color: adminColors.accentRed }} /></IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>

      <AddEmployeeDialog open={addOpen} onClose={() => setAddOpen(false)} onCreated={(email, password) => setCreds({ email, password })} />
      <EditEmployeeDialog employee={editing} onClose={() => setEditing(null)} />
      <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />
    </AdminLayout>
  );
}
