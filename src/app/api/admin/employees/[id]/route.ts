import 'server-only';
import { NextResponse } from 'next/server';

import { requireAdmin, RequireAdminError } from '@/lib/auth/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';

const EMPLOYEE_ROLES = new Set(['admin', 'manager', 'chef', 'cashier']);

type RouteContext = { params: Promise<{ id: string }> };

async function authorize(request: Request) {
  try {
    await requireAdmin(request);
    return null;
  } catch (err) {
    if (err instanceof RequireAdminError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * Patches the `employees` row directly (service role bypasses RLS) and, when
 * the role changed, mirrors it onto `profiles.role` too — that's the column
 * every RLS policy and `roleAccess.ts` check actually reads, so a role edit
 * that only touched `employees` would silently not take effect. A password
 * reset goes through `auth.admin.updateUserById` instead — Postgres doesn't
 * see raw passwords, GoTrue does.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await authorize(request);
  if (authError) return authError;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, role, shift, salary, status, password } = body || {};
    if (role !== undefined && !EMPLOYEE_ROLES.has(role)) {
      return NextResponse.json({ error: 'Unsupported employee role' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await admin
      .from('employees')
      .select('auth_user_id, name, phone, role, shift, salary, status')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (phone !== undefined) patch.phone = phone;
    if (role !== undefined) patch.role = role;
    if (shift !== undefined) patch.shift = shift;
    if (salary !== undefined) patch.salary = salary;
    if (status !== undefined) patch.status = status;

    const previousEmployee = {
      name: existing.name, phone: existing.phone, role: existing.role,
      shift: existing.shift, salary: existing.salary, status: existing.status,
    };
    let profileChanged = false;
    if (existing.auth_user_id) {
      if (role !== undefined || status !== undefined) {
        const nextStatus = String(status ?? existing.status).toLowerCase();
        const nextRole = nextStatus === 'inactive' ? 'customer' : (role ?? existing.role);
        const { error: profileErr } = await admin
          .from('profiles')
          .update({ role: nextRole })
          .eq('id', existing.auth_user_id);
        if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });
        profileChanged = true;
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error: updateErr } = await admin.from('employees').update(patch).eq('id', id);
      if (updateErr) {
        if (profileChanged && existing.auth_user_id) {
          await admin.from('profiles').update({ role: existing.role }).eq('id', existing.auth_user_id);
        }
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }
    }

    if (existing.auth_user_id && (name !== undefined || phone !== undefined || password)) {
      const authPatch = {
        ...(password ? { password } : {}),
        ...(name !== undefined || phone !== undefined ? {
          user_metadata: {
            ...(name !== undefined ? { full_name: name } : {}),
            ...(phone !== undefined ? { phone } : {}),
          },
        } : {}),
      };
      const { error: authUpdateErr } = await admin.auth.admin.updateUserById(existing.auth_user_id, authPatch);
      if (authUpdateErr) {
        if (Object.keys(patch).length > 0) {
          await admin.from('employees').update(previousEmployee).eq('id', id);
        }
        if (profileChanged) {
          await admin.from('profiles').update({ role: existing.role }).eq('id', existing.auth_user_id);
        }
        return NextResponse.json({ error: authUpdateErr.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) || 'Could not update employee' }, { status: 500 });
  }
}

/**
 * Removes the employee row and revokes the login behind it. The row goes
 * first — if login deletion failed after that, an ex-employee would still
 * show up on the team list looking employed.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const authError = await authorize(request);
  if (authError) return authError;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;

    const { data: existing, error: fetchErr } = await admin
      .from('employees')
      .select('auth_user_id, role')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    // Revoke staff privileges before either destructive operation. If the row
    // deletion fails, restore the previous profile role as compensation. If
    // auth cleanup fails afterward, the orphaned login remains a customer and
    // cannot access staff data.
    if (existing?.auth_user_id) {
      const { error: revokeErr } = await admin
        .from('profiles')
        .update({ role: 'customer' })
        .eq('id', existing.auth_user_id);
      if (revokeErr) return NextResponse.json({ error: revokeErr.message }, { status: 400 });
    }

    const { error: deleteErr } = await admin.from('employees').delete().eq('id', id);
    if (deleteErr) {
      if (existing?.auth_user_id && existing.role) {
        await admin.from('profiles').update({ role: existing.role }).eq('id', existing.auth_user_id);
      }
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    if (existing?.auth_user_id) {
      const { error: authDeleteErr } = await admin.auth.admin.deleteUser(existing.auth_user_id);
      if (authDeleteErr) {
        return NextResponse.json({
          ok: true,
          warning: 'Employee removed and access revoked, but the inactive login needs manual cleanup.',
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) || 'Could not delete employee' }, { status: 500 });
  }
}
