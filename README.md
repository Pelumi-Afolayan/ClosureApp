# Closure

Closure is a React app for breakup reflection: private account writing, unsent letters, My Story, optional reflections, mood history, manual no-contact confirmations and gentle support. It uses Supabase for authentication and account data. Writing is **not end-to-end encrypted**; `/privacy` explains administrator access and device drafts.

## Local setup (you control the server)

Use Node.js 22.12 or newer (this work was checked with Node 24.14). The installed Vite engine range is `^20.19.0 || >=22.12.0`.

```powershell
cd C:\Users\AFOLAYAN\React-Project\closureAPP
npm ci
Copy-Item .env.example .env.local
```

Fill in `.env.local` privately with your Supabase project URL and **publishable** key. Never put service-role, VAPID private or cron-secret values into a VITE variable. Optional `VITE_VAPID_PUBLIC_KEY` enables reminder controls once the server setup is complete. Missing configuration shows a setup screen rather than crashing.

```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`. Keep that terminal open. Ctrl+C stops it. Strict-port mode reports an occupied port instead of silently switching to another projectâ€™s port. Configure Supabase Auth redirects for the exact origin you use; Google/email auth needs a connection. This repository does not launch a background server.

## Backend order

Use `supabase/SCHEMA-SETUP.md` for details. On a **fresh** Supabase project, run whole migration files as administrator in this order:

1. `20261110_base_schema.sql`
2. `20261111_activity_streaks.sql`
3. `20261112_push_reminders.sql` â€” fresh-project migration; do not rerun on an existing table.
4. `20261113_reminder_lifecycle.sql`
5. `20261114_reflections.sql`
6. `20261115_account_deletion.sql`
7. `20261115_celebration_preferences.sql`
8. `20261116_looking_forward.sql`

For an existing project, apply only missing migrations after reviewing them. Do not recreate tables. The last migration expands the existing reflection-kind constraint without introducing a new table. It keeps owner RLS, timestamps and cascade deletion.

Run entire `supabase/tests/privacy.sql`, `activity_privacy.sql`, `reminders.sql`, and `account_deletion.sql` on a disposable test project after all migrations. Read their fixture requirements. Leave final ROLLBACK statements intact. Local `npm test` already runs these real SQL files in isolated embedded PostgreSQL with a minimal mocked Auth surface; that is not a live Supabase test.

Follow `supabase/REMINDERS-SETUP.md` and `supabase/DELETE-ACCOUNT-SETUP.md` separately to configure secrets, functions and reminder scheduling. SQL migrations do not deploy Edge Functions or create real browser push subscriptions.

## Checks and production build

```powershell
npm test
npm run lint
npm run build
```

The build emits `dist/` and a generated, versioned `dist/sw.js` that knows the exact hashed JS/CSS/fonts and public icons/images. Do not deploy the source `public/sw.js` by itself. Use the complete build output. Vercel SPA routing is configured in `vercel.json`, using the [documented Vite SPA fallback](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas). The worker is served with a no-cache update-check header.

To test the production PWA locally, stop the dev server first:

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 5173 --strictPort
```

You start and stop preview yourself. Development mode intentionally does not install an offline-shell cache. Existing push setup can still register the source worker in dev. See `PWA-VERIFICATION.md` and `QA-CHECKLIST.md` for offline/install/phone checks.

## Offline and device storage

Cache Storage contains **only public static app files**. Supabase/API/auth responses, private writing, navigation URLs and tokens are never cached by the worker. Offline reload opens a usable shell with support and drafts for the locally signed-in account. Saved account records are not offline-readable. Editors already open stay editable when connectivity drops; account-save buttons are disabled with an explanation. No queued writes or automatic sync are performed.

Unsaved journals/letters, My Story and reflections are saved to IndexedDB after about one second and flushed on pagehide/visibility change when the browser permits. Newer local drafts require Restore or Discard. This device database is not encrypted by Closure and is separate from Cache Storage. Drafts are removed after successful saves, explicit discard, sign-out and local account-deletion cleanup. Blocked storage shows a notice; explicit logout can fail closed if private draft cleanup fails. A browser crash before a debounce finishes, browser eviction or cleared site data cannot be guaranteed recoverable. Offline sign-in is not provided.

Appearance is the only user choice stored in localStorage besides the existing Auth session/device identifier: System/Light/Dark uses `closure.theme`. It is applied before React paints and follows system changes in System mode. Small-step dismissal and closing-ceremony progress live only in memory; neither affects streaks.

## Design and assets

Plain CSS tokens, Newsreader headings, DM Sans body, Lucide icons. Tailwind and Inter were unused and removed. Page overrides now live in their page/component styles. `Alignment.css` retains only shared typography and cross-component spacing; `Polish.css` was removed. Photo gradients and white photo text are intentionally theme-independent. The hero has no conflicting desktop minimum height; long text can grow naturally. Textareas use field-sizing with a measured-height fallback.

The scenic background is WebP (~44 KB) with a palette PNG fallback (~185 KB); both are public. `scripts/optimise-images.js` creates padded maskable icons and optimises the supplied scenic source; its outputs are checked in. There are no lower-page content `<img>` elements to lazy-load: the existing small Google button icon stays eager, and scenic surfaces are CSS backgrounds.

## Status and limits

Automated local SQL, draft, cache-rule, accessibility-markup, request and theme checks are in `tests/`. Real-device install, real push delivery, Lighthouse and current remote schema/function verification need the manual checklist. A successful build does not prove these. Vite currently reports a large single JavaScript chunk; route-level splitting is a future performance improvement. The AI chatbot remains unimplemented.

## Quick tour and feedback

A first onboarding save opens a skippable three-step tour on Today. Settings → Take the quick tour reopens it. The guide uses only UI state and a non-sensitive `guide=1` parameter; it does not collect analytics or add database columns. Skipping/finishing removes that parameter.

Set `VITE_FEEDBACK_FORM_URL` to your public HTTPS feedback form URL in `.env.local` and the hosting environment, then rebuild. Without a valid URL Settings honestly shows that the form is unavailable. The link opens a new tab with no referrer and never appends account identifiers, moods, writing, device information or logs. The external form has its own privacy settings: consider disabling email collection/sign-in requirements, avoid private-writing questions, and test it before publishing.

Suggested form fields: What were you trying to do? What felt confusing or did not work? What would you improve? Keep answers optional and include: Please do not share passwords or private journal entries.
