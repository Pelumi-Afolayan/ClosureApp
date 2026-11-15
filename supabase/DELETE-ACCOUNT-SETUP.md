# Account export and deletion setup

## What this feature does

Settings (the existing `/onboarding` page, also available before setup is complete) offers Markdown and JSON downloads. Files are built in the browser from owner-filtered, paginated reads of profiles, check-ins, journals/letters, stories, reflections, app visits and confirmed no-contact dates. Push keys, subscriptions, passwords and login tokens are excluded. Filenames contain a fixed app prefix and the local export date, never a name. An export is a series of reads, not a transactional database snapshot; avoid editing from another device while exporting.

Deletion requires the exact word `DELETE` and a separate permanent-deletion checkbox. This browser's push subscription/row is removed first. If cleanup fails, deletion is not requested. If cleanup succeeds but deletion fails, reminders may be off; the account is not reported as deleted. A lost response can leave the final server outcome uncertain: check the account before retrying. There are no automatic deletion retries.

The Edge Function verifies the bearer token through `auth.getUser(token)`. It never trusts an ID in JSON or decodes an unverified token. Unknown body fields are rejected. Its service-role client calls `auth.admin.deleteUser(verifiedUser.id, false)` only after a service-only readiness function confirms all eight owner foreign keys cascade. The privileged key remains in Supabase's function environment, never a VITE variable or frontend bundle. No writing, tokens or identities are logged or returned.

## Apply the migration first

1. Run all earlier migrations in `SCHEMA-SETUP.md`, including `20261114_reflections.sql`, `20261115_celebration_preferences.sql` and `20261116_looking_forward.sql`.
2. Review and run the ENTIRE `supabase/migrations/20261115_account_deletion.sql` in Supabase SQL Editor as administrator. It checks profiles, check_ins, journal_entries, stories, reflections, app_visits, no_contact_days and push_reminders. It replaces only non-cascading owner links to auth.users, adds missing links and validates them; existing orphan data causes a rollback instead of being discarded. It does not delete or rewrite user data. A five-second lock timeout prevents waiting indefinitely. It is safe to rerun.
3. Run `supabase/tests/account_deletion.sql` as an entire file. It creates fresh synthetic users, creates rows in all eight tables (including both writing types and all six reflection kinds), deletes only its newly created test user, checks there are no orphan rows and verifies another test user's rows remain. All changes are rolled back. Never replace ROLLBACK with COMMIT or substitute a real user's ID.

The test uses the current project's auth table and any project-specific triggers. Investigate any trigger incompatibility on a staging project before changing those triggers.

## Deploy the function

From the Closure project folder, while signed into the Supabase CLI:

```powershell
npx supabase secrets set --remote=xalfjmhrdhxvswupuebi DELETE_ACCOUNT_ALLOWED_ORIGINS="https://closuree.vercel.app,http://127.0.0.1:5173,http://localhost:5173"
npx supabase functions deploy delete-account --remote=xalfjmhrdhxvswupuebi --no-verify-jwt
```

Use your own project reference if working in staging. This installation's CLI uses `--remote`; older CLI versions use `--project-ref` instead. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically to hosted Edge Functions. Do not paste their values into chat or frontend files.

`--no-verify-jwt` bypasses only the gateway's legacy token check. The handler still requires and verifies the signed-in user's token using Supabase Auth. An API key alone cannot delete an account. Keep the verifier in place. This supports the app's publishable-key client and asymmetric user JWTs.

Origins must exactly match the deployed/local origins, without trailing slashes. Add a future domain explicitly. Preview deployments are not automatically allowed. Calls without Origin still require a verified user token and both confirmations. No wildcard CORS origin is used.

Deploy the updated frontend yourself after the function and migration are ready. Until then deletion shows a failure, never a false success. No new frontend secret is required.

## Verify using a disposable account

1. Sign up a disposable account; save a check-in, journal entry, letter, story, each reflection kind, app visit/no-contact confirmation, and optionally a reminder.
2. Download both formats from Settings. Open the files and confirm the full writing, Unicode and line breaks are present. Test enough synthetic entries in staging to exceed 500 and 1,000 rows. Data stays in the downloaded files; keep or remove those copies yourself.
3. Check that a wrong confirmation word or unchecked permanent checkbox cannot submit. Cancel leaves the account intact.
4. Delete ONLY the disposable account. The browser should stop reminders, delete the account, clear this project's auth storage, and reload to `/goodbye`. A browser storage failure shows specific site-data cleanup instructions.
5. In Supabase, confirm the disposable auth user is gone and no rows with its former owner ID remain in the eight app tables. Confirm an unrelated disposable account still works. Try logging in as the deleted user; it must fail. Test a missing/forged bearer token, foreign-origin preflight and a JSON `user_id` field: none may reach admin deletion.
6. Check function/setup/network failure messages in staging and verify nothing falsely claims deletion. Test cancellation, double clicks and multiple devices.

## Limits and future changes

This removes live Auth/app records, not copies the user already downloaded, provider-managed backups/log retention, their Google account, or browser history. There is currently no Supabase Storage upload feature in this repo. If Storage uploads are added, handle owned objects before Auth deletion; Supabase can refuse to delete an object owner. Add any future owner table to the readiness check, cascade migration, export scope where appropriate, and deletion SQL test.

Already issued JWTs can remain cryptographically valid until expiry, but deleted users cannot refresh sessions; these app tables' RLS plus validated foreign keys prevent their old owner IDs from recreating data. Other devices clear their session as Auth rejects it. They cannot be remotely unsubscribed at the browser API level, but all server reminder registrations cascade away. A push claimed before deletion may already be in transit. The current browser's subscription is removed before deletion.

Automated checks use synthetic in-memory PostgreSQL and injected Auth/admin adapters. They do not verify a deployed Deno function, real Auth admin deletion, delivery or the remote project's current schema. A live disposable-account test is required before calling deployment verified.

Official references: https://supabase.com/docs/reference/javascript/auth-getuser , https://supabase.com/docs/reference/javascript/auth-admin-deleteuser , https://supabase.com/docs/guides/auth/managing-user-data
