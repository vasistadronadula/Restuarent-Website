'use client';

import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Avatar, IconButton, Tooltip, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem as MuiMenuItem, Switch,
  CircularProgress, InputAdornment, useMediaQuery, useTheme, Paper, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Edit, Add, Close, Delete, Visibility, VisibilityOff, ContentCopy, Check, VpnKey,
  Search, FormatListBulleted, GridView, Refresh, Security, Work,
  PersonAdd, Badge, Lock, Shield, Key,
} from '@mui/icons-material';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useAddEmployeeMutation, useUpdateEmployeeMutation, useDeleteEmployeeMutation } from '@/store/supabaseApi';
import { generateEmployeeId } from '@/lib/idGenerator';
import { Employee, StaffRole } from '@/types';
import {
  ROLE_LABELS, ROLE_ACCESS_SUMMARY, ROLE_ICONS, STAFF_ROLES,
  assignableRoles, canManageStaffRole,
} from '@/lib/roleAccess';
import { PageHeader, StatCard, SectionCard, EmptyState, adminColors, roleColors } from '@/components/admin/ui';
import toast from 'react-hot-toast';

const SHIFTS = ['morning', 'evening', 'night'];

const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

// ─── Minimal Role Picker ──────────────────────────────────────────────────────

function RolePicker({
  value, onChange, roles,
}: {
  value: StaffRole; onChange: (r: StaffRole) => void; roles: readonly StaffRole[];
}) {
  return (
    <Grid container spacing={1.5}>
      {roles.map((role) => {
        const selected = value === role;
        const c = roleColors[role];
        return (
          <Grid key={role} size={{ xs: 12, sm: 6 }}>
            <Box
              component="button"
              type="button"
              onClick={() => onChange(role)}
              sx={{
                display: 'flex', alignItems: 'flex-start', gap: 1.2, width: '100%',
                p: 1.75, borderRadius: '14px', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit',
                bgcolor: selected ? c.bg : '#FFFFFF',
                border: `2px solid ${selected ? c.color : 'rgba(0,0,0,0.08)'}`,
                boxShadow: selected ? '0 4px 14px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: c.color },
              }}
            >
              <Box sx={{
                width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                bgcolor: selected ? '#FFFFFF' : c.bg, color: c.color, fontWeight: 900,
              }}>
                {ROLE_ICONS[role]}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: selected ? c.color : 'text.primary' }}>
                    {ROLE_LABELS[role]}
                  </Typography>
                  {selected && <Check sx={{ fontSize: 16, color: c.color }} />}
                </Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.3, lineHeight: 1.3 }}>
                  {ROLE_ACCESS_SUMMARY[role]}
                </Typography>
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

// ─── Minimal Create / Edit Staff Dialog ───────────────────────────────────────

function EmployeeDialog({
  open, editing, roles, onClose, onCreated,
}: {
  open: boolean; editing: Employee | null; roles: readonly StaffRole[];
  onClose: () => void;
  onCreated: (email: string, password: string, isReset?: boolean) => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [addEmployee, { isLoading: adding }] = useAddEmployeeMutation();
  const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
  const isEdit = !!editing;

  const [form, setForm] = useState(() => ({
    name: editing?.name ?? '',
    email: editing?.email ?? '',
    phone: editing?.phone ?? '',
    role: (editing?.role ?? 'waiter') as StaffRole,
    shift: editing?.shift ?? 'morning',
    salary: String(editing?.salary ?? ''),
    password: '',
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!isEdit) {
      if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid login email required';
      if (!form.password || form.password.length < 6) e.password = 'Min 6 characters required';
    } else if (form.password && form.password.length < 6) {
      e.password = 'New password must be at least 6 characters';
    }

    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (isEdit && editing) {
      const payload: Parameters<typeof updateEmployee>[0] = {
        id: editing.id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        shift: form.shift,
        salary: Number(form.salary) || 0,
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const result = await updateEmployee(payload);
      if ('error' in result && result.error) {
        toast.error((result.error as { error?: string }).error || 'Failed to update member');
        return;
      }

      if (form.password.trim()) {
        toast.success(`Password reset for ${form.name.trim()}!`);
        onCreated(editing.email, form.password.trim(), true);
      } else {
        toast.success(`${form.name.trim()} details updated`);
      }
      onClose();
      return;
    }

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
      toast.error((result.error as { error?: string }).error || 'Failed to add staff member');
      return;
    }
    onCreated(form.email.trim().toLowerCase(), form.password, false);
    onClose();
  };

  const busy = adding || updating;

  return (
    <Dialog
      open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}
      slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : '24px', p: { xs: 1, sm: 2 } } } }}
    >
      <DialogTitle sx={{ fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: adminColors.accentRed }}>
        {isEdit ? `✏️ Manage Staff Member: ${editing?.name}` : '➕ Create New Staff Account'}
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '18px', border: '1px solid rgba(0,0,0,0.08)', bgcolor: '#FAF9F8', mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.primary', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            👤 1. Basic Profile & Contact Details
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth size="small" label="Full Name *" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={!!errors.name} helperText={errors.name}
                placeholder="e.g. Rahul Sharma"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '10px' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth size="small" label="Mobile Phone" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit phone number"
                slotProps={{ htmlInput: { maxLength: 10 } }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '10px' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth size="small" label="Login Email Address *" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={isEdit}
                error={!!errors.email}
                helperText={errors.email || (isEdit ? 'Login email is fixed.' : 'Employee uses this email to log in.')}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '10px' } }}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Work Shift</InputLabel>
                <Select
                  value={form.shift} label="Work Shift"
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                  sx={{ bgcolor: 'white', borderRadius: '10px' }}
                >
                  {SHIFTS.map((s) => (
                    <MuiMenuItem key={s} value={s} sx={{ textTransform: 'capitalize', fontWeight: 700 }}>
                      {s === 'morning' ? '🌅 Morning' : s === 'evening' ? '🌆 Evening' : '🌙 Night'}
                    </MuiMenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth size="small" label="Monthly Salary (₹)" type="number" value={form.salary}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setForm({ ...form, salary: String(val) });
                }}
                slotProps={{ htmlInput: { min: 0 } }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '10px' } }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Section 2: Role & System Access */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '18px', border: '1px solid rgba(0,0,0,0.08)', bgcolor: '#FAF9F8', mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.primary', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            🛡️ 2. System Role & Access Level
          </Typography>
          <RolePicker roles={roles} value={form.role} onChange={(role) => setForm({ ...form, role })} />
        </Paper>

        {/* Section 3: Password & Security */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '18px', border: `1px solid ${isEdit ? '#FFB74D' : 'rgba(0,0,0,0.08)'}`, bgcolor: isEdit ? '#FFF8F2' : '#FAF9F8' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: isEdit ? '#E65100' : 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            🔑 3. Account Password & Security {isEdit ? '(Reset Password)' : ''}
          </Typography>

          <TextField
            fullWidth size="small"
            label={isEdit ? 'Set New Password' : 'Initial Login Password *'}
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={!!errors.password}
            helperText={
              errors.password ||
              (isEdit
                ? 'Type a new password to reset account login password. Leave blank to keep existing password.'
                : 'Share this password with employee directly.')
            }
            placeholder={isEdit ? 'Type new password to reset...' : 'Min 6 characters'}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '10px' } }}
          />
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 3, pt: 1, gap: 1.5 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          variant="contained" onClick={handleSave} disabled={busy}
          sx={{
            bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark },
            borderRadius: '12px', fontWeight: 900, px: 3.5, py: 1.1, fontSize: '14.5px',
          }}
        >
          {busy ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save Changes' : 'Create Staff Account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Standalone Reset Password Dialog ────────────────────────────────────────

function ResetPasswordDialog({
  emp, onClose, onSuccess,
}: {
  emp: Employee | null;
  onClose: () => void;
  onSuccess: (email: string, password: string) => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateEmployee] = useUpdateEmployeeMutation();

  React.useEffect(() => {
    if (emp) {
      setNewPassword('');
      setShowPassword(true);
    }
  }, [emp]);

  if (!emp) return null;

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setUpdating(true);
    try {
      const result = await updateEmployee({ id: emp.id, password: newPassword });
      if ('error' in result && result.error) {
        toast.error((result.error as { error?: string }).error || 'Failed to reset password');
        return;
      }
      toast.success(`Password reset for ${emp.name}`);
      onSuccess(emp.email, newPassword);
      onClose();
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={!!emp} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}>
      <DialogTitle sx={{ fontWeight: 900, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: adminColors.accentRed }}>
        🔑 Reset Staff Password
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
          Set a new login password for <strong>{emp.name}</strong> ({emp.email}):
        </Typography>

        <TextField
          fullWidth size="small"
          label="New Password *"
          type={showPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Min 6 characters"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 700 }}>Cancel</Button>
        <Button
          variant="contained" onClick={handleReset} disabled={updating || !newPassword}
          sx={{ bgcolor: adminColors.accentRed, borderRadius: '10px', fontWeight: 800 }}
        >
          {updating ? <CircularProgress size={20} color="inherit" /> : 'Set New Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Credentials Reveal Dialog ────────────────────────────────────────────────

function CredentialsDialog({ creds, onClose }: { creds: { email: string; password: string; isReset?: boolean } | null; onClose: () => void }) {
  if (!creds) return null;
  const copy = () => {
    navigator.clipboard?.writeText(`Email: ${creds.email}\nPassword: ${creds.password}`);
    toast.success('Login credentials copied to clipboard! 📋');
  };
  return (
    <Dialog open={!!creds} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}>
      <DialogTitle sx={{ fontWeight: 900, fontSize: 18, color: adminColors.accentRed }}>
        {creds.isReset ? '🔑 Password Reset Complete' : '✅ Account Created Successfully'}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
          {creds.isReset
            ? 'Share this new password with the team member so they can sign in.'
            : 'Share these credentials with your team member directly.'}
        </Typography>
        <Box sx={{ p: 2.5, borderRadius: '16px', bgcolor: '#FFF8F2', border: '1px solid #FFCCBC' }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 900, letterSpacing: '0.5px' }}>LOGIN EMAIL</Typography>
          <Typography sx={{ fontWeight: 800, mb: 1.5, wordBreak: 'break-all', fontSize: 14 }}>{creds.email}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 900, letterSpacing: '0.5px' }}>
            {creds.isReset ? 'NEW PASSWORD' : 'TEMPORARY PASSWORD'}
          </Typography>
          <Typography sx={{ fontWeight: 900, fontFamily: 'monospace', fontSize: 18, color: adminColors.accentRed }}>
            {creds.password}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button startIcon={<ContentCopy />} onClick={copy} sx={{ color: adminColors.accentRed, fontWeight: 800 }}>
          Copy Credentials
        </Button>
        <Button variant="contained" onClick={onClose} sx={{ bgcolor: adminColors.accentRed, borderRadius: '10px', fontWeight: 800 }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Employees Page ──────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { employees } = useAdmin();
  const { user, userRole, loading: authLoading } = useAuth();
  const [updateEmployee] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();

  const canManageTeam = userRole === 'admin' || userRole === 'manager';
  const roles = useMemo(() => assignableRoles(userRole), [userRole]);

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [resettingEmp, setResettingEmp] = useState<Employee | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string; isReset?: boolean } | null>(null);

  const lockReasonFor = (target: Employee): string | null => {
    if (authLoading || !userRole) return 'Checking your permissions…';
    if (!canManageTeam) return 'Only an admin or manager can manage staff';
    if (!canManageStaffRole(userRole, target.role)) return 'Only an admin can change an admin account';
    return null;
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: employees.length };
    employees.forEach((e) => { c[e.role] = (c[e.role] || 0) + 1; });
    return c;
  }, [employees]);

  const totalMonthlyPayroll = useMemo(
    () => employees.filter((e) => e.isActive).reduce((s, e) => s + (Number(e.salary) || 0), 0),
    [employees]
  );

  const visibleEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchRole = roleFilter === 'all' || e.role === roleFilter;
      const matchShift = shiftFilter === 'all' || e.shift === shiftFilter;
      const matchSearch = !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        e.phone.includes(search);

      return matchRole && matchShift && matchSearch;
    });
  }, [employees, roleFilter, shiftFilter, search]);

  const activeCount = employees.filter((e) => e.isActive).length;
  const currentEmail = (user?.email || '').toLowerCase();

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (emp: Employee) => { setEditing(emp); setDialogOpen(true); };

  const handleToggle = async (emp: Employee) => {
    const result = await updateEmployee({ id: emp.id, status: emp.isActive ? 'Inactive' : 'Active' });
    if ('error' in result && result.error) { toast.error('Failed to update status'); return; }
    toast.success(emp.isActive ? `${emp.name} disabled — login revoked` : `${emp.name} account re-enabled`);
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Permanently remove ${emp.name}? Their login access will be revoked.`)) return;
    const result = await deleteEmployee(emp.id);
    if ('error' in result && result.error) { toast.error('Failed to remove employee'); return; }
    toast.success(`${emp.name} removed`);
  };

  return (
    <AdminLayout title="Staff Directory">
      <PageHeader
        title="Staff Directory & Access"
        subtitle={`${activeCount} active staff accounts. Manage roles, shifts, and credentials.`}
        action={
          <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="outlined" startIcon={<Refresh />}
              onClick={() => toast.success('Staff directory refreshed!')}
              sx={{ borderRadius: '12px', fontWeight: 800 }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined" startIcon={<VpnKey />}
              onClick={() => {
                if (employees.length > 0) setResettingEmp(employees[0]);
              }}
              sx={{ borderRadius: '12px', fontWeight: 800, bgcolor: '#FFFBEB', color: '#B45309', borderColor: '#FCD34D' }}
            >
              Reset Password
            </Button>
            <Button
              variant="contained" startIcon={<PersonAdd />} onClick={openAdd}
              disabled={!canManageTeam}
              sx={{ bgcolor: adminColors.accentRed, '&:hover': { bgcolor: adminColors.accentRedDark }, borderRadius: '12px', fontWeight: 800 }}
            >
              + Add Staff Member
            </Button>
          </Box>
        }
      />

      {/* Analytics KPI Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="👥" label="Active Team Size" value={activeCount} sub={`Total staff: ${employees.length}`} accent={adminColors.accentRed} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="💰" label="Monthly Payroll Total" value={`₹${totalMonthlyPayroll.toLocaleString('en-IN')}`} sub="Active salary total" accent={adminColors.success} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="🌅" label="Morning Shift" value={employees.filter((e) => e.shift === 'morning').length} sub="Morning staff" accent={adminColors.info} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard icon="🌆" label="Evening / Night Shift" value={employees.filter((e) => e.shift === 'evening' || e.shift === 'night').length} sub="Evening & night" accent={adminColors.accentOrange} />
        </Grid>
      </Grid>

      {/* Search, Filter & Layout View Switcher Bar */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: `1px solid ${adminColors.border}`, bgcolor: 'white', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            size="small" placeholder="Search staff by name, email, or phone..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 320 }, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9E9E9E', fontSize: 18 }} /></InputAdornment> } }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Shift Filter</InputLabel>
              <Select value={shiftFilter} label="Shift Filter" onChange={(e) => setShiftFilter(e.target.value)}>
                <MuiMenuItem value="all">All Shifts</MuiMenuItem>
                <MuiMenuItem value="morning">🌅 Morning</MuiMenuItem>
                <MuiMenuItem value="evening">🌆 Evening</MuiMenuItem>
                <MuiMenuItem value="night">🌙 Night</MuiMenuItem>
              </Select>
            </FormControl>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              size="small"
              sx={{ bgcolor: '#FFF8F2', p: 0.5, borderRadius: '12px' }}
            >
              <ToggleButton value="table" sx={{ borderRadius: '10px', fontWeight: 800, px: 2 }}>
                <FormatListBulleted sx={{ mr: 0.8, fontSize: 18 }} /> Staff Directory Table
              </ToggleButton>
              <ToggleButton value="cards" sx={{ borderRadius: '10px', fontWeight: 800, px: 2 }}>
                <GridView sx={{ mr: 0.8, fontSize: 18 }} /> Org Cards
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Role Filter Chips Bar */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`All Roles (${counts.all || 0})`}
            onClick={() => setRoleFilter('all')}
            sx={{
              fontWeight: 800, fontSize: 12, cursor: 'pointer',
              bgcolor: roleFilter === 'all' ? adminColors.accentRed : '#F5F5F5',
              color: roleFilter === 'all' ? 'white' : 'text.primary',
            }}
          />
          {STAFF_ROLES.map((role) => {
            const count = counts[role] || 0;
            const c = roleColors[role];
            return (
              <Chip
                key={role}
                label={`${ROLE_ICONS[role]} ${ROLE_LABELS[role]} (${count})`}
                onClick={() => setRoleFilter(role)}
                sx={{
                  fontWeight: 800, fontSize: 12, cursor: 'pointer',
                  bgcolor: roleFilter === role ? c.color : '#F5F5F5',
                  color: roleFilter === role ? 'white' : 'text.primary',
                }}
              />
            );
          })}
        </Box>
      </Paper>

      {/* ── VIEW 1: STAFF DIRECTORY ENTERPRISE TABLE ───────────────────────────── */}
      {viewMode === 'table' && (
        <SectionCard noPadding sx={{ mb: 4 }}>
          {visibleEmployees.length === 0 ? (
            <EmptyState emoji="👥" title="No staff members found" subtitle="Try clearing the search query or changing role filters." />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 900 }}>
                <TableHead sx={{ bgcolor: adminColors.bgSubtle }}>
                  <TableRow>
                    {['Staff Member', 'Login Email', 'Role & Access', 'Work Shift', 'Monthly Salary', 'Status', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 900, fontSize: '12px', color: '#616161', py: 1.5, whiteSpace: 'nowrap' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleEmployees.map((emp) => {
                    const c = roleColors[emp.role] || roleColors.waiter;
                    const isSelf = !!currentEmail && emp.email.toLowerCase() === currentEmail;
                    const lockedReason = lockReasonFor(emp);
                    const manageable = !lockedReason;

                    return (
                      <TableRow key={emp.id} hover sx={{ '&:last-child td': { border: 0 }, opacity: emp.isActive ? 1 : 0.6 }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: c.bg, color: c.color, fontWeight: 900, fontSize: 13 }}>
                              {initialsOf(emp.name)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>{emp.name}</Typography>
                              <Typography variant="caption" color="text.secondary">📞 {emp.phone || 'No phone'}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{emp.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${ROLE_ICONS[emp.role]} ${ROLE_LABELS[emp.role]}`}
                            size="small"
                            sx={{ bgcolor: c.bg, color: c.color, fontWeight: 900, fontSize: '11px' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 700 }}>
                            {emp.shift === 'morning' ? '🌅 Morning' : emp.shift === 'evening' ? '🌆 Evening' : '🌙 Night'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {emp.salary > 0 ? `₹${emp.salary.toLocaleString('en-IN')}` : '–'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={lockedReason || (isSelf ? "Cannot disable own account" : emp.isActive ? 'Active — can sign in' : 'Disabled')}>
                            <Switch
                              size="small"
                              checked={emp.isActive}
                              onChange={() => handleToggle(emp)}
                              disabled={isSelf || !manageable}
                              color="success"
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Button
                              size="small" variant="outlined"
                              startIcon={<VpnKey sx={{ fontSize: 13 }} />}
                              onClick={() => setResettingEmp(emp)}
                              disabled={!manageable}
                              sx={{ borderRadius: '8px', fontSize: '11px', fontWeight: 800, py: 0.3, bgcolor: '#FFFBEB', color: '#B45309', borderColor: '#FCD34D' }}
                            >
                              Reset Pwd
                            </Button>
                            <IconButton size="small" onClick={() => openEdit(emp)} disabled={!manageable} sx={{ color: '#1976D2' }}>
                              <Edit sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete(emp)} disabled={isSelf || !manageable} sx={{ color: adminColors.accentRed }}>
                              <Delete sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </SectionCard>
      )}

      {/* ── VIEW 2: TEAM ORG CARDS VIEW ────────────────────────────────────────── */}
      {viewMode === 'cards' && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {visibleEmployees.map((emp) => {
            const c = roleColors[emp.role] || roleColors.waiter;
            const isSelf = !!currentEmail && emp.email.toLowerCase() === currentEmail;
            const lockedReason = lockReasonFor(emp);
            const manageable = !lockedReason;

            return (
              <Grid key={emp.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5, borderRadius: '20px', border: `1px solid ${adminColors.border}`,
                    bgcolor: 'white', opacity: emp.isActive ? 1 : 0.6,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 42, height: 42, bgcolor: c.bg, color: c.color, fontWeight: 900, fontSize: 15 }}>
                        {initialsOf(emp.name)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                          {emp.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {emp.email}
                        </Typography>
                      </Box>
                    </Box>
                    <Switch size="small" checked={emp.isActive} onChange={() => handleToggle(emp)} disabled={isSelf || !manageable} color="success" />
                  </Box>

                  <Chip
                    label={`${ROLE_ICONS[emp.role]} ${ROLE_LABELS[emp.role]}`}
                    size="small"
                    sx={{ bgcolor: c.bg, color: c.color, fontWeight: 900, fontSize: '11px', mb: 1.5 }}
                  />

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                      Shift: {emp.shift}
                    </Typography>
                    {emp.salary > 0 && (
                      <Typography variant="caption" sx={{ fontWeight: 900, color: adminColors.accentRed }}>
                        ₹{emp.salary.toLocaleString('en-IN')}/mo
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      size="small" variant="outlined"
                      startIcon={<VpnKey sx={{ fontSize: 13 }} />}
                      onClick={() => setResettingEmp(emp)}
                      disabled={!manageable}
                      sx={{ borderRadius: '8px', fontSize: '11px', fontWeight: 800, py: 0.4, bgcolor: '#FFFBEB', color: '#B45309', borderColor: '#FCD34D', flex: 1 }}
                    >
                      Reset Pwd
                    </Button>
                    <Button
                      size="small" variant="contained"
                      startIcon={<Edit sx={{ fontSize: 14 }} />}
                      onClick={() => openEdit(emp)}
                      disabled={!manageable}
                      sx={{ borderRadius: '10px', fontSize: '12px', fontWeight: 800, bgcolor: adminColors.accentRed, flex: 1 }}
                    >
                      Edit Member
                    </Button>
                    <IconButton size="small" onClick={() => handleDelete(emp)} disabled={isSelf || !manageable} sx={{ color: adminColors.accentRed }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create / Edit Employee Dialog */}
      <EmployeeDialog
        key={`emp-dialog-${dialogOpen}-${editing?.id ?? 'new'}`}
        open={dialogOpen}
        editing={editing}
        roles={roles}
        onClose={() => setDialogOpen(false)}
        onCreated={(email, password, isReset) => setCreds({ email, password, isReset })}
      />

      {/* Standalone Reset Password Dialog */}
      <ResetPasswordDialog
        emp={resettingEmp}
        onClose={() => setResettingEmp(null)}
        onSuccess={(email, password) => setCreds({ email, password, isReset: true })}
      />

      {/* Copy Credentials Modal */}
      <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />
    </AdminLayout>
  );
}
