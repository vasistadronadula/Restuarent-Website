import { NextResponse } from 'next/server';
import { requireAdmin, RequireAdminError } from '@/lib/auth/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getErrorMessage } from '@/lib/errors';
import { canManageStaffRole } from '@/lib/roleAccess';
import type { StaffRole } from '@/types';

const VALID_ROLES: StaffRole[] = ['admin', 'manager', 'chef', 'cashier', 'waiter'];

interface CreateEmployeeBody {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  shift?: string;
  salary?: number;
  password: string;
}

// Creates a real login for a new employee (service-role only — admin.auth.admin.createUser
// isn't reachable with the public anon key), then atomically writes the profiles + employees
// rows via the admin_upsert_staff RPC. See supabase_schema.sql section 11 for why the RPC
// exists instead of two separate inserts here.
export async function POST(request: Request) {
  try {
    const caller = await requireAdmin(request);

    const body = (await request.json()) as Partial<CreateEmployeeBody>;
    const name = body.name?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const password = body.password || '';
    const role = body.role;
    const employeeId = body.id?.trim() || '';

    if (!name || !email || !employeeId) {
      return NextResponse.json({ error: 'Name, email, and employee ID are required.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Initial password must be at least 6 characters.' }, { status: 400 });
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }
    // A manager runs the team page but must not be able to mint an admin
    // account — that would turn manager into a route to full access.
    if (!canManageStaffRole(caller.role, role)) {
      return NextResponse.json(
        { error: 'Only an admin can create an admin account.' },
        { status: 403 }
      );
    }

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError || !created?.user) {
      const message = createError?.message?.includes('already been registered')
        ? 'A login with this email already exists.'
        : createError?.message || 'Failed to create login for this employee.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { error: rpcError } = await admin.rpc('admin_upsert_staff', {
      p_auth_user_id: created.user.id,
      p_email: email,
      p_full_name: name,
      p_phone: body.phone || '',
      p_role: role,
      p_employee_id: employeeId,
      p_shift: body.shift || 'morning',
      p_salary: Number(body.salary) || 0,
      p_joining_date: new Date().toISOString().split('T')[0],
    });

    if (rpcError) {
      // Compensate — don't leave an orphaned login with no profile/employee row.
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: rpcError.message || 'Failed to save employee record.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: employeeId });
  } catch (err) {
    if (err instanceof RequireAdminError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Create employee error:', err);
    return NextResponse.json({ error: getErrorMessage(err) || 'Failed to create employee.' }, { status: 500 });
  }
}
