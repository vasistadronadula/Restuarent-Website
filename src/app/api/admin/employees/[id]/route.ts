import { NextResponse } from 'next/server';
import { requireAdmin, RequireAdminError } from '@/lib/auth/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';
import { canManageStaffRole } from '@/lib/roleAccess';
import type { StaffRole } from '@/types';

const VALID_ROLES: StaffRole[] = ['admin', 'manager', 'chef', 'cashier', 'waiter'];
// Effectively permanent — GoTrue's ban_duration has no "forever" literal, so
// this is the same "very large duration" pattern Supabase's own docs use.
const PERMANENT_BAN = '876000h';

interface UpdateEmployeeBody {
  name?: string;
  phone?: string;
  role?: StaffRole;
  shift?: string;
  salary?: number;
  status?: 'Active' | 'Inactive';
}

type RouteContext = { params: Promise<{ id: string }> };

// Update HR fields and/or role and/or active status. Role changes and
// activate/deactivate both need to touch the linked auth account, so this
// always goes through the service-role client rather than the RLS-protected
// client path other entities use.
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const caller = await requireAdmin(request);
    const { id } = await params;

    const body = (await request.json()) as UpdateEmployeeBody;
    if (body.role && !VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

    const { data: employee, error: findError } = await admin
      .from('employees').select('auth_user_id, role').eq('id', id).maybeSingle();
    if (findError || !employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    // Managers may run the team page but not reach into admin accounts, and
    // not promote anyone (including themselves) to admin.
    if (!canManageStaffRole(caller.role, employee.role as StaffRole)) {
      return NextResponse.json({ error: 'Only an admin can change an admin account.' }, { status: 403 });
    }
    if (body.role && !canManageStaffRole(caller.role, body.role)) {
      return NextResponse.json({ error: 'Only an admin can grant the admin role.' }, { status: 403 });
    }

    // Self-lockout guard: deactivating or demoting your own account would
    // immediately revoke your own admin access with no way back in from the UI.
    const isSelf = employee.auth_user_id === caller.user.id;
    if (isSelf && body.status === 'Inactive') {
      return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
    }
    if (isSelf && body.role && body.role !== 'admin' && body.role !== 'manager') {
      return NextResponse.json({ error: 'You cannot remove your own admin access.' }, { status: 400 });
    }

    const employeeUpdate: Record<string, unknown> = {};
    if (body.name?.trim()) employeeUpdate.name = body.name.trim();
    if (body.phone !== undefined) employeeUpdate.phone = body.phone;
    if (body.role) employeeUpdate.role = body.role;
    if (body.shift) employeeUpdate.shift = body.shift;
    if (body.salary !== undefined) employeeUpdate.salary = Number(body.salary) || 0;
    if (body.status) employeeUpdate.status = body.status;

    if (Object.keys(employeeUpdate).length > 0) {
      const { error: updateError } = await admin.from('employees').update(employeeUpdate).eq('id', id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (employee.auth_user_id) {
      if (body.role) {
        const { error: roleError } = await admin
          .from('profiles').update({ role: body.role }).eq('id', employee.auth_user_id);
        if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });
      }
      if (body.status) {
        const { error: banError } = await admin.auth.admin.updateUserById(employee.auth_user_id, {
          ban_duration: body.status === 'Active' ? 'none' : PERMANENT_BAN,
        });
        if (banError) return NextResponse.json({ error: banError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof RequireAdminError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Update employee error:', err);
    return NextResponse.json({ error: getErrorMessage(err) || 'Failed to update employee.' }, { status: 500 });
  }
}

// Full revoke: locks the login out permanently, drops their role back to
// 'customer' (in case the auth account lingers or is ever unbanned by hand),
// and removes the HR record. The auth.users row itself is kept rather than
// hard-deleted, preserving the audit trail — banning already fully prevents
// login.
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const caller = await requireAdmin(request);
    const { id } = await params;

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

    const { data: employee, error: findError } = await admin
      .from('employees').select('auth_user_id, role').eq('id', id).maybeSingle();
    if (findError || !employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    if (!canManageStaffRole(caller.role, employee.role as StaffRole)) {
      return NextResponse.json({ error: 'Only an admin can remove an admin account.' }, { status: 403 });
    }

    if (employee.auth_user_id === caller.user.id) {
      return NextResponse.json({ error: 'You cannot remove your own account.' }, { status: 400 });
    }

    if (employee.auth_user_id) {
      await admin.auth.admin.updateUserById(employee.auth_user_id, { ban_duration: PERMANENT_BAN });
      await admin.from('profiles').update({ role: 'customer' }).eq('id', employee.auth_user_id);
    }

    const { error: deleteError } = await admin.from('employees').delete().eq('id', id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof RequireAdminError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Delete employee error:', err);
    return NextResponse.json({ error: getErrorMessage(err) || 'Failed to delete employee.' }, { status: 500 });
  }
}
