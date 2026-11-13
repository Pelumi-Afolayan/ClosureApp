# Optional daily reminders

This is a new backend feature. Nothing sends until all steps below are completed.
Existing app and no-contact tracking do not change. The service worker does not cache anything.

## 1. Database
Run `migrations/20261112_push_reminders.sql` in Closure's Supabase SQL Editor, after the activity migration. Keep this migration in source control. It adds owner-only device subscriptions and a service-role-only delivery claim function. Then run `migrations/20261113_reminder_lifecycle.sql` before deploying the updated frontend, and run `tests/reminders.sql` to verify the database permissions. These SQL checks must run against Supabase; the Node test suite does not execute them.

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
- Turn off in Settings on each device to remove its subscription. Account deletion cascades subscription deletion. Logging out attempts this browser's unsubscribe and owner/device row cleanup before ending the session; cleanup failures and timeouts do not prevent logout. Other devices are not unsubscribed.
- Only official Google, Mozilla, Apple and Windows push endpoints are accepted to prevent server-side requests to arbitrary addresses. Other push providers need a reviewed allowlist addition.
- No local timers pretend to deliver notifications while the app is closed.

References: https://supabase.com/docs/guides/functions/schedule-functions and https://developer.mozilla.org/en-US/docs/Web/API/Push_API


## Reminder lifecycle update (13 November 2026)

For an existing project, run only `migrations/20261113_reminder_lifecycle.sql` after the existing reminder migration, then run the entire `tests/reminders.sql` with two test accounts. Do not rerun the original table-creation migration. Deploy the updated frontend and service worker together after the SQL update; the old frontend's direct upsert is intentionally no longer permitted. The sender and Cron configuration are unchanged.

The new authenticated `register_push_reminder` function has SECURITY DEFINER, an empty search_path and no user-ID argument. New ownership always comes from auth.uid(). It validates an approved HTTPS endpoint, matching JSON endpoint and subscription-key formats. To transfer another owner's existing endpoint, both the protected auth key and p256dh key must match. A guessed endpoint cannot take over a row. This is subscription-capability verification, not a network proof that a provider has accepted a newly supplied subscription. No prior-owner information is returned. Daily delivery claims are preserved, not reset. Direct browser INSERT/UPDATE grants are revoked, including the old column grants; owner-scoped SELECT/DELETE remain. No new table is added.

A random opaque `closure.push-device-id` is stored in this browser's localStorage and attached to reminder rows. It contains no account ID, email, subscription keys, moods or writing. This lets Settings clean up this browser's rows after a subscription disappears. Legacy active subscriptions acquire that binding on Settings load. If a legacy subscription disappeared before it ever received a binding, the browser has no safe way to identify its old row without deleting reminders on other devices; expired-provider cleanup remains the fallback. Clearing all site storage similarly loses the mapping.

Logout cleanup runs on the normal sign-out screen, profile-load fallback and onboarding/settings sign-out. Browser unsubscribe and remote deletion are independent, bounded attempts. If either succeeds, it prevents future delivery through that path. If both fail, the app still signs out as requested; reminders cannot be guaranteed stopped until cleanup can succeed or permission is revoked in browser settings. Already displayed notifications are closed when possible. Already delivered notifications cannot be recalled from another device. Global session sign-out does not unsubscribe other devices.

`pushsubscriptionchange` does not fetch auth tokens, access sessions, transmit keys, or silently re-enable consent. It retires old/replacement subscriptions and sends only a generic change signal to app windows. The signed-in Settings page reconciles on load, focus, online return, visibility return and that worker message. Reminders show off after lost/revoked permission; remote cleanup failures are indicated calmly. The user can enable again explicitly. Event support varies, so reconciliation does not depend on the worker event alone. The worker checks that a subscription still exists before displaying a queued push; it still never caches pages or writing.

Manual verification on a test deployment:
1. Enable reminders as account A, then log out. Confirm the device endpoint row is removed, PushManager has no subscription, and this device stops receiving new reminders.
2. Log in as B in the same browser and enable reminders. Confirm B can save a time without a conflict. The SQL suite separately verifies safe takeover when a valid shared subscription survived a failed logout cleanup.
3. Keep a second device enabled for A. Signing out the first browser must not remove the second device's row.
4. Revoke browser notification permission, return to Settings, and confirm off plus removal of this device's mapped row.
5. Remove/expire the push subscription, return to Settings, and confirm the same result. Re-enable explicitly to subscribe again.
6. Simulate offline/failed remote deletion and log out: unsubscribe is still attempted, logout completes, and no private values are logged. Reconnect and inspect cleanup/provider expiry behavior.
7. Test a queued push after unsubscribe and a subscription-change event on supported browsers. A local display test alone is not end-to-end delivery verification.

Node tests include the lifecycle request factory, failures/timeouts, worker changes and execution of the extended SQL suite in embedded PostgreSQL. Real devices and live Supabase still need the manual checks above.

Security/API references: https://www.postgresql.org/docs/current/sql-createfunction.html and https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/pushsubscriptionchange_event
