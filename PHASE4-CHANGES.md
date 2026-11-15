# Phase 4 / Phase 5 review map

This is a review map, not a list of commits already made. Earlier uncommitted journal read-mode, privacy-page and account-export/delete files are also present in the working tree. Review those separately rather than assuming the whole git diff belongs to this pass.

## 1. Public offline shell and installation

Files: `public/sw.js`, `public/manifest.webmanifest`, `public/theme-init.js`, maskable PNGs, `scripts/pwa-build.js`, `vite.config.js`, `src/main.jsx`, `src/utils/pwaRuntime.js`, `src/hooks/usePwa.js`, `src/components/PwaStatus.jsx`, `InstallSettings.jsx`, `src/styles/Pwa.css`, `index.html`, `vercel.json`.

Public build allowlist, version/cleanup, offline navigation fallback, startup registration, optional install UI and explicit update refresh. Push handlers remain generic. All API/auth/private data is excluded from Cache Storage.

## 2. Private device drafts

Files: `src/utils/draftStorage.js`, `src/hooks/useLocalDraft.js`, `src/components/DraftNotice.jsx`, `JournalEditor.jsx`, `Reflections.jsx`, `src/pages/MyStory.jsx`, `OfflineWorkspace.jsx`, `src/services/notificationService.js`, `accountDataService.js`, `src/utils/accountDataRequests.js`, `src/App.jsx`, `SignedInApp.jsx`, `Goodbye.jsx`, `Privacy.jsx`, `DataOwnership.jsx`.

One-second IndexedDB drafts, manual recovery/discard, pagehide flush and stale-writer protection. Explicit save/discard/logout/current-device deletion cleanup; no automatic sync or client encryption. Public privacy/export copy discloses the device-only exception and that unsaved drafts are excluded from account exports.

## 3. Theme / CSS / images

Files: `src/styles/tokens.css`, `src/utils/theme.js`, `src/components/ThemeSettings.jsx`, `src/pages/Onboarding.jsx`, `src/styles/Alignment.css`, page/component CSS including TodayDashboard, Journal/Editor, MyStory, NoContact, Welcome, AppLayout, PageLayout, Onboarding, SignOut, EncouragementPopup and Milestones; `scripts/optimise-images.js`, scenic WebP/PNG. Removed `Polish.css`.

System/Light/Dark with early application and local preference. Theme-safe colour tokens, unchanged dark photo overlay, no conflicting hero desktop minimum, textarea fallback. Safe page overrides moved to their owners. Left in Alignment: global typography, shared quote type and shared story/journal toolbar spacing. Google brand artwork and scenic image pixels stay image-specific. No below-fold content img exists to lazy-load; the Google button icon stays eager.

## 4. Resilience / unused dependencies

Files: `src/pages/RouteError.jsx`, `NotFound.jsx`, `StartupScreen.jsx`, `src/utils/configuration.js`, `requestTimeout.js`, `journalRequests.js`, `notificationRequests.js`, `src/lib/supabase.js`, `src/components/ui/Button.jsx`, `Field.jsx`, `DailyCheckIn.jsx`, `src/hooks/useDailyActivity.js`, `src/pages/Journal.jsx`, `JournalEntry.jsx`, `MyStory.jsx`, `src/components/SignedInApp.jsx`, `package.json` and lockfile.

Safe startup/error screens, keyed asynchronous load state, seven original lint warnings removed, bounded abortable journal mutations, late subscription cleanup and reasoned offline saves. Removed unused Tailwind/Inter and exact unreferenced starter files (`src/assets/hero.png`, `react.svg`, `vite.svg`, `public/icons.svg`). Dev-only tools added: fake-indexeddb, Happy DOM and Sharp; no heavy runtime storage/chart dependency.

## 5. Optional future-facing features

Files: `src/data/smallSteps.js`, `src/utils/smallSteps.js`, `src/components/SmallSteps.jsx`, `src/pages/Today.jsx`, `Closing.jsx`, `Onboarding.jsx`, `src/components/JournalEditor.jsx`, `DataOwnership.jsx`, `Reflections.jsx`, `src/utils/reflectionRequests.js`, `accountExport.js`, `supabase/migrations/20261116_looking_forward.sql`, `supabase/tests/privacy.sql`, `account_deletion.sql`, `src/styles/Closing.css`, and signed-in routing.

36 deterministic optional actions, sixth reflection kind and voluntary closing route. No points, resets, completion flags or automatic prompts. Closing letter is fixed to journal type and gets a nonblank default title if none is entered. Deletion remains the existing verified/confirmed flow.

## 6. Tests / documentation

Tests added: `drafts.test.js`, `draftHook.test.js`, `pwa.test.js`, `contrast.test.js`, `requestTimeout.test.js`, `smallSteps.test.js`. Updated `schema.test.js`, `reflections.test.js`, `notificationLifecycle.test.js`, `accountData.test.js`.

Updated README, `.env.example`, schema/deletion setup docs; added PWA-VERIFICATION.md, QA-CHECKLIST.md and CLOSURE-HANDOFF.md (with five source files in full). Results: 210 tests pass; lint clean; build passes with a large-chunk warning. The database checks are local embedded PostgreSQL, not production Supabase. Real phones, Lighthouse and remote integrations remain manual.
