package com.palapitta.business;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** Run the actual authorization migration as postgres, then exercise it as
 * PostgREST's authenticator login. SET ROLE alone would hide this regression
 * because session_user would still be the trusted postgres connection. */
class DatabaseAuthorizationTest {
    @Test void publicCallersCannotInheritTheFunctionOwnersPrivileges() throws Exception {
        try (EmbeddedPostgres pg = EmbeddedPostgres.start();
             Connection connection = pg.getPostgresDatabase().getConnection();
             Statement sql = connection.createStatement()) {
            sql.execute("""
                CREATE ROLE authenticator LOGIN NOINHERIT;
                CREATE ROLE anon;
                CREATE ROLE authenticated;
                CREATE ROLE service_role;
                GRANT anon, authenticated, service_role TO authenticator;
                CREATE SCHEMA auth;
                CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
                  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
                CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS
                  $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
                GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
                CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text);
                CREATE TABLE public.orders(id text PRIMARY KEY);
                ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
                GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
                GRANT INSERT ON public.orders TO authenticated;
                INSERT INTO public.profiles VALUES
                  ('00000000-0000-0000-0000-000000000001', 'customer'),
                  ('00000000-0000-0000-0000-000000000002', 'manager'),
                  ('00000000-0000-0000-0000-000000000003', 'cashier'),
                  ('00000000-0000-0000-0000-000000000004', 'admin');
                """);
            sql.execute(Files.readString(Path.of("../../supabase/migrations/20260914000000_restore_authorization_boundaries.sql")));
            sql.execute("""
                CREATE TRIGGER guard_update BEFORE UPDATE ON public.profiles
                FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();
                CREATE TRIGGER guard_insert BEFORE INSERT ON public.profiles
                FOR EACH ROW EXECUTE FUNCTION public.enforce_default_role_on_insert();
                SET SESSION AUTHORIZATION authenticator;
                SET ROLE anon;
                SELECT set_config('request.jwt.claim.role', 'anon', false);
                """);
            assertPrivileges(sql, false, false, false);
            sql.execute("SET ROLE authenticated; SELECT set_config('request.jwt.claim.role', 'authenticated', false)");
            asUser(sql, 1);
            assertPrivileges(sql, false, false, false);
            assertThrows(SQLException.class, () -> sql.execute("UPDATE public.profiles SET role='admin' WHERE id=auth.uid()"));
            assertThrows(SQLException.class, () -> sql.execute("INSERT INTO public.orders VALUES ('forged-price')"));
            sql.execute("INSERT INTO public.profiles VALUES ('00000000-0000-0000-0000-000000000005', 'admin')");
            try (ResultSet row = sql.executeQuery("SELECT role FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000005'")) {
                assertTrue(row.next()); assertEquals("customer", row.getString(1));
            }
            asUser(sql, 2);
            assertPrivileges(sql, false, true, false);
            assertThrows(SQLException.class, () -> sql.execute("UPDATE public.profiles SET role='admin' WHERE id=auth.uid()"));
            asUser(sql, 3);
            assertPrivileges(sql, false, false, false);
            sql.execute("INSERT INTO public.orders VALUES ('counter-order')");
            asUser(sql, 4);
            assertPrivileges(sql, true, true, true);
            sql.execute("UPDATE public.profiles SET role='chef' WHERE id='00000000-0000-0000-0000-000000000001'");
            sql.execute("SET ROLE service_role; SELECT set_config('request.jwt.claim.role', 'service_role', false)");
            assertPrivileges(sql, true, true, true);
            sql.execute("RESET SESSION AUTHORIZATION; SELECT set_config('request.jwt.claim.role', '', false)");
            assertPrivileges(sql, true, true, true);
        }
    }

    private void asUser(Statement sql, int suffix) throws SQLException {
        sql.execute("SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000" + suffix + "', false)");
    }

    private void assertPrivileges(Statement sql, boolean admin, boolean manager, boolean employees) throws SQLException {
        try (ResultSet row = sql.executeQuery("SELECT public.is_exact_admin(), public.is_admin(), public.can_access_employees()")) {
            assertTrue(row.next());
            assertEquals(admin, row.getBoolean(1));
            assertEquals(manager, row.getBoolean(2));
            assertEquals(employees, row.getBoolean(3));
        }
    }
}
