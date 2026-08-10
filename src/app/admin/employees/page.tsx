'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2 } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useAddEmployee, useUpdateEmployee, useDeleteEmployee } from '@/lib/queries';
import { generateEmployeeId } from '@/lib/idGenerator';
import { Employee } from '@/types';
import { ROLE_LABELS, STAFF_ROLES, assignableRoles, canManageStaffRole } from '@/lib/roleAccess';
import {
  SHIFT_VALUES, editEmployeeSchema, newEmployeeSchema,
  type EditEmployeeFormValues, type NewEmployeeFormValues,
} from '@/lib/adminSchemas';
import { PageHeader } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SelectField, SwitchField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { z } from 'zod';
import { cn } from '@/lib/utils';

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
      header: 'Employee',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-stone-100 text-xs font-medium text-stone-850">
              {row.original.avatar || row.original.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium text-sm text-stone-900">{row.original.name}</div>
            <div className="truncate text-xs text-stone-400">{row.original.phone || 'No phone'}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-stone-50 border-stone-200 text-xs font-medium uppercase text-stone-600">
          {ROLE_LABELS[row.original.role] || row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'shift',
      header: 'Shift',
      cell: ({ row }) => (
        <span className="text-xs text-stone-600 capitalize">
          {row.original.shift} shift
        </span>
      ),
    },
    {
      accessorKey: 'salary',
      header: 'Salary',
      cell: ({ row }) => (
        <span className="text-sm text-stone-700 tabular-nums">
          ₹{row.original.salary?.toLocaleString('en-IN')}/mo
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <span className={cn('text-xs font-medium', row.original.isActive ? 'text-emerald-700' : 'text-stone-400')}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const canEdit = canManageStaffRole(actorRole);
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={!canEdit} className="size-8" onClick={() => openEdit(row.original)}>
              <Edit2 className="size-4 text-stone-500" />
            </Button>
            <Button variant="ghost" size="icon" disabled={!canEdit} className="size-8 text-rose-600" onClick={() => setDeleting(row.original)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ], [actorRole, openEdit]);

  const renderMobileCard = useCallback((emp: Employee) => {
    const canEdit = canManageStaffRole(actorRole);
    return (
      <div>
        <div className="flex items-start gap-3">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-stone-100 text-xs font-medium text-stone-850">
              {emp.avatar || emp.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-stone-900">{emp.name}</div>
                <div className="truncate text-xs text-stone-400">{emp.phone}</div>
              </div>
              <span className={cn('text-xs font-medium shrink-0', emp.isActive ? 'text-emerald-700' : 'text-stone-400')}>
                {emp.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="bg-stone-50 border-stone-200 text-xs font-medium uppercase text-stone-600">
                {ROLE_LABELS[emp.role] || emp.role}
              </Badge>
              <span className="text-xs text-stone-400 capitalize">
                {emp.shift} shift · ₹{emp.salary?.toLocaleString('en-IN')}/mo
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-2">
          <Button variant="outline" size="sm" disabled={!canEdit} className="h-8 flex-1 text-xs" onClick={() => openEdit(emp)}>Edit</Button>
          <Button variant="ghost" size="icon" disabled={!canEdit} className="size-8 text-rose-600" onClick={() => setDeleting(emp)}><Trash2 className="size-4" /></Button>
        </div>
      </div>
    );
  }, [actorRole, openEdit]);

  return (
    <AdminLayout title="Staff Directory">
      <div className="w-full max-w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">Staff Directory</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {employees.length} employees · {activeCount} active on duty
            </p>
          </div>
          <Button onClick={openAdd} className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4">
            <Plus className="size-4 mr-1.5" /> Add Staff
          </Button>
        </div>

        {/* Roles Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setRoleFilter('all')}
            className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap', roleFilter === 'all' ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50')}
          >
            All Staff ({employees.length})
          </button>
          {STAFF_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap', roleFilter === r ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50')}
            >
              {ROLE_LABELS[r]} ({employees.filter((e) => e.role === r).length})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-stone-200">
          <DataTable
            columns={columns}
            data={filtered}
            searchKey="name"
            searchPlaceholder="Search employee name…"
            height="500px"
            rowHeight={60}
            emptyMessage="No staff match this filter."
            renderMobileCard={renderMobileCard}
            getRowId={(e) => e.id}
          />
        </div>
      </div>

      {/* Add dialog */}
      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        form={addForm}
        onSubmit={handleAdd}
        title="Add New Staff"
        description="Creates a login immediately. They can sign in as soon as saved."
        submitLabel="Add Staff Member"
      >
        <TextField control={addForm.control} name="name" label="Full Name" placeholder="e.g. Ramesh Kumar" autoFocus />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <SelectField control={addForm.control} name="role" label="Role" options={roleOptions} />
          <SelectField control={addForm.control} name="shift" label="Shift" options={SHIFT_OPTIONS} />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <TextField control={addForm.control} name="phone" label="Phone" type="tel" placeholder="9876543210" />
          <NumberField control={addForm.control} name="salary" label="Monthly Salary" prefix="₹" placeholder="20000" step={500} />
        </div>
        <TextField control={addForm.control} name="email" label="Email" type="email" placeholder="user@palapitta.in" hint="Username for signing in" />
        <TextField control={addForm.control} name="password" label="Password" type="password" placeholder="At least 8 characters" hint="Share it privately with the employee" />
      </FormDialog>

      {/* Edit dialog */}
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
          <TextField control={editForm.control} name="phone" label="Phone" type="tel" />
          <NumberField control={editForm.control} name="salary" label="Monthly Salary" prefix="₹" step={500} />
        </div>
        <TextField control={editForm.control} name="password" label="Reset Password" type="password" placeholder="Leave blank to keep current" hint="Only fill if resetting password" />
        <SwitchField control={editForm.control} name="isActive" label="Active Status" hint="Inactive staff cannot sign in" />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteEmployee.isPending}
        confirmLabel="Remove"
        title={`Remove ${deleting?.name}?`}
        description="Permanently revokes access and deletes them from the directory."
      />
    </AdminLayout>
  );
}
