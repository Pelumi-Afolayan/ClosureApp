# PWA verification — manual production checks

These are instructions, not claims that a device/browser audit was performed. The assistant did not start a server or change the live Supabase project. Automated tests exercise the worker, build allowlist and draft storage locally.

## Start the production build yourself

1. Apply required database migrations and configure `.env.local` privately. Use a disposable account.
2. Stop your dev server with Ctrl+C. Run `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 5173 --strictPort`.
3. Open `http://127.0.0.1:5173` in Chrome/Edge. Loopback is suitable for local service-worker checks. Phones must use an HTTPS deployment; `127.0.0.1` on your phone points to the phone, not your laptop.
4. If testing a clean installation, remove this origin’s old worker/cache in DevTools > Application. This can remove local drafts; export/copy anything you want first. Do not routinely clear storage on a real account for testing.

## Public cache and offline shell

1. Load the production app online and wait for Application > Service Workers to show an activated worker for `/sw.js`.
2. Application > Cache Storage: inspect `closure-shell-<hash>`. It should contain `/index.html`, fixed public manifest/theme/icon/image paths and hashed `/assets/` JS/CSS/fonts. It must contain no Supabase hosts, `/auth`, `/rest`, journal IDs, query tokens, names, writing or JSON API responses.
3. Create disposable writing and wait for “Draft kept on this device.” Inspect Application > IndexedDB > `closure-private-drafts`: only this deliberate private draft belongs there; it is not an API cache. Saving removes its row.
4. Set Network > Offline. Reload `/today`, `/journal/new`, `/my-story` and an unknown route. A generic offline shell should load without fetching saved account records; support works and local drafts can be opened if a cached session identity is present.
5. Restore connectivity and reopen the editor. A newer draft should offer Restore / Discard. Verify no data is uploaded until Save is clicked.
6. In an already-open editor, go offline without reloading. Text remains editable; Save is disabled and the offline banner explains why. Reconnect; Save becomes available.
7. Sign out: IndexedDB rows for that user disappear, another user’s rows are not exposed, and delayed autosaves do not re-create them. Test a disposable account deletion separately.

## Updates without surprising reloads

1. With the first production build open and text unsaved, build/deploy a public asset change in a disposable test deployment (or rebuild preview and reload another tab).
2. Use Application > Service Workers > Update if needed. Do not enable “Update on reload” while checking the user flow.
3. Expect “Update available” with a refresh button. Existing writing must remain untouched and the page must not reload automatically.
4. Cancel the refresh confirmation: remain in the editor. Save or copy writing, then choose refresh. Only that explicit choice activates the new worker and requests a reload; normal beforeunload protection may ask again if writing is dirty.
5. Inspect Cache Storage after activation: obsolete `closure-shell-*` caches disappear; unrelated application caches remain.

## Lighthouse and browser tools

1. Use a production build, not Vite development. Open DevTools > Lighthouse; run Mobile Navigation audits for Performance, Accessibility, Best Practices and SEO. Export the report and record date, browser version, URL and build identifier.
2. Current Lighthouse has no general PWA category. Separately inspect Application > Manifest, Service Workers and Cache Storage; do not treat a Lighthouse score as proof of offline/privacy or push functionality.
3. Manifest: name Closure, standalone display, start URL `/`, scope `/`, any and maskable PNG icons at 192/512, New journal entry and No contact shortcuts. Preview maskable safe areas. Theme colour starts as paper; runtime dark mode updates the HTML meta colour.
4. Use Rendering > Emulate CSS prefers-color-scheme and prefers-reduced-motion. Check keyboard focus, modal close/Escape, 200% zoom, 320px width, long names and long writing. Automated token-pair contrast checks pass, but actual rendered/focus-state accessibility still requires inspection.

## Real phone

- Android Chrome/Edge: open the HTTPS test deployment, use Settings > Install Closure when offered (or browser installation UI). Launch from the home screen, inspect icon cropping, test shortcuts, close/reopen after airplane mode, and check the offline banner and Support. A browser may choose not to offer an install prompt; the button intentionally remains hidden then.
- iPhone/iPad Safari: Settings gives “Share, then Add to Home Screen.” Install, launch the home-screen app, then test offline reload and dark/light system changes. There is no fabricated beforeinstallprompt event on Safari. Test the actual OS/browser you support.
- Reminders: in an installed, supported secure context, opt in, choose a time and send a test. Then test scheduled delivery when the app has not been opened that day. Check revoked permission, logout and account switching; no notification may show personal text. Delivery timing is browser/network dependent and must be verified against the deployed sender and cron.

References: [Chrome Lighthouse](https://developer.chrome.com/docs/devtools/lighthouse), [PWA debugging](https://developer.chrome.com/docs/devtools/progressive-web-apps), [MDN installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
