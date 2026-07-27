'use client';
import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Avatar, IconButton, Tooltip, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem as MuiMenuItem, Switch,
  CircularProgress, InputAdornment, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Edit, Add, Close, Delete, Visibility, VisibilityOff, Casino, ContentCopy, Check,
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
import { PageHeader, SectionCard, EmptyState, adminColors, roleColors } from '@/components/admin/ui';
import toast from 'react-hot-toast';

const SHIFTS = ['morning', 'evening', 'night'];

const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Role picker — the core UX idea of this page ────────────────────────────
// Assigning a role IS assigning permissions, so the picker shows what each
// role unlocks instead of hiding it behind a plain dropdown label.
function RolePicker({
  value, onChange, roles,
}: {
  value: StaffRole; onChange: (r: StaffRole) => void; roles: readonly StaffRole[];
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {roles.map((role) => {
        const selected = value === role;
        const c = roleColors[role];
        return (
          <Box
            key={role}
            component="button"
            type="button"
            onClick={() => onChange(role)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, width: '100%',
              p: 1.5, borderRadius: adminColors.radiusMd, cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
              bgcolor: selected ? c.bg : adminColors.bgPanel,
              border: `1.5px solid ${selected ? c.color : adminColors.border}`,
              transition: 'all 0.12s ease',
              '&:hover': { borderColor: c.color },
            }}
          >
            <Box sx={{
              width: 34, height: 34, borderRadius: adminColors.radiusSm, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              bgcolor: selected ? '#FFFFFF' : c.bg,
            }}>
              {ROLE_ICONS[role]}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: selected ? c.color : adminColors.textPrimary }}>
                {ROLE_LABELS[role]}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: adminColors.textMuted }}>
                {ROLE_ACCESS_SUMMARY[role]}
              </Typography>
            </Box>
            {selected && <Check sx={{ fontSize: 18, color: c.color, flexShrink: 0 }} />}
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Add / Edit dialog (one component, two modes) ───────────────────────────
function EmployeeDialog({
  open, editing, roles, onClose, onCreated,
}: {
  open: boolean; editing: Employee | null; roles: readonly StaffRole[];
  onClose: () => void;
  onCreated: (email: string, password: string) => void;
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
    if (!form.name.trim()) e.name = 'Name is required';
    if (!isEdit) {
      if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email is required';
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
        toast.error((result.error as { error?: string }).error || 'Failed to update');
        return;
      }
      toast.success(
        form.password.trim()
          ? `${form.name.trim()} & password updated successfully!`
          : `${form.name.trim()} updated successfully`
      );
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
      toast.error((result.error as { error?: string }).error || 'Failed to add employee');
      return;
    }
    onCreated(form.email.trim().toLowerCase(), form.password);
    onClose();
  };

  const busy = adding || updating;

  return (
    <Dialog
      open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}
      slotProps={{ paper: { sx: { borderRadius: isMobile ? 0 : adminColors.radiusXl } } }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
        {isEdit ? `Edit ${editing?.name}` : 'Add team member'}
        <IconButton size="small" onClick={onClose} aria-label="Close"><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: '8px !important' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField
              fullWidth size="small" label="Full name *" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={!!errors.name} helperText={errors.name}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              fullWidth size="small" label="Phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              slotProps={{ htmlInput: { maxLength: 10 } }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth size="small" label="Login email *" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={isEdit}
              error={!!errors.email}
              helperText={errors.email || (isEdit ? 'Login email cannot be changed.' : 'They sign in with this.')}
            />
          </Grid>

          {/* Password field: visible for BOTH Add and Edit */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth size="small"
              label={isEdit ? 'Set New Password (optional)' : 'Initial Password *'}
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={!!errors.password}
              helperText={
                errors.password ||
                (isEdit
                  ? 'Leave blank to keep existing password, or enter/generate a new password to reset it.'
                  : 'Share this password with them directly — no email is sent.')
              }
              placeholder={isEdit ? 'Enter new password or click 🎲' : 'Min 6 characters'}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Generate Random Password">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setForm({ ...form, password: generateTempPassword() });
                            setShowPassword(true);
                          }}
                        >
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

          <Grid size={{ xs: 12 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: adminColors.textSecondary, mb: 1 }}>
              Role & access *
            </Typography>
            <RolePicker roles={roles} value={form.role} onChange={(role) => setForm({ ...form, role })} />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Shift</InputLabel>
              <Select value={form.shift} label="Shift" onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                {SHIFTS.map((s) => (
                  <MuiMenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth size="small" label="Salary (₹/month)" type="number" value={form.salary}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value) || 0);
                setForm({ ...form, salary: String(val) });
              }}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: isMobile ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 2.5, pt: 1.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: adminColors.textSecondary, textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained" onClick={handleSave} disabled={busy}
          sx={{
            bgcolor: adminColors.brand, '&:hover': { bgcolor: adminColors.brandDark },
            borderRadius: adminColors.radiusMd, fontWeight: 700, textTransform: 'none', px: 2.5, boxShadow: 'none',
          }}
        >
          {busy ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save changes' : 'Create account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Credentials reveal ─────────────────────────────────────────────────────
function CredentialsDialog({ creds, onClose }: { creds: { email: string; password: string } | null; onClose: () => void }) {
  if (!creds) return null;
  const copy = () => {
    navigator.clipboard?.writeText(`Email: ${creds.email}\nPassword: ${creds.password}`);
    toast.success('Copied to clipboard');
  };
  return (
    <Dialog open={!!creds} onClose={onClose} maxWidth="xs" fullWidth
      slotProps={{ paper: { sx: { borderRadius: adminColors.radiusXl } } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: 17 }}>✅ Account created</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: adminColors.textSecondary, mb: 2 }}>
          Share these details with them directly — the password won&apos;t be shown again.
        </Typography>
        <Box sx={{ p: 2, borderRadius: adminColors.radiusMd, bgcolor: adminColors.bgSubtle, border: `1px solid ${adminColors.border}` }}>
          <Typography sx={{ fontSize: 10.5, color: adminColors.textMuted, fontWeight: 800, letterSpacing: '0.5px' }}>EMAIL</Typography>
          <Typography sx={{ fontWeight: 700, mb: 1.5, wordBreak: 'break-all', fontSize: 14 }}>{creds.email}</Typography>
          <Typography sx={{ fontSize: 10.5, color: adminColors.textMuted, fontWeight: 800, letterSpacing: '0.5px' }}>PASSWORD</Typography>
          <Typography sx={{ fontWeight: 700, fontFamily: 'ui-monospace, monospace', fontSize: 17 }}>{creds.password}</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button startIcon={<ContentCopy />} onClick={copy} sx={{ color: adminColors.brand, textTransform: 'none', fontWeight: 700 }}>
          Copy
        </Button>
        <Button variant="contained" onClick={onClose}
          sx={{ bgcolor: adminColors.brand, '&:hover': { bgcolor: adminColors.brandDark }, borderRadius: adminColors.radiusMd, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Employee card ──────────────────────────────────────────────────────────
function EmployeeCard({
  emp, isSelf, manageable, onEdit, onToggle, onDelete,
}: {
  emp: Employee; isSelf: boolean; manageable: boolean;
  onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const c = roleColors[emp.role] || roleColors.waiter;
  // A manager sees admin accounts (they're part of the team) but can't act on
  // them — same rule the API enforces, surfaced here instead of failing later.
  const lockedReason = !manageable ? 'Only an admin can change an admin account' : null;
  return (
    <SectionCard sx={{ height: '100%', opacity: emp.isActive ? 1 : 0.65 }}>
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: c.bg, color: c.color, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
          {initialsOf(emp.name)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: adminColors.textPrimary }} noWrap>
              {emp.name}
            </Typography>
            {isSelf && (
              <Chip label="You" size="small" sx={{ height: 17, fontSize: 9.5, fontWeight: 800, bgcolor: adminColors.bgSubtle, color: adminColors.textMuted }} />
            )}
          </Box>
          <Typography sx={{ fontSize: 12, color: adminColors.textMuted, wordBreak: 'break-all' }}>
            {emp.email}
          </Typography>
        </Box>
        <Tooltip title={lockedReason || (isSelf ? "You can't disable your own account" : emp.isActive ? 'Active — can sign in' : 'Disabled — cannot sign in')}>
          <span>
            <Switch size="small" checked={emp.isActive} onChange={onToggle} disabled={isSelf || !manageable} color="success" />
          </span>
        </Tooltip>
      </Box>

      <Box sx={{
        mt: 1.25, p: 1, borderRadius: adminColors.radiusSm,
        bgcolor: c.bg, border: `1px solid ${c.color}22`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box component="span" sx={{ fontSize: 12 }}>{ROLE_ICONS[emp.role]}</Box>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {ROLE_LABELS[emp.role]}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 11.5, color: adminColors.textSecondary, mt: 0.3 }}>
          {ROLE_ACCESS_SUMMARY[emp.role]}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.25, gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0 }}>
          <Typography sx={{ fontSize: 11.5, color: adminColors.textMuted, textTransform: 'capitalize' }}>
            {emp.shift} shift
          </Typography>
          {emp.salary > 0 && (
            <Typography sx={{ fontSize: 11.5, color: adminColors.textMuted }}>
              ₹{emp.salary.toLocaleString('en-IN')}/mo
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title={lockedReason || 'Edit'}>
            <span>
              <IconButton size="small" onClick={onEdit} disabled={!manageable} sx={{ color: adminColors.textSecondary }}>
                <Edit sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={lockedReason || (isSelf ? "You can't remove your own account" : 'Remove — revokes login')}>
            <span>
              <IconButton size="small" onClick={onDelete} disabled={isSelf || !manageable} sx={{ color: adminColors.danger }}>
                <Delete sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </SectionCard>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const { employees } = useAdmin();
  const { user, userRole } = useAuth();
  const roles = useMemo(() => assignableRoles(userRole), [userRole]);
  const [updateEmployee] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: employees.length };
    employees.forEach((e) => { c[e.role] = (c[e.role] || 0) + 1; });
    return c;
  }, [employees]);

  const visible = useMemo(
    () => (roleFilter === 'all' ? employees : employees.filter((e) => e.role === roleFilter)),
    [employees, roleFilter]
  );

  const activeCount = employees.filter((e) => e.isActive).length;
  const currentEmail = (user?.email || '').toLowerCase();

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (emp: Employee) => { setEditing(emp); setDialogOpen(true); };

  const handleToggle = async (emp: Employee) => {
    const result = await updateEmployee({ id: emp.id, status: emp.isActive ? 'Inactive' : 'Active' });
    if ('error' in result && result.error) { toast.error('Failed to update status'); return; }
    toast.success(emp.isActive ? `${emp.name} disabled — login revoked` : `${emp.name} re-enabled`);
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Remove ${emp.name}? Their login will be permanently revoked.`)) return;
    const result = await deleteEmployee(emp.id);
    if ('error' in result && result.error) { toast.error('Failed to remove employee'); return; }
    toast.success(`${emp.name} removed`);
  };

  const addButton = (
    <Button
      variant="contained" startIcon={<Add />} onClick={openAdd}
      sx={{
        bgcolor: adminColors.brand, '&:hover': { bgcolor: adminColors.brandDark },
        borderRadius: adminColors.radiusMd, fontWeight: 700, textTransform: 'none', px: 2.25, boxShadow: 'none',
      }}
    >
      Add team member
    </Button>
  );

  return (
    <AdminLayout title="Team & Access">
      <PageHeader
        title="Team & Access"
        subtitle={
          employees.length === 0
            ? 'Create staff logins and choose what each person can reach.'
            : `${activeCount} of ${employees.length} ${employees.length === 1 ? 'account' : 'accounts'} can sign in right now`
        }
        action={addButton}
      />

      {employees.length === 0 ? (
        <SectionCard>
          <EmptyState
            emoji="👥"
            title="No team members yet"
            subtitle="Add your first chef, cashier, or server — each gets their own login limited to the part of the system they need."
            action={addButton}
          />
        </SectionCard>
      ) : (
        <>
          {/* Role filter — doubles as the access-model overview */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`All · ${counts.all}`}
              onClick={() => setRoleFilter('all')}
              sx={{
                fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                bgcolor: roleFilter === 'all' ? adminColors.textPrimary : adminColors.bgPanel,
                color: roleFilter === 'all' ? '#FFFFFF' : adminColors.textSecondary,
                border: `1px solid ${roleFilter === 'all' ? adminColors.textPrimary : adminColors.border}`,
              }}
            />
            {STAFF_ROLES.filter((r) => counts[r] > 0).map((role) => {
              const c = roleColors[role];
              const active = roleFilter === role;
              return (
                <Chip
                  key={role}
                  label={`${ROLE_ICONS[role]} ${ROLE_LABELS[role]} · ${counts[role]}`}
                  onClick={() => setRoleFilter(role)}
                  sx={{
                    fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                    bgcolor: active ? c.color : adminColors.bgPanel,
                    color: active ? '#FFFFFF' : adminColors.textSecondary,
                    border: `1px solid ${active ? c.color : adminColors.border}`,
                  }}
                />
              );
            })}
          </Box>

          <Grid container spacing={1.5}>
            {visible.map((emp) => (
              <Grid key={emp.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <EmployeeCard
                  emp={emp}
                  isSelf={!!currentEmail && emp.email.toLowerCase() === currentEmail}
                  manageable={canManageStaffRole(userRole, emp.role)}
                  onEdit={() => openEdit(emp)}
                  onToggle={() => handleToggle(emp)}
                  onDelete={() => handleDelete(emp)}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <EmployeeDialog
        key={`emp-dialog-${dialogOpen}-${editing?.id ?? 'new'}`}
        open={dialogOpen}
        editing={editing}
        roles={roles}
        onClose={() => setDialogOpen(false)}
        onCreated={(email, password) => setCreds({ email, password })}
      />
      <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />
    </AdminLayout>
  );
}
