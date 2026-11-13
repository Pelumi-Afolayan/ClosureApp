# Closure database schema setup

The repository now versions the four base tables used by the app: `profiles`, `check_ins`, `journal_entries`, and `stories`. The later migrations add app/no-contact histories and push reminders. No application screen or service was changed by this schema task.

## Fresh Supabase project: exact order

1. Create a Supabase project. Use the SQL Editor's administrator role for migrations (normally `postgres`). Supabase supplies `auth.users`, `auth.uid()` and the `anon`, `authenticated`, and `service_role` roles; these files are intended for Supabase, not an empty standalone PostgreSQL server.
2. Open a new SQL query, paste the **entire** `supabase/migrations/20261110_base_schema.sql` file and Run. Wait for success.
3. Run the **entire** `supabase/migrations/20261111_activity_streaks.sql` file. Wait for success.
4. Run the **entire** `supabase/migrations/20261112_push_reminders.sql` file. Wait for success. This migration creates its table without IF NOT EXISTS: run it once on a fresh project, not repeatedly on an existing project.
5. Run the **entire** `supabase/migrations/20261113_reminder_lifecycle.sql` file. Run `supabase/migrations/20261114_reflections.sql` next to create the private reflection lists. Then configure the frontend `.env.local` with this project's `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Use the corresponding variables on the hosting platform. Do not put a service-role key into the frontend.
6. In Supabase Auth, configure the deployed site URL and the exact development/deployment redirect URLs you use. Signup/Google return to the current origin `/`; password recovery returns to `/reset-password`. Configure Google credentials if offering Google sign-in. Email signup/recovery delivery and confirmation settings are project configuration, not database migration side effects.
7. Start the frontend yourself in its project directory with `npm ci` followed by `npm run dev`. Complete signup/confirmation and onboarding. The app creates/upserts a profile when onboarding is saved; there is no required auth-user-created trigger in the base migration.
8. Create two disposable test accounts through Auth/the app, then run these SQL checks in order, as entire files:
   - `supabase/tests/privacy.sql`
   - `supabase/tests/activity_privacy.sql`
   - `supabase/tests/reminders.sql`
   The first two require two existing auth users; all tests use transactions and roll back their fixtures. They do not print names, moods, writing or credentials. An exception is a failed check, not a success to ignore.
9. To activate optional remote reminders, follow `supabase/REMINDERS-SETUP.md`: generate VAPID keys, set server secrets, deploy `send-reminders`, create its authenticated Cron invocation, set the public VAPID frontend variable, deploy the frontend and test on a real device. Database migrations alone do not deploy functions or schedule notifications.

`supabase/ACTIVITY-SETUP.md` explains the two distinct streak rules. Run migrations before SQL tests; `reminders.sql` is a permission test, not the file that creates `claim_due_reminders()`.

## Existing Closure project: preserve its data

- Review the new `20261110_base_schema.sql` file first. Take a normal backup/export before applying database changes and use a quiet period; schema validation can briefly lock tables. The migration uses a five-second lock timeout rather than waiting indefinitely.
- If activity/reminder migrations are already applied, run **only the new base migration** for the base-schema task. For the reminder lifecycle update, also run `20261113_reminder_lifecycle.sql` once; it is safe to rerun. Do not rerun the reminder migration or delete/recreate any table.
- The base migration is one explicit transaction and is rerunnable. It uses CREATE TABLE IF NOT EXISTS, checks existing required column types, restores defaults/required constraints, enables RLS, recreates only its own named policies/trigger, and grants only owner-scoped browser access.
- Existing rows, names, moods, notes, journal text, story answers, IDs and existing timestamp values are not rewritten or deleted. If timestamp columns were missing entirely, the added columns receive migration-time defaults for those existing rows; the migration cannot reconstruct their original creation times.
- A missing required owner/content column, incompatible type/key, existing NULL in a required field, orphaned owner, duplicate unique-key values or unsupported entry type makes the transaction fail. No automatic casting, deduplication, deletion or replacement of private values is attempted. Text and varchar are accepted as compatible string types; other types must match.
- If a query fails, stop. If SQL Editor leaves the connection inside a failed transaction, run `rollback;`. The migration's changes should not be committed. Inspect the reported schema issue privately and make a deliberate repair; do not delete records to make the migration pass or paste private rows into chat/logs.
- Existing matching auth-owner foreign keys without delete cascade are replaced transactionally with ON DELETE CASCADE. This changes the intended behavior of a **future auth-user deletion**; it does not delete any users or records during migration.
- Unrelated legacy policies/triggers are retained. A restrictive ownership policy prevents old permissive policies from granting cross-account access. An older restrictive policy may still deny legitimate owner operations; run the SQL checks to detect this. A pre-existing trigger can also affect update timestamps: inspect conflicts rather than dropping unrelated triggers blindly.
- Legacy core tables with different primary keys are deliberately not silently re-keyed; they fail the compatibility check. For example, fresh `stories` uses `user_id` as its primary key, satisfying the one-story-per-user requirement. An existing different story primary key needs explicit review first.
- Re-run the SQL privacy checks after applying the base migration. Sign in as each of two test users and manually check their data isolation.

For a project whose migrations were historically pasted into SQL Editor, do not run `supabase db reset`, `db push` or migration-history repair against production without first reconciling its migration history. The exact manual SQL order above avoids relying on an unknown CLI migration-history state.

## Base schema contract

All listed columns are required/non-null. Defaults apply when a value is omitted; they do not replace existing NULLs.

| Table | Keys/ownership | Other fields and defaults |
|---|---|---|
| profiles | `id uuid` primary key, FK to auth.users(id) ON DELETE CASCADE | `preferred_name text ''`, `goals text[] '{}'`, `timezone text 'UTC'`, `onboarding_complete boolean false` |
| check_ins | `id uuid` primary key default gen_random_uuid(); `user_id uuid` FK to auth.users(id) ON DELETE CASCADE; unique(user_id, check_in_date) | `check_in_date date` supplied by client; `moods text[] '{}'`, `note text ''` |
| journal_entries | `id uuid` primary key default gen_random_uuid(); `user_id uuid` FK to auth.users(id) ON DELETE CASCADE | `title text ''`, `content text ''`, `entry_type text 'journal'` with CHECK allowing only `journal` or `unsent_letter` |
| stories | `user_id uuid` primary key (therefore unique), FK to auth.users(id) ON DELETE CASCADE | `what_happened text ''`, `what_hurt text ''`, `what_i_need text ''` |

Every table has `created_at timestamptz default now()` and `updated_at timestamptz default now()`. The shared BEFORE UPDATE trigger sets updated_at to `clock_timestamp()` and leaves created_at unchanged. Blank story answers and optional journal titles are supported. Empty initial/default arrays/text do not mark onboarding or a check-in complete: the existing client validation still applies. No speculative mood/goal enum, nonblank-story rule or automatic profile-creation trigger was added.

Each base table has RLS plus owner-only SELECT, INSERT, UPDATE and DELETE policies. UPDATE checks both the original and replacement owner, blocking ownership transfer. The restrictive owner guard also applies to anonymous/non-admin roles if legacy permissions remain. Browser roles have no TRUNCATE grant. The service role retains administrative access; never ship that key to a browser. Nothing in this migration introduces application-layer encryption.

## Automated verification and its limits

Run from the project directory:

```powershell
npm ci
npm test
npm run lint
```

`tests/schema.test.js` executes the actual migration SQL in PGlite (embedded PostgreSQL), with a minimal **test-only** substitute for Supabase's auth roles/users/uid function. It verifies fresh setup in order, all three SQL privacy scripts, repeat application/data preservation, owner access, forged inserts/transfers, old broad-policy protection, timestamps, unique/check constraints, auth-user delete cascades, missing defaults/timestamps/constraints and atomic rollback for incompatible schemas/NULLs.

These tests use synthetic accounts in memory. They never connect to the live Supabase database or delete a real auth user. Passing them does not verify the existing project's exact schema, live Auth provider settings, emails, Edge Function deployment or remote push delivery. Run the SQL suites in the target Supabase project as well.
