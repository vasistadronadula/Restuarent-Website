import 'server-only';
import { NextResponse } from 'next/server';

import { requireAdmin, RequireAdminError } from '@/lib/auth/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';

/**
 * Creates a staff login and its employee/profile rows in one call.
 *
 * `auth.admin.createUser` and `admin_upsert_staff` (see supabase_schema.sql)
 * are two separate calls against two different systems (GoTrue, then
 * Postgres) — if the second one fails, the freshly created login is deleted
 * so a bad employee ID or role doesn't leave a working account nobody can see
 * in the team list.
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

    const { error: rpcErr } = await admin.rpc('admin_upsert_staff', {
      p_auth_user_id: created.user.id,
      p_email: email,
      p_full_name: name,
      p_phone: phone || '',
      p_role: role,
      p_employee_id: id,
      p_shift: shift || 'morning',
      p_salary: salary || 0,
      p_joining_date: new Date().toISOString().split('T')[0],
    });

    if (rpcErr) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      const message = /duplicate|unique/i.test(rpcErr.message)
        ? `Employee ID ${id} already exists`
        : rpcErr.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) || 'Could not create employee' }, { status: 500 });
  }
}
