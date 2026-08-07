'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- ColumnDef's first type
   parameter is the table feature set; `any` there is how this codebase spells
   "the default features" at every DataTable call site. */
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, Edit2, Plus, Shield, Trash2, Users } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useAddEmployee, useUpdateEmployee, useDeleteEmployee } from '@/lib/queries';
import { generateEmployeeId } from '@/lib/idGenerator';
import { Employee, StaffRole } from '@/types';
import { ROLE_LABELS, STAFF_ROLES, assignableRoles, canManageStaffRole } from '@/lib/roleAccess';
import {
  SHIFT_VALUES, editEmployeeSchema, newEmployeeSchema,
  type EditEmployeeFormValues, type NewEmployeeFormValues,
} from '@/lib/adminSchemas';
import { PageHeader, StatCard, SectionCard } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SelectField, SwitchField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { z } from 'zod';

const SHIFT_OPTIONS = SHIFT_VALUES.map((s) => ({
  value: s,
  label: `${s.charAt(0).toUpperCase()}${s.slice(1)} shift`,
}));

const BLANK_NEW: NewEmployeeFormValues = {
  name: '',
  role: 'cashier',
  shift: 'morning',
  phone: '',
  email: '',
  salary: 20000,
  password: '',
};

export default function EmployeesPage() {
  const { employees } = useAdmin();
  const { userRole: actorRole } = useAuth();
  const addEmployee = useAddEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const addForm = useForm<NewEmployeeFormValues>({
    resolver: zodResolver(newEmployeeSchema),
    defaultValues: BLANK_NEW,
    mode: 'onTouched',
  });

  const editForm = useForm<EditEmployeeFormValues>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      name: '', role: 'cashier', shift: 'morning', phone: '', salary: 20000,
      isActive: true, password: '',
    },
    mode: 'onTouched',
  });

  const rolesUserCanAssign = useMemo(() => assignableRoles(actorRole), [actorRole]);
  const roleOptions = useMemo(
    () => rolesUserCanAssign.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
    [rolesUserCanAssign]
  );

  const filtered = useMemo(
    () => employees.filter((e) => roleFilter === 'all' || e.role === roleFilter),
    [employees, roleFilter]
  );

  const activeCount = useMemo(() => employees.filter((e) => e.isActive).length, [employees]);

  const openAdd = () => {
    addForm.reset(BLANK_NEW);
    setAddOpen(true);
  };

  /**
   * The edit dialog now carries the whole record.
   *
   * It used to show only the name, the role and an active switch — while the
   * save handler still read phone, shift and salary out of the same form
   * state. Those three were whatever `setFormData(emp)` had seeded, so they
   * round-tripped unchanged and there was no way to give someone a raise or
   * move them to a different shift without deleting and recreating the account.
   */
  const openEdit = useCallback((emp: Employee) => {
    setEditing(emp);
    editForm.reset({
      name: emp.name,
      role: emp.role,
      shift: emp.shift,
      phone: emp.phone ?? '',
      salary: emp.salary,
      isActive: emp.isActive,
      password: '',
    });
  }, [editForm]);

  const handleAdd = async (values: z.output<typeof newEmployeeSchema>) => {
    try {
      await addEmployee.mutateAsync({
        id: generateEmployeeId(),
        name: values.name,
        role: values.role,
        shift: values.shift,
        phone: values.phone,
        email: values.email,
        salary: values.salary,
        password: values.password,
      });
      toast.success(`${values.name} added to staff`);
      setAddOpen(false);
    } catch (err) {
      const message = (err as Error).message || 'Could not add this employee';
      // Supabase reports a taken address as a generic failure; putting it on
      // the email field tells the manager which box to change.
      if (/email|already registered|already exists/i.test(message)) {
        addForm.setError('email', { message });
        return;
      }
      toast.error(message);
    }
  };

  const handleEdit = async (values: z.output<typeof editEmployeeSchema>) => {
    if (!editing) return;
    try {
      await updateEmployee.mutateAsync({
        id: editing.id,
        name: values.name,
        phone: values.phone,
        role: values.role,
        shift: values.shift,
        salary: values.salary,
        status: values.isActive ? 'Active' : 'Inactive',
        // Blank means "don't touch it" — sending '' would be read as a reset.
        password: values.password || undefined,
      });
      toast.success(`${values.name} updated`);
      setEditing(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not update this employee');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteEmployee.mutateAsync(deleting.id);
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not remove this employee');
    }
  };

  const columns = useMemo<ColumnDef<any, Employee>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Employee Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9 border border-amber-500/30">
            <AvatarFallback className="bg-stone-800 text-xs font-black text-white">
              {row.original.avatar || row.original.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-extrabold text-stone-900 dark:text-stone-100">
              {row.original.name}
            </div>
            <div className="truncate text-xs font-medium text-stone-400">{row.original.phone}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="bg-stone-100 text-[10px] font-black uppercase dark:bg-stone-800"
        >
          {ROLE_LABELS[row.original.role] || row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'shift',
      header: 'Shift',
      cell: ({ row }) => (
        <span className="text-xs font-bold capitalize text-stone-600 dark:text-stone-300">
          {row.original.shift} shift
        </span>
      ),
    },
    {
      accessorKey: 'salary',
      header: 'Salary',
      cell: ({ row }) => (
        <span className="font-black tabular-nums text-amber-700 dark:text-amber-500">
          ₹{row.original.salary?.toLocaleString('en-IN')} / mo
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          className={`border-none px-2 py-0.5 text-[10px] font-extrabold ${
            row.original.isActive
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-stone-200 text-stone-600'
          }`}
        >
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const canEdit = canManageStaffRole(actorRole, row.original.role);
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canEdit}
              className="size-8"
              aria-label={`Edit ${row.original.name}`}
              onClick={() => openEdit(row.original)}
            >
              <Edit2 className="size-4 text-stone-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canEdit}
              className="size-8 text-rose-600"
              aria-label={`Remove ${row.original.name}`}
              onClick={() => setDeleting(row.original)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ], [actorRole, openEdit]);

  const renderMobileCard = useCallback((emp: Employee) => {
    const canEdit = canManageStaffRole(actorRole, emp.role);
    return (
      <div>
        <div className="flex items-start gap-3">
          <Avatar className="size-10 shrink-0 border border-amber-500/30">
            <AvatarFallback className="bg-stone-800 text-xs font-black text-white">
              {emp.avatar || emp.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-stone-900 dark:text-stone-100">
                  {emp.name}
                </div>
                <div className="truncate text-[11px] font-medium text-stone-400">{emp.phone}</div>
              </div>
              <Badge
                className={`shrink-0 border-none px-2 py-0.5 text-[10px] font-extrabold ${
                  emp.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {emp.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="bg-stone-100 text-[10px] font-black uppercase dark:bg-stone-800"
              >
                {ROLE_LABELS[emp.role] || emp.role}
              </Badge>
              <span className="text-[10.5px] font-bold capitalize text-stone-400">
                {emp.shift} shift · ₹{emp.salary?.toLocaleString('en-IN')}/mo
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-2.5 dark:border-[#2C2C2E]/60">
          <Button
            variant="outline"
            size="sm"
            disabled={!canEdit}
            className="h-8 flex-1 rounded-lg text-xs font-bold"
            onClick={() => openEdit(emp)}
          >
            <Edit2 className="size-3.5" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canEdit}
            className="size-8 text-rose-600"
            aria-label={`Remove ${emp.name}`}
            onClick={() => setDeleting(emp)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    );
  }, [actorRole, openEdit]);

  return (
    <AdminLayout title="Staff & Employees">
      <div className="w-full max-w-full space-y-4">
        <PageHeader
          title="Staff Directory & Access Control"
          subtitle="Manage restaurant employees, roles, and shift assignments"
          action={
            <Button
              onClick={openAdd}
              className="h-9 w-full rounded-lg bg-amber-600 px-3 text-xs font-extrabold text-white shadow-xs hover:bg-amber-700 sm:w-auto"
            >
              <Plus className="size-3.5" />
              Add Employee
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            icon={<Users className="size-5" />}
            label="Total Employees"
            value={employees.length}
            sub="Registered staff members"
            accent="#2563EB"
          />
          <StatCard
            icon={<CheckCircle2 className="size-5" />}
            label="Active Duty"
            value={activeCount}
            sub="Currently active employees"
            accent="#059669"
          />
          <StatCard
            icon={<Shield className="size-5" />}
            label="Manager Roles"
            value={employees.filter((e) => e.role === 'admin' || e.role === 'manager').length}
            sub="Administrative access"
            accent="#D97706"
          />
        </div>

        <SectionCard noPadding className="p-3">
          <div className="scrollbar-none mb-3 flex gap-2 overflow-x-auto border-b border-stone-100 pb-2.5 dark:border-[#2C2C2E]/60">
            <Button
              variant={roleFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('all')}
              className={`shrink-0 rounded-full text-xs font-bold ${roleFilter === 'all' ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}`}
            >
              All Staff ({employees.length})
            </Button>
            {STAFF_ROLES.map((r) => (
              <Button
                key={r}
                variant={roleFilter === r ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter(r)}
                className={`shrink-0 rounded-full whitespace-nowrap text-xs font-bold ${
                  roleFilter === r ? 'bg-amber-600 text-white hover:bg-amber-700' : ''
                }`}
              >
                {ROLE_LABELS[r]} ({employees.filter((e) => e.role === r).length})
              </Button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            searchKey="name"
            searchPlaceholder="Search employee name or phone..."
            height="500px"
            rowHeight={60}
            emptyMessage="No staff match this filter."
            renderMobileCard={renderMobileCard}
            getRowId={(e) => e.id}
          />
        </SectionCard>
      </div>

      {/* ── Add ──────────────────────────────────────────────────────────── */}
      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        form={addForm}
        onSubmit={handleAdd}
        title="Add New Staff"
        description="This creates a real login. They can sign in as soon as you save."
        submitLabel="Add Staff Member"
      >
        <TextField
          control={addForm.control}
          name="name"
          label="Full Name"
          placeholder="e.g. Ramesh Kumar"
          autoFocus
        />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <SelectField control={addForm.control} name="role" label="Role" options={roleOptions} />
          <SelectField control={addForm.control} name="shift" label="Shift" options={SHIFT_OPTIONS} />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <TextField
            control={addForm.control}
            name="phone"
            label="Phone Number"
            type="tel"
            placeholder="9876543210"
          />
          <NumberField
            control={addForm.control}
            name="salary"
            label="Monthly Salary"
            prefix="₹"
            placeholder="20000"
            step={500}
          />
        </div>

        <TextField
          control={addForm.control}
          name="email"
          label="Email Address"
          type="email"
          placeholder="user@palapitta.in"
          hint="This is the username they sign in with"
        />

        <TextField
          control={addForm.control}
          name="password"
          label="Initial Password"
          type="password"
          placeholder="At least 8 characters"
          hint="Share it with them privately — they can change it after signing in"
        />
      </FormDialog>

      {/* ── Edit ─────────────────────────────────────────────────────────── */}
      <FormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        form={editForm}
        onSubmit={handleEdit}
        title={`Edit ${editing?.name ?? 'Staff Member'}`}
        description={editing?.email}
        submitLabel="Update Employee"
      >
        <TextField control={editForm.control} name="name" label="Full Name" autoFocus />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <SelectField control={editForm.control} name="role" label="Role" options={roleOptions} />
          <SelectField control={editForm.control} name="shift" label="Shift" options={SHIFT_OPTIONS} />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <TextField control={editForm.control} name="phone" label="Phone Number" type="tel" />
          <NumberField
            control={editForm.control}
            name="salary"
            label="Monthly Salary"
            prefix="₹"
            step={500}
          />
        </div>

        <TextField
          control={editForm.control}
          name="password"
          label="Reset Password"
          type="password"
          placeholder="Leave blank to keep current"
          hint="Only fill this in if they need a new password"
        />

        <SwitchField
          control={editForm.control}
          name="isActive"
          label="Active"
          hint="Inactive staff cannot sign in"
        />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteEmployee.isPending}
        confirmLabel="Remove"
        title={`Remove ${deleting?.name}?`}
        description="This revokes their login permanently and removes them from the staff directory."
      />
    </AdminLayout>
  );
}
