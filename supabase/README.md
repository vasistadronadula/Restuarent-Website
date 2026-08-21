# Database

Schema changes are tracked as timestamped migrations in `migrations/` and
applied with the [Supabase CLI](https://supabase.com/docs/guides/cli).

## Why this exists

The schema used to live in two loose files — a 36KB `supabase_schema.sql` at
the repo root and `menu_categories_migration.sql` here — each carrying the
instruction "run this in the Supabase SQL Editor". Both were written
idempotently, which made them safe to re-run but left the important question
unanswerable: *has this been applied to production, and in what order?*
Nothing recorded it. A new environment was provisioned by someone pasting
files into a web editor in whatever order they happened to open them.

`migrations/` fixes that. The CLI keeps a `supabase_migrations.schema_migrations`
table in the database, so the applied set is a fact you can query rather than
something you remember.

## Layout

| File | Contents |
|------|----------|
| `migrations/20260808000000_baseline_schema.sql` | The whole schema as it stood when tracking began — tables, indexes, RLS policies, functions. |
| `migrations/20260811000000_menu_categories.sql` | The `menu_categories` table and its policies. |

The baseline is a starting point, not a living document. **Do not edit it** to
add a column; a migration that has already run somewhere will not run again,
so an edit reaches new environments only and silently splits the schema in two.

## Adding a change

```bash
supabase migration new add_order_prep_notes   # creates migrations/<timestamp>_add_order_prep_notes.sql
# …write the DDL…
supabase db push                              # applies anything not yet recorded
```

## First-time setup against an existing project

The two migrations above describe a database that is already live, so tell
Supabase they are applied rather than re-running them:

```bash
supabase link --project-ref <ref>
supabase migration repair --status applied 20260808000000
supabase migration repair --status applied 20260811000000
supabase migration list                       # local and remote should agree
```

For a brand-new project, skip the repairs and run `supabase db push`.

## Conventions

- Write DDL idempotently (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
  `DROP POLICY IF EXISTS` before `CREATE POLICY`). It costs nothing and makes a
  partially-applied migration recoverable.
- Every table that holds customer or staff data gets RLS enabled and an explicit
  policy in the same migration that creates it. A table with RLS on and no policy
  is invisible to the app; a table with RLS off is readable by anyone holding the
  anon key.
- Say what a policy is for in a comment above it. The baseline's policies were
  written without any, which is why the file is 36KB of DDL nobody wants to touch.
