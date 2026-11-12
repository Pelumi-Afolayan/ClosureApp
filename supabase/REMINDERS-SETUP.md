# Optional daily reminders

This is a new backend feature. Nothing sends until all steps below are completed.
Existing app and no-contact tracking do not change. The service worker does not cache anything.

## 1. Database
Run `migrations/20261112_push_reminders.sql` in Closure's Supabase SQL Editor, after the activity migration. Keep this migration in source control. It adds owner-only device subscriptions and a service-role-only delivery claim function. Then run `tests/reminders.sql` to verify the database permissions. These SQL checks must run against Supabase; the Node test suite does not execute them.

## 2. Keys
On your own terminal, run `npx web-push generate-vapid-keys --json` once. Keep the private key private; never paste it into chat, Git, or a VITE variable. Keep the pair stable (rotating requires devices to subscribe again).

Add `VITE_VAPID_PUBLIC_KEY` with the public key to Vercel and `.env.local`. Redeploy Vercel; restart your own local server when ready.

In Supabase Edge Function secrets, add:
- `VAPID_PUBLIC_KEY`: same public key.
- `VAPID_PRIVATE_KEY`: the matching private key, server only.
- `VAPID_SUBJECT`: a real contact URL or `mailto:` address you control.
- `REMINDER_CRON_SECRET`: a long random secret (generate with a password manager), server only.

Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Edge Functions. Do not expose the service-role key in the frontend.

## 3. Deploy sender
Deploy the `supabase/functions/send-reminders` folder as an Edge Function named `send-reminders`. With the Supabase CLI: `supabase functions deploy send-reminders --no-verify-jwt`.
JWT verification is disabled ONLY for this function because it authenticates the cron request using the dedicated `x-reminder-secret` header. Never deploy without that secret configured. The sender imports pinned npm modules on Supabase; no frontend package installation is needed.

## 4. Schedule
In Supabase Dashboard > Integrations > Cron, create an HTTP POST job every 5 minutes (`*/5 * * * *`) to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders`.
Set header `x-reminder-secret` to the exact REMINDER_CRON_SECRET. Store it in Supabase Vault when creating jobs through SQL; never commit secrets in migration files. Empty JSON body is fine.
The function claims at most 50 devices per run. Increase capacity deliberately if the app grows; monitor job responses and failures.

## 5. Device test
Open the deployed app, go to Settings, choose a time and Enable reminders. Grant permission. Try Send a test (local display only).
For a real push test, use a separate account that has NOT opened Closure today: enable a reminder the previous day, close the app, then wait until after the selected local time. Opening the app to set a reminder counts as a visit, so the scheduler correctly skips that day. Do not delete real visit records to test.
Check Cron response counts and Edge Function logs. Push delivery cannot be verified by the frontend build alone. Test Android/Chrome, desktop and an iPhone Home Screen installation on supported iOS (16.4+).

## Behavior and limits
- Opt-in per browser device, with time interpreted in the saved profile timezone. Mood check-ins and no-contact confirmations are never reminder requirements.
- Server checks app_visits at claim time; a visit immediately after the check can race an already queued notification. Delivery depends on OS/network and is not guaranteed exactly on time.
- At most one delivery attempt per device per local day, including failed attempts, to avoid retry spam. Expired (404/410) subscriptions are removed. Other failures appear in job counts; fix configuration before the next day's run.
- Jobs intentionally skip the remainder of a day after a failed attempt. A changing device time setting does not reset the daily claim.
- Notifications are generic and reveal no personal writing. Previously queued messages can still arrive after turning reminders off.
- Turn off in Settings on each device to remove its subscription. Account deletion cascades subscription deletion. Logging out does not revoke notification permission or disable previously opted-in reminders; turn off first on shared devices.
- Only official Google, Mozilla, Apple and Windows push endpoints are accepted to prevent server-side requests to arbitrary addresses. Other push providers need a reviewed allowlist addition.
- No local timers pretend to deliver notifications while the app is closed.

References: https://supabase.com/docs/guides/functions/schedule-functions and https://developer.mozilla.org/en-US/docs/Web/API/Push_API
