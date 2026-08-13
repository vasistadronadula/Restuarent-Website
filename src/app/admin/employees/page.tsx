'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2 } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import {
  useEmployees, useAddEmployee, useUpdateEmployee, useDeleteEmployee,
} from '@/lib/queries';
import type { Employee } from '@/types';
import {
  newEmployeeSchema, editEmployeeSchema, STAFF_ROLE_VALUES, SHIFT_VALUES,
  type NewEmployeeFormOutput, type NewEmployeeFormValues,
  type EditEmployeeFormOutput, type EditEmployeeFormValues,
} from '@/lib/adminSchemas';
import { generateEmployeeId } from '@/lib/idGenerator';
import { Pill } from '@/components/admin/ui';
import {
  ConfirmDeleteDialog, FormDialog, NumberField, SelectField, SwitchField, TextField,
} from '@/components/admin/form-fields';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

const ROLE_LABELS: Record<Employee['role'], string> = {
  admin: 'Admin',
  manager: 'Manager',
  chef: 'Chef',
  cashier: 'Cashier',
  waiter: 'Waiter',
};

const ROLE_OPTIONS = STAFF_ROLE_VALUES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
const SHIFT_LABELS: Record<(typeof SHIFT_VALUES)[number], string> = {
  morning: 'Morning', evening: 'Evening', night: 'Night',
};
const SHIFT_OPTIONS = SHIFT_VALUES.map((s) => ({ value: s, label: SHIFT_LABELS[s] }));

const BLANK_NEW: NewEmployeeFormValues = {
  name: '', role: 'waiter', shift: 'morning', phone: '', salary: 0, email: '', password: '',
};

export default function EmployeesPage() {
  const { data: employees = [] } = useEmployees();
  const addEmployee = useAddEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

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
    defaultValues: { ...BLANK_NEW, isActive: true, password: '' },
    mode: 'onTouched',
  });

  const activeCount = useMemo(() => employees.filter((e) => e.isActive).length, [employees]);

  const openAdd = () => {
    addForm.reset(BLANK_NEW);
    setAddOpen(true);
  };

  const openEdit = useCallback((e: Employee) => {
    setEditing(e);
    editForm.reset({
      name: e.name,
      role: e.role,
      shift: e.shift,
      phone: e.phone,
      salary: e.salary,
      isActive: e.isActive,
      password: '',
    });
  }, [editForm]);

  const handleAdd = async (values: NewEmployeeFormOutput) => {
    try {
      await addEmployee.mutateAsync({
        id: generateEmployeeId(),
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: values.role,
        shift: values.shift,
        salary: values.salary,
        password: values.password,
      });
      toast.success(`${values.name} added to the team`);
      setAddOpen(false);
    } catch (err) {
      toast.error((err as Error).message || 'Could not add this employee');
    }
  };

  const handleEdit = async (values: EditEmployeeFormOutput) => {
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
        ...(values.password ? { password: values.password } : {}),
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
      toast.success(`${deleting.name} removed from the team`);
      setDeleting(null);
    } catch (err) {
      toast.error((err as Error).message || 'Could not remove this employee');
    }
  };

  const toggleActive = useCallback((e: Employee, next: boolean) => {
    updateEmployee.mutate(
      { id: e.id, status: next ? 'Active' : 'Inactive' },
      { onError: (err) => toast.error((err as Error).message || `Could not update ${e.name}`) }
    );
  }, [updateEmployee]);

  const columns = useMemo<ColumnDef<any, Employee>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 shrink-0 grid place-items-center bg-ad-ink text-ad-bg ad-num text-[12px]">
            {row.original.avatar}
          </div>
          <div className="min-w-0">
            <span className="font-semibold truncate block">{row.original.name}</span>
            <span className="ad-kicker">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => <span className="ad-tag ad-tag-outline">{ROLE_LABELS[row.original.role]}</span>,
    },
    {
      accessorKey: 'shift',
      header: 'Shift',
      cell: ({ row }) => <span className="ad-muted capitalize">{row.original.shift}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <span className="ad-num tabular-nums">{row.original.phone}</span>,
    },
    {
      accessorKey: 'salary',
      header: 'Salary',
      cell: ({ row }) => <span className="ad-num tabular-nums">₹{row.original.salary.toLocaleString('en-IN')}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Pill
          on={row.original.isActive}
          onLabel="Active"
          offLabel="Inactive"
          onClick={() => toggleActive(row.original, !row.original.isActive)}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-icon" onClick={() => openEdit(row.original)} aria-label={`Edit ${row.original.name}`}>
            <Edit2 className="size-4" />
          </button>
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-icon" onClick={() => setDeleting(row.original)} aria-label={`Delete ${row.original.name}`} style={{ color: 'var(--ad-a700)' }}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ], [toggleActive, openEdit]);

  const renderMobileCard = useCallback((e: Employee) => (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 shrink-0 grid place-items-center bg-ad-ink text-ad-bg ad-num text-[13px]">
            {e.avatar}
          </div>
          <div className="min-w-0">
            <span className="font-semibold truncate block">{e.name}</span>
            <span className="ad-kicker">{ROLE_LABELS[e.role]} · {e.shift}</span>
          </div>
        </div>
        <Pill on={e.isActive} onLabel="Active" offLabel="Inactive" onClick={() => toggleActive(e, !e.isActive)} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-ad-hairline pt-2.5">
        <span className="ad-kicker">{e.phone} · ₹{e.salary.toLocaleString('en-IN')}</span>
        <div className="flex items-center gap-1.5">
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => openEdit(e)}>Edit</button>
          <button type="button" className="ad-btn ad-btn-secondary ad-btn-sm" onClick={() => setDeleting(e)} style={{ color: 'var(--ad-a700)' }} aria-label={`Delete ${e.name}`}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  ), [toggleActive, openEdit]);

  return (
    <AdminLayout title="Employees">
      <div className="w-full max-w-full space-y-4">
        <div className="ad-section-head">
          <h3 className="ad-h text-[17px]">Team</h3>
          <span className="text-[12px] ad-muted">{employees.length} total · {activeCount} active</span>
          <button type="button" onClick={openAdd} className="ad-btn ad-btn-primary ml-auto">
            <Plus className="size-4" /> Add employee
          </button>
        </div>

        <div>
          <DataTable
            columns={columns}
            data={employees}
            searchKey="name"
            searchPlaceholder="Search team member…"
            height="500px"
            rowHeight={64}
            emptyMessage="No employees yet. Add your first team member to get started."
            renderMobileCard={renderMobileCard}
            getRowId={(e) => e.id}
          />
        </div>
      </div>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        form={addForm}
        onSubmit={handleAdd}
        title="Add an employee"
        description="Creates a login too — they can sign in with this email and password right away."
        submitLabel="Add employee"
      >
        <TextField control={addForm.control} name="name" label="Full name" placeholder="e.g. Ravi Kumar" autoFocus />
        <TextField control={addForm.control} name="email" label="Email" type="email" placeholder="ravi@example.com" />
        <TextField control={addForm.control} name="password" label="Password" type="password" placeholder="At least 8 characters" />
        <div className="grid grid-cols-2 gap-3.5">
          <SelectField control={addForm.control} name="role" label="Role" options={ROLE_OPTIONS} />
          <SelectField control={addForm.control} name="shift" label="Shift" options={SHIFT_OPTIONS} />
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <TextField control={addForm.control} name="phone" label="Phone" placeholder="10-digit mobile" />
          <NumberField control={addForm.control} name="salary" label="Salary" prefix="₹" placeholder="0" />
        </div>
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        form={editForm}
        onSubmit={handleEdit}
        title={`Edit ${editing?.name}`}
        description="Leave the password blank to keep the current one."
        submitLabel="Update employee"
      >
        <TextField control={editForm.control} name="name" label="Full name" placeholder="e.g. Ravi Kumar" autoFocus />
        <TextField control={editForm.control} name="password" label="New password" type="password" placeholder="Leave blank to keep current" />
        <div className="grid grid-cols-2 gap-3.5">
          <SelectField control={editForm.control} name="role" label="Role" options={ROLE_OPTIONS} />
          <SelectField control={editForm.control} name="shift" label="Shift" options={SHIFT_OPTIONS} />
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <TextField control={editForm.control} name="phone" label="Phone" placeholder="10-digit mobile" />
          <NumberField control={editForm.control} name="salary" label="Salary" prefix="₹" placeholder="0" />
        </div>
        <SwitchField control={editForm.control} name="isActive" label="Active" hint="Inactive staff cannot sign in" />
      </FormDialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        busy={deleteEmployee.isPending}
        title={`Remove ${deleting?.name}?`}
        description="This also revokes their login — they won't be able to sign in again."
      />
    </AdminLayout>
  );
}
