import 'server-only';
import { NextResponse } from 'next/server';

import { requireAdmin, RequireAdminError } from '@/lib/auth/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';

const EMPLOYEE_ROLES = new Set(['admin', 'manager', 'chef', 'cashier', 'waiter']);

/**
 * Creates a staff login and its employee/profile rows in one call.
 *
 * Tries `admin_upsert_staff` RPC first. If the RPC is unavailable or fails,
 * falls back to direct service-role table writes (profiles + employees) so
 * missing DB functions don't block staff onboarding. If the writes fail, the
 * auth user is cleaned up so dangling accounts are not left behind.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err) {
    if (err instanceof RequireAdminError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, name, email, phone, role, shift, salary, password } = body || {};

    if (!id || !name || !email || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!EMPLOYEE_ROLES.has(role)) {
      return NextResponse.json({ error: 'Unsupported employee role' }, { status: 400 });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone: phone || '' },
    });

    if (createErr || !created?.user) {
      const message = /already.*registered|duplicate/i.test(createErr?.message || '')
        ? `${email} is already in use by another account`
        : createErr?.message || 'Could not create the login';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const joiningDate = new Date().toISOString().split('T')[0];

    // 1. Try atomic RPC first
    let rpcSuccess = false;
    try {
      const { error: rpcErr } = await admin.rpc('admin_upsert_staff', {
        p_auth_user_id: created.user.id,
        p_email: email,
        p_full_name: name,
        p_phone: phone || '',
        p_role: role,
        p_employee_id: id,
        p_shift: shift || 'morning',
        p_salary: salary || 0,
        p_joining_date: joiningDate,
      });

      if (!rpcErr) {
        rpcSuccess = true;
      } else {
        console.warn('admin_upsert_staff RPC failed, falling back to direct table inserts:', rpcErr.message);
      }
    } catch (e) {
      console.warn('admin_upsert_staff RPC error, falling back to direct table inserts:', e);
    }

    // 2. Fallback to direct service-role table writes if RPC was unavailable or failed
    if (!rpcSuccess) {
      const { error: profileErr } = await admin.from('profiles').upsert(
        {
          id: created.user.id,
          email,
          full_name: name,
          phone: phone || '',
          role,
        },
        { onConflict: 'id' }
      );

      if (profileErr) {
        // Profile insert failed — remove the auth user we just created so it
        // doesn't become an orphaned login with no role or employee record.
        // If deleteUser itself fails, log it clearly so an admin can clean up
        // the ghost account manually rather than it silently rotting.
        await admin.auth.admin.deleteUser(created.user.id).catch((cleanupErr) => {
          console.error(
            `[employees] Auth user ${created.user.id} created but profile insert failed, ` +
            `AND cleanup deleteUser also failed — ghost account exists:`,
            cleanupErr
          );
        });
        return NextResponse.json(
          { error: profileErr.message || 'Could not create staff profile' },
          { status: 400 }
        );
      }

      const employeeRecord: Record<string, unknown> = {
        id,
        name,
        role,
        phone: phone || '',
        email,
        shift: shift || 'morning',
        salary: salary || 0,
        joining_date: joiningDate,
        status: 'Active',
        auth_user_id: created.user.id,
      };

      let { error: empErr } = await admin.from('employees').insert(employeeRecord);

      // Handle legacy tables without auth_user_id column
      if (empErr && /auth_user_id/i.test(empErr.message)) {
        delete employeeRecord.auth_user_id;
        const retry = await admin.from('employees').insert(employeeRecord);
        empErr = retry.error;
      }

      if (empErr) {
        await admin.auth.admin.deleteUser(created.user.id).catch((cleanupErr) => {
          console.error(
            `[employees] Auth user ${created.user.id} created but employee insert failed, ` +
            `AND cleanup deleteUser also failed — ghost account exists:`,
            cleanupErr
          );
        });
        const message = /duplicate|unique/i.test(empErr.message)
          ? `Employee ID ${id} already exists`
          : empErr.message || 'Could not insert employee record';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) || 'Could not create employee' }, { status: 500 });
  }
}
