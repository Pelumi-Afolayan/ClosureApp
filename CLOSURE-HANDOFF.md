# Closure — code-based project handoff

Inspected locally on 15 November 2026 (Africa/Lagos). This report describes the working tree, including earlier uncommitted work. It is not proof that this frontend or the newest migrations have been deployed. No credentials or private user content are included.

## 1. Overview

Closure is a breakup-reflection React app with personal accounts, writing, unsent letters, My Story, optional learning reflections, mood history and a manually confirmed no-contact tracker. The app is **partially verified**: local tests/lint/build pass, while current remote schema, full real-auth journeys, real-device PWA/push behaviour and rendered visual QA still need the manual checklist. There is no AI chatbot implementation.

## 2. Tech stack and exact commands

JavaScript / JSX frontend, React and React DOM, React Router data router, Vite with the React plugin, Supabase Auth/PostgreSQL and two Deno Edge Functions. Styling is plain CSS tokens with local Fontsource Newsreader and DM Sans; Lucide supplies UI icons. There is no Tailwind or Inter dependency now, no chart library and no runtime IndexedDB library.

Installed versions at inspection:

| Package | Installed version | Use |
|---|---|---|
| @fontsource/dm-sans | 5.3.0 | runtime |
| @fontsource/newsreader | 5.3.0 | runtime |
| @supabase/supabase-js | 2.118.0 | runtime |
| lucide-react | 1.61.0 | runtime |
| react | 19.3.1 | runtime |
| react-dom | 19.3.1 | runtime |
| react-router | 8.5.0 | runtime |
| @electric-sql/pglite | 0.5.16 | development / testing |
| @types/react | 19.3.0 | development / testing |
| @types/react-dom | 19.3.0 | development / testing |
| @vitejs/plugin-react | 6.1.2 | development / testing |
| fake-indexeddb | 6.2.8 | development / testing |
| happy-dom | 21.0.4 | development / testing |
| oxlint | 1.89.0 | development / testing |
| sharp | 0.35.5 | development / testing |
| vite | 8.3.5 | development / testing |

The Deno functions separately pin `@supabase/supabase-js@2.118.0`; the reminder sender pins `web-push@3.6.7`. Node here is 24.14.0; Vite’s engine requirement is `^20.19.0 || >=22.12.0`.

```powershell
cd C:\Users\AFOLAYAN\React-Project\closureAPP
npm ci
Copy-Item .env.example .env.local
# Fill in the public Supabase URL/key privately, then:
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The owner controls that terminal; Ctrl+C stops the server. The assistant did not start it. Never put service-role, private VAPID or cron-secret values in frontend variables. After all backend migrations, configure Auth site/redirect URLs and Google credentials. Full setup is in README.md and supabase/SCHEMA-SETUP.md.

```powershell
npm test
npm run lint
npm run build
# Owner-started production preview, after stopping dev:
npm run preview -- --host 127.0.0.1 --port 5173 --strictPort
```

## 3. Main files and folders

```text
closureAPP/
├── index.html                         HTML, manifest/icons and early theme script
├── vite.config.js                     React plugin and post-build shell generator
├── vercel.json                        SPA fallback and worker update-check header
├── .env.example                       Public frontend configuration template
├── scripts/
│   ├── pwa-build.js                    Hash/list public build assets; emit versioned worker
│   └── optimise-images.js              Generate padded icons and optimise scenic assets
├── public/
│   ├── sw.js                          Static-cache lifecycle plus existing generic push handlers
│   ├── theme-init.js                  Apply device/system theme before React mounts
│   ├── manifest.webmanifest           Standalone app identity, icons and shortcuts
│   ├── icons/                         Any/maskable 192/512 PNG icons
│   └── images/                        Scenic WebP plus PNG fallback
├── src/
│   ├── main.jsx                       Fonts, PWA/theme startup, router/error boundary
│   ├── App.jsx                        Auth/recovery/public routes and offline-start shell
│   ├── lib/supabase.js                 Guard configuration before constructing the client
│   ├── components/
│   │   ├── SignedInApp.jsx             Profile load, signed-in routes, activity/support providers
│   │   ├── AppLayout.jsx               Persistent desktop navigation and mobile account sheet
│   │   ├── JournalEditor.jsx           Manual saves, prompts, lesson copies, release and local drafts
│   │   ├── JournalReader.jsx           Read-only saved writing and explicit Edit entry point
│   │   ├── Reflections.jsx             Six learning/reason kinds and device-draft recovery shelf
│   │   ├── DailyCheckIn.jsx            Optional multi-mood daily check-in
│   │   ├── DailyEncouragement.jsx      Deterministic quote and scenic enlargement dialog
│   │   ├── SmallSteps.jsx              Optional daily public action; dismiss in memory
│   │   ├── StreakCard/Details.jsx      App/no-contact counts, week strip and confirmation UI
│   │   ├── NoContactMilestone.jsx      Optional automatic celebration and manual viewing
│   │   ├── ActivityProvider.jsx        Separate app-visit and no-contact histories
│   │   ├── UrgeSessionProvider.jsx     In-memory urge timer/guidance, no history record
│   │   ├── SupportDialog.jsx           Grounding, friend-copy and verified-only resource UI
│   │   ├── DataOwnership.jsx           Saved-account export and typed-confirmation deletion
│   │   ├── PwaStatus.jsx               Offline reason and user-chosen update refresh
│   │   ├── InstallSettings.jsx         Available install event / iOS instructions
│   │   ├── ThemeSettings.jsx           System/Light/Dark device preference
│   │   ├── DraftNotice.jsx             Restore/discard and device-storage notices
│   │   └── ui/                        Shared Button, Field, Card, Notice and LeaveDialog
│   ├── pages/                         Public auth, signed-in feature, offline/error/privacy screens
│   ├── services/                      Supabase/browser adapters for auth, writing and activity
│   ├── utils/                         Injectable request factories and pure logic
│   │   ├── draftStorage.js             User/entry-scoped IndexedDB and stale-writer invalidation
│   │   ├── pwaRuntime.js               Connectivity/install/update event state
│   │   ├── requestTimeout.js           Bounded abortable journal requests
│   │   ├── theme.js                    Preference resolution and device/system updates
│   │   └── …                          Dates, streaks, export, prompts, moods, reflections, support
│   ├── hooks/                         Shared activity, draft, connectivity and urge hooks
│   ├── data/                          Goals, moods, quotes, prompts, small steps, resource placeholders
│   └── styles/                        Tokens and page/component CSS; tiny shared Alignment.css
├── supabase/
│   ├── migrations/                    Ordered base/activity/reminder/reflection/privacy migrations
│   ├── functions/send-reminders/       Secret-authenticated generic scheduled push sender
│   ├── functions/delete-account/       Verify JWT owner, readiness guard, hard-delete Auth account
│   ├── tests/                         Transactional SQL privacy/reminder/cascade checks
│   └── *SETUP.md                      Migration/function/configuration instructions
├── tests/                             Node, embedded PostgreSQL, worker VM and fake IndexedDB/DOM tests
├── README.md                          Current setup, checks, offline/draft/design limits
├── PWA-VERIFICATION.md                 Lighthouse/Application/phone verification procedure
└── QA-CHECKLIST.md                     Manual cross-feature test checklist
```

`StreakCard/Details.jsx` above abbreviates the separate `StreakCard.jsx` and `StreakDetails.jsx` files.

## 4. Features and actual status

Here “done” means implemented in this code, not a claim of a fresh end-to-end production test.

| Feature | Status | Main implementation and behaviour |
|---|---|---|
| Welcome and account auth | done, external configuration required | Welcome, Signup, Login, ForgotPassword, ResetPassword; authService/authActions/passwordRecovery use Supabase and current-origin redirects. |
| Multi-goal profile/settings | done, migrations required | Onboarding, profileService/profileRequests; preferred name, multiple goals, timezone and default-on celebration preference. Initial onboarding hides normal navigation. |
| Today | done | Today, DailyEncouragement, DailyCheckIn, SmallSteps; deterministic scenic quote, optional moods, selected goals, writing links and two independent activity chips. |
| Optional small steps | done | data/smallSteps, utils/smallSteps, SmallSteps; 36 public actions selected deterministically from goals/account/local date; dismissal is memory-only, without writes/points. |
| App visits and no contact | done, backend migration required | useDailyActivity, activityService/activityRequests, StreakDetails; app opens record once per signed-in local day, no-contact dates only after manual confirmation. Mood submission controls neither. |
| No-contact milestones | done | milestones and NoContactMilestone; predefined thresholds, random warm message, manual viewing, opt-out prevents only automatic opening. No reset control. |
| Journal/letters | done | Journal, JournalEntry, JournalReader, JournalEditor and journalRequests; filtered paginated list, new edit mode, saved read mode, manual save/edit/delete and dirty-navigation protection. |
| Optional prompts/lesson copies | done | journalPrompts, journalPromptSelection, JournalStartingPoint and editor; free-write default; prompt fills optional title; selected/whole text can be copied to reflection kinds without changing the entry. |
| Letter release | done, real network QA pending | letterRelease and editor; saved letters offer confirmation and CSS dissolve before deletion; visible text remains if outcome is unconfirmed. Older-letter labels use creation date. |
| My Story | done | MyStory/storyRequests; three optional answers, saved read mode and explicit edit, manual upsert and dirty-form protection. |
| Learning reflections | partial until latest migration is applied | Reflections/reflectionRequests and migrations; lesson, my_part, next_time, reality_check, reason and new looking_forward. Reasons are managed on No Contact/urge, not the main learning list. |
| Urge tool | done | UrgeFlow, urge utils/provider; timestamp-based ten-minute pause, optional skip after two minutes, saved reasons, random reality checks, letter/friend/close choices. Timer and guidance cache are memory-only. |
| Mood history | done | MoodHistory/moodHistory/check-in service; 7/30/90-day strips from one range covering current/previous periods, neutral gaps, read-only moods/notes and guarded comparisons. |
| Support | partial resources | SupportDialog/SupportButton/support utils; offline grounding and optional friend message. Country list exists, but real contacts are blank verified:false placeholders. Only generic emergency fallback currently ships. |
| Saved-data export | done | DataOwnership/accountDataRequests/accountExport; owner-filtered paginated reads build Markdown/JSON locally, include preference and activity dates, exclude auth/push keys. Unsaved device drafts are not included. |
| Account deletion | implemented; deployed function previously reported by owner, live disposable deletion not reverified | delete-account handler verifies JWT and never accepts an owner ID from JSON; readiness guard verifies cascades; browser reminder/draft/session cleanup and goodbye page follow success. |
| Privacy page | done | /privacy via App/Privacy, linked from Welcome/Settings; explains administrator access, no end-to-end encryption, saved/local data and deletion limits. |
| Offline shell and install | implemented, phone/host verification pending | public worker, build plugin and pwaRuntime; only public static files enter Cache Storage; offline start shows Support/device drafts, not cached account records. |
| Device drafts | implemented and locally tested, browser limits apply | draftStorage, useLocalDraft, DraftNotice plus editors/offline workspace; roughly one-second debounce, recovery choice, per-user/entry keys and deletion/logout invalidation. Browser eviction or a crash before commit is not guaranteed recoverable. |
| Dark mode | implemented, rendered visual audit pending | tokens, theme-init, theme, ThemeSettings; system default with local override, early apply and theme-colour changes. Token-pair contrast tests pass. |
| Closing ceremony | implemented, manual QA pending | Closing at /closing, opened only from Settings; re-read story/lessons, save titled journal letter to past self, keep/export/delete choices. No completion flag or app behaviour change. |
| Error handling | implemented | main router error boundary, NotFound and StartupScreen; journal save/delete timeout+abort and explicit unknown-outcome notices; registration/permission timeouts retire late subscriptions. |
| AI chat/community | not started | No AI model/API endpoint, conversation storage, social feed or community feature exists. |

## 5. PWA setup

Manifest: id/start URL/scope `/`, name/short_name Closure, lang en, display standalone, paper background/theme `#faf7f0`, any and maskable PNG icons at 192/512, New journal entry and No contact shortcuts. The padded icons are generated from the existing leaf artwork, not a new logo.

The build plugin collects the emitted hashed JS/CSS/fonts and fixed public HTML, manifest, theme boot, icons and images. It hashes file contents plus worker source, prefixes a manifest into `dist/sw.js`, and uses `closure-shell-<version>` caches. Installation fetches only those anonymous same-origin public assets; activation cleans only old Closure shell versions. API/auth/foreign-origin/non-GET/query asset fetches are not handled or stored. Navigation is network-first with the *preinstalled public index.html* as an offline failure fallback; navigation responses and URLs are never written to cache.

Startup registers the production worker independently of reminders. New versions wait; a notice asks the user to refresh and warns to save first. No automatic app reload occurs just because a worker update was found. Source-worker registration in development supports push but deliberately has no generated shell cache. Install UI uses a captured beforeinstallprompt event when provided; Safari gets instructions rather than a fabricated prompt.

Push handlers remain: generic fixed text, current subscription checked before display, only the app route opened, replacement subscriptions retired and app windows notified on subscription changes. The scheduled sender/cron and keys remain external setup steps.

**Actually available offline by implementation:** after a successful production install, public shell, early theme, CSS/fonts/icons/scenic assets, generic support exercise/friend text and this browser’s local drafts when a cached session identity exists. Already-open editors retain their in-memory text. **Not available:** fresh authentication, fetching saved account writing/moods/profile, remote saves/deletes/confirmations/exports, new reminder registration or offline-to-online automatic sync. No private API data is cached. Real browser/phone validation remains open.

## 6. Data and storage

All saved account data lives in Supabase PostgreSQL, with owner-scoped RLS. Auth users are managed by Supabase. All eight owner tables have cascading links to auth.users; the readiness migration verifies/repairs those links. The repo does not prove an encryption-at-rest policy and makes no such claim; app writing is not end-to-end encrypted.

| Table | Main shape |
|---|---|
| profiles | Auth user id PK; preferred_name text, goals text[], timezone text, onboarding_complete boolean, show_celebrations boolean default true, timestamps |
| check_ins | UUID id; user FK, check_in_date date, moods text[], note text; unique owner/date; timestamps |
| journal_entries | UUID id; user FK, title/content text, entry_type journal or unsent_letter; timestamps |
| stories | user_id PK/FK; what_happened, what_hurt, what_i_need text; timestamps |
| reflections | UUID id; user FK, kind in six supported kinds, nonblank content up to 1,000 chars, timestamps; owner/kind/created index |
| app_visits | owner/date composite PK, recorded_at; server derives current local day |
| no_contact_days | owner/date composite PK, recorded_at; server records only a manual confirmation |
| push_reminders | endpoint text PK, owner FK, subscription JSON, reminder_time, last_sent_date, device_id UUID; validated registration RPC |

IndexedDB: database `closure-private-drafts`, object store `drafts`, key JSON.stringify([userId, entryKey]), userId index. Rows include entryKey, values, updatedAt and original savedAt. Entry keys separate journal IDs/new types, story, reflection IDs/new kinds and closing letter. No draft is uploaded automatically or encrypted by Closure. Epoch and key revisions reject stale writes after removal/logout. Drafts are cleared on current-device explicit save/discard/sign-out/deletion; other offline devices cannot be remotely wiped until they reconnect and process sign-out.

localStorage: existing project-scoped Supabase session, opaque `closure.push-device-id`, and `closure.theme` only. Urge session data, small-step dismissal, pending install/update events and closing progress are memory-only. The worker’s Cache Storage is the explicit public-file exception described above, never a database of user records.

## 7. Screens and navigation

- Public: `/` Welcome, `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/privacy`, `/goodbye`.
- Signed in: `/onboarding` doubles as Settings, `/today`, `/journal`, `/journal/new`, `/journal/:entryId`, `/my-story`, `/no-contact`, `/no-contact/urge`, `/mood`, `/closing`, `/sign-out`.
- Letters reuse `/journal?type=unsent_letter` and `/journal/new?type=unsent_letter`; learning reuses `/my-story?section=learning`. Urge steps use a fixed step query value, not personal writing. Saved entry IDs occur in normal private app routes, never the worker cache or notification payload.
- Desktop sidebar stays for normal signed-in feature routes. Mobile has Today, Journal (letters inside), No contact, My Story and You. Account sheet gives Settings, Support and mood history; no sixth tab was added. Urge flow uses the whole screen, still with Support. Closing is reached explicitly from Settings. Privacy and goodbye are standalone public views.
- Unknown routes have a friendly 404. Missing configuration and route exceptions have safe screens. Initial offline start uses OfflineWorkspace instead of failed private fetches.

## 8. Design

Light tokens: paper #faf7f0, surface white, ink #262b26, muted #565d55, sage #e4eadf/#4d6750/#35493a, clay #f5e6dc/#94502f and muted danger tones. Dark: paper #141a17, surface #202923, ink #edf0e9, muted #bdc8bb, sage #293d2f/#a8c99f/#d2e5ca, clay #3a2b24/#edb28c, danger #ffb4ab on #462c2a. Key normal-text token pairs and a worst-case photo overlay are tested at >=4.5:1; actual rendered states still require QA.

Newsreader weight 400 for headings/reading and DM Sans 400/500/600 for interface/body. Spacing tokens are 8/16/24/32/48px, with 62rem wide and 40rem narrow containers. Desktop sidebar/mobile bottom navigation and native dialogs follow existing patterns. Photo surfaces deliberately retain white text and dark gradients in both themes.

Polish.css was removed; page/component rules moved to their owners. Alignment.css retains only shared type and the cross-component journal/story toolbar spacing, which were not safely owned by one page. Existing CSS-only release, grounding and dialog motion remain; reduced-motion paths exist. Hero conflicting minimum heights were removed, allowing long quotes to grow; older browsers use a textarea measured-height fallback instead of relying solely on field-sizing.

## 9. Known problems and limits

- Current frontend, latest migrations and hosting rewrite are not deployed by this task. Apply missing migrations before deploying, especially show_celebrations and looking_forward. The current remote schema/keys/cron/provider setup are not inferred from build success.
- Support resource contacts are intentional verified:false placeholders. The generic fallback is present, but real verified numbers still need the owner’s research/verification. No invented contact ships.
- Real-phone install, push scheduling, browser eviction, Lighthouse, keyboard/screen-reader/mobile visual QA are not marked passed. Safari/OS/browser policy can affect installation and notification availability.
- A crash before the approximately one-second IndexedDB debounce or before a pagehide transaction commits can lose that last uncommitted edit. Quota, storage denial or site-data deletion can remove/prevent drafts. Explicit logout can fail closed on device-draft cleanup errors; browser site-data cleanup remains a fallback. A remote sign-out cleanup failure cannot guarantee a wipe on a disconnected device.
- Offline shell is deliberately not offline account access. Cached identity permits only device-draft recovery, not a verified remote session or saves. Private account rows must be fetched again online.
- New-entry remote save/delete timeouts can have an unknown server outcome. Notices tell users to check saved writing before retrying; no automatic mutation retries are added. Browser/runtime tests do not prove network-level idempotency.
- The production JS is still one large chunk (~708 KB uncompressed, ~206 KB gzip at this build); Vite warns above 500 KB. Route splitting is a future performance improvement, not done here.
- Profile/celebration choices in another already-open device/tab need a profile reload; there is no live preference subscription. Ceremony progress and small-step dismissal do not survive navigation/reload by design.
- Supabase Auth admin deletion, Storage ownership constraints, provider backup/log retention and real queued push delivery are external limits. There is no Storage upload feature currently.
- Google’s small logo remains an external eager image; it is not cached by the worker. Scenic assets are CSS backgrounds, not lazy-loaded content images. There are no other content img elements to mark lazy.
- Existing tests mock only the minimal Supabase Auth surface for embedded SQL and use fake browser storage/DOM for client tests. They do not substitute for a complete browser/device test.

## 10. Decisions and open questions

- Preserve multi-select goals and personal owner-only data; no social features or chatbot were added.
- Opening the signed-in app counts an app visit; no contact requires manual confirmation; moods, lessons, small steps and closing never earn/reset streaks. Gaps are not framed as failure.
- Opt-out affects automatic milestone popups only. User-tapped milestone cards remain available.
- Public Cache Storage plus explicitly private device IndexedDB drafts separates offline availability from accidental API caching. Device drafts are disclosed, not described as end-to-end encrypted.
- Use a tiny IndexedDB wrapper and CSS/SVG instead of heavy runtime storage/chart libraries; fake-indexeddb, Happy DOM and Sharp are dev-only.
- Updates are user-chosen, install UI is capability-driven, and normal local servers stay under the owner’s control.
- Closing is voluntary, saves a titled journal entry, and reuses existing export/delete confirmations rather than inventing a new deletion path. It sets no completion state in the profile.
- Remaining decisions: which support contacts to verify, which real devices to support, whether to add cross-device draft sync (currently explicitly absent), when to split routes, and future AI scope/cost/privacy. None is silently implemented.

## 11. Suggested next steps and verification record

1. Apply missing preference/looking-forward migrations, using README order. Run SQL suites against a separate disposable Supabase project when one is available. This task ran the SQL locally instead, at the owner’s request; no production SQL or account deletion was performed.
2. Owner-start the production preview and follow QA-CHECKLIST.md / PWA-VERIFICATION.md, including direct-route refreshes, offline launch and cache inspection.
3. Test actual Android/iOS install, accessibility, both themes and old-browser textarea fallback. Export Lighthouse reports instead of inventing a score.
4. Deploy the complete dist build only after manual review. Test real generic push/logout/account switching and disposable-account export/delete on the intended remote setup.
5. Address route-level bundle splitting and remaining device findings, then consider future design/AI planning.

Local automated results on 15 November 2026: **210 tests passed, zero failures**; `npm run lint` clean (zero warnings/errors); `npm run build` passed with the documented large-chunk warning. The entire real SQL suites `privacy.sql`, `activity_privacy.sql`, `reminders.sql` and `account_deletion.sql` passed inside embedded PostgreSQL after ordered migrations. A final account-cleanup assertion was additionally rerun in its focused suite. No live Supabase SQL, phone test, Lighthouse score, deployment or git push is claimed. No server was started.

## Full contents of five key files

These are source files from the inspected working tree; environment values are not embedded here.

### src/App.jsx

```jsx
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'
import OfflineWorkspace from './pages/OfflineWorkspace'
import { usePwa } from './hooks/usePwa'
import { drafts } from './utils/draftStorage'
import { authStorageKey } from './lib/supabase'
import Goodbye from './pages/Goodbye'
import LoadingPlaceholder from './components/ui/LoadingPlaceholder'
import Notice from './components/ui/Notice'
import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'

import { supabase } from './lib/supabase'
import Welcome from './pages/Welcome'
import Signup from './pages/Signup'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SignedInApp from './components/SignedInApp'
import './styles/Auth.css'

// Read only the error flag. Never display or log credentials from the URL.
const redirectParameters = new URLSearchParams(window.location.hash.slice(1))
const redirectFailed = redirectParameters.has('error')
  || new URLSearchParams(window.location.search).has('error')

export default function App() {
  const { online } = usePwa()
  const [offlineStart] = useState(() => navigator.onLine === false)
  const previousUser = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [recoveringPassword, setRecoveringPassword] = useState(false)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    if (offlineStart && !online) return
    let active = true
    let receivedAuthEvent = false

    const timeout = window.setTimeout(() => {
      if (!active) return
      setSessionError('The sign-in service is taking too long. Please reload and try again.')
      setLoading(false)
    }, 15000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!active) return

        if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true)
        if (event === 'SIGNED_OUT') { setRecoveringPassword(false); if (previousUser.current) drafts.clearUser(previousUser.current).catch(() => {}) }
        previousUser.current = nextSession?.user?.id || null

        receivedAuthEvent = true
        window.clearTimeout(timeout)
        setSession(nextSession)
        setSessionError('')
        setLoading(false)
      }
    )

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active || receivedAuthEvent) return

        window.clearTimeout(timeout)
        setSessionError(error ? 'Could not restore your session. Please reload and try again.' : '')
        previousUser.current = data.session?.user?.id || null
        setSession(data.session)
        setLoading(false)
      })
      .catch(() => {
        if (!active || receivedAuthEvent) return

        window.clearTimeout(timeout)
        setSessionError('Could not check your session. Please reload and try again.')
        setLoading(false)
      })

    return () => {
      active = false
      window.clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [offlineStart, online])

  if (offlineStart && !online && location.pathname !== '/privacy') {
    let userId = session?.user?.id
    if (!userId) { try { userId = JSON.parse(localStorage.getItem(authStorageKey))?.user?.id } catch { /* No cached identity. */ } }
    return <OfflineWorkspace userId={userId} />
  }

  if (location.pathname === '/privacy') return <Privacy signedIn={Boolean(session)} />

  if (location.pathname === '/goodbye') return <Goodbye />

  if (loading) {
    return (
      <main className="auth-state">
        <LoadingPlaceholder label="Checking your sign-inâ€¦" />
      </main>
    )
  }

  if (sessionError) {
    return (
      <main className="auth-state">
        <Notice variant="error">{sessionError}</Notice>
        <button
          type="button"
          className="button button--primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    )
  }

  // Recovery must take priority: an email reset link also signs the user in.
  if (location.pathname === '/reset-password' || recoveringPassword) {
    if (location.pathname !== '/reset-password') {
      return <Navigate to="/reset-password" replace />
    }

    return (
      <ResetPassword
        session={session}
        linkFailed={redirectFailed}
        onComplete={() => {
          setRecoveringPassword(false)
          navigate('/today', { replace: true })
        }}
        onCancel={() => {
          setRecoveringPassword(false)
          navigate(session ? '/today' : '/forgot-password', { replace: true })
        }}
      />
    )
  }

  if (session) {
    return <SignedInApp key={session.user.id} user={session.user} />
  }

  return (
    <>
      {redirectFailed && (
        <Notice variant="error">
          Google sign-in or email confirmation was not completed.
          Please open Log in and try again.
        </Notice>
      )}

      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
```

### src/components/SignedInApp.jsx

```jsx
import MoodHistory from '../pages/MoodHistory'
import Closing from '../pages/Closing'
import NotFound from '../pages/NotFound'
import { drafts } from '../utils/draftStorage'
import UrgeSessionProvider from './UrgeSessionProvider'
import UrgeFlow from '../pages/UrgeFlow'
import SupportButton from './SupportButton'
import SupportDialog from './SupportDialog'
import LoadingPlaceholder from './ui/LoadingPlaceholder'
import Notice from './ui/Notice'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import AppLayout from './AppLayout'
import ActivityProvider from './ActivityProvider'
import NoContact from '../pages/NoContact'
import SignOut from '../pages/SignOut'
import Button from './ui/Button'
import { getProfile } from '../services/profileService'
import { signOutWithReminderCleanup } from '../services/notificationService'
import Onboarding from '../pages/Onboarding'
import Today from '../pages/Today'
import MyStory from '../pages/MyStory'
import Journal from '../pages/Journal'
import JournalEntry from '../pages/JournalEntry'

export default function SignedInApp({ user }) {
  useEffect(() => { drafts.begin(user.id) }, [user.id])
  const [supportOpen, setSupportOpen] = useState(false)
  const openSupport = () => setSupportOpen(true)
  const [profile, setProfile] = useState(null)
  const [loadedKey, setLoadedKey] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${user.id}:${attempt}`
  const loading = loadedKey !== requestKey
  const [signingOut, setSigningOut] = useState(false)
  const supportDialog = (
    <SupportDialog
      open={supportOpen}
      onClose={() => setSupportOpen(false)}
      timezone={profile?.timezone}
    />
  )

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)


    getProfile(user.id, controller.signal)
      .then((savedProfile) => {
        if (active) { setProfile(savedProfile); setErrorMessage('') }
      })
      .catch(() => {
        if (!active) return

        setErrorMessage(
          'We could not load your profile. Please check your connection and try again.'
        )
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (active) setLoadedKey(requestKey)
      })

    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [user.id, attempt, requestKey])

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)

    try {
      const { error } = await signOutWithReminderCleanup(user.id, { scope: 'local' })
      if (error) throw error
    } catch {
      setErrorMessage('Could not sign out. Please check your connection and try again.')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <>
        <main className="auth-state">
          <SupportButton onClick={openSupport} />
          <LoadingPlaceholder label="Getting your space ready…" />
        </main>
        {supportDialog}
      </>
    )
  }

  if (errorMessage) {
    return (
      <>
        <main className="auth-state">
          <SupportButton onClick={openSupport} />
          <Notice variant="error">{errorMessage}</Notice>

          <Button onClick={() => setAttempt((current) => current + 1)}>
            Retry
          </Button>

          <Button secondary disabled={signingOut} onClick={handleSignOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </main>
        {supportDialog}
      </>
    )
  }

  const destination = profile?.onboarding_complete ? '/today' : '/onboarding'

  return (
    <UrgeSessionProvider key={user.id} userId={user.id}>
      <Routes>
        <Route element={profile?.onboarding_complete ? (
          <ActivityProvider key={`${user.id}:${profile.timezone}`} userId={user.id} timezone={profile.timezone}>
            <AppLayout user={user} onSupport={openSupport} />
          </ActivityProvider>
        ) : undefined}>
          <Route
            path="/onboarding"
            element={(
              <Onboarding
                user={user}
                profile={profile}
                onSupport={openSupport}
                onComplete={setProfile}
              />
            )}
          />

          <Route
            path="/today"
            element={profile?.onboarding_complete
              ? <Today user={user} profile={profile} />
              : <Navigate to="/onboarding" replace />}
          />

          <Route
            path="/mood"
            element={profile?.onboarding_complete
              ? <MoodHistory key={`${user.id}:${profile.timezone}`} user={user} profile={profile} />
              : <Navigate to="/onboarding" replace />}
          />

          <Route
            path="/journal"
            element={profile?.onboarding_complete
              ? <Journal user={user} profile={profile} />
              : <Navigate to="/onboarding" replace />}
          />

          <Route
            path="/journal/new"
            element={profile?.onboarding_complete
              ? <JournalEntry user={user} profile={profile} />
              : <Navigate to="/onboarding" replace />}
          />

          <Route
            path="/journal/:entryId"
            element={profile?.onboarding_complete
              ? <JournalEntry user={user} profile={profile} />
              : <Navigate to="/onboarding" replace />}
          />

          <Route
            path="/my-story"
            element={profile?.onboarding_complete
              ? <MyStory user={user} profile={profile} />
              : <Navigate to="/onboarding" replace />}
          />

          <Route
            path="/no-contact"
            element={profile?.onboarding_complete ? <NoContact user={user} profile={profile} /> : <Navigate to="/onboarding" replace />}
          />

          <Route
            path="/no-contact/urge"
            element={profile?.onboarding_complete ? <UrgeFlow user={user} /> : <Navigate to="/onboarding" replace />}
          />

          <Route path="/closing" element={profile?.onboarding_complete ? <Closing user={user} profile={profile} /> : <Navigate to="/onboarding" replace />} />
          <Route path="/sign-out" element={<SignOut userId={user.id} />} />
        </Route>

        <Route path="/" element={<Navigate to={destination} replace />} />
        <Route path="*" element={<NotFound destination={destination} />} />
      </Routes>
      {supportDialog}
    </UrgeSessionProvider>
  )
}

```

### public/sw.js

```javascript
// Cache Storage contains ONLY the build's same-origin public static allowlist.
// NEVER cache Supabase/API/auth responses, navigation URLs, tokens or private data.
// Private drafts use a separate, user-scoped IndexedDB store in the app, not here.
const shell = self.__CLOSURE_SHELL__
const cacheName = shell ? `closure-shell-${shell.version}` : null
const assets = new Set(shell?.assets || [])

self.addEventListener('install', event => {
  if (!shell) return
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName)
    // Fetch only fixed public files, never a current URL with auth parameters.
    await cache.addAll(shell.assets.map(url => new Request(url, { credentials: 'omit', cache: 'reload' })))
  })())
  // A new worker waits. Only the explicit refresh button asks it to activate.
})
self.addEventListener('activate', event => {
  if (!shell) return
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('closure-shell-') && name !== cacheName) await caches.delete(name)
    }
    await self.clients.claim()
  })())
})
self.addEventListener('message', event => {
  if (event.data?.type === 'CLOSURE_ACTIVATE_UPDATE') self.skipWaiting()
})
self.addEventListener('fetch', event => {
  if (!shell || event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (event.request.mode === 'navigate') {
    // Do not cache the navigation response or its URL. An offline route gets
    // the generic index.html that was fetched without credentials at install.
    event.respondWith(fetch(event.request).catch(async () => (await caches.open(cacheName)).match('/index.html')))
    return
  }
  if (url.search || !assets.has(url.pathname) || url.pathname === '/index.html') return
  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    return await cache.match(url.pathname) || fetch(event.request)
  })())
})

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    // A queued push must not display after this browser has unsubscribed.
    if (!await self.registration.pushManager.getSubscription()) return
    await self.registration.showNotification('A little space for you', {
      body: 'Come back to Closure whenever you are ready.',
      icon: '/icons/closure-192.png',
      badge: '/icons/closure-192.png',
      tag: 'closure-daily-reminder',
      data: { url: '/today' },
    })
  })())
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const tab = tabs.find((client) => new URL(client.url).origin === self.location.origin)
    if (tab) { await tab.focus(); return }
    await self.clients.openWindow('/today')
  })())
})

// Do not renew anonymously or put account credentials in a service worker.
// Stop any replacement subscription; the signed-in Settings page reconciles
// the old device row, then the user can explicitly enable reminders again.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try { await event.oldSubscription?.unsubscribe() } catch { /* Already expired. */ }
    try { await event.newSubscription?.unsubscribe() } catch { /* Reconcile on return. */ }
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const tab of tabs) {
      if (new URL(tab.url).origin === self.location.origin) {
        tab.postMessage({ type: 'CLOSURE_PUSH_SUBSCRIPTION_CHANGED' })
      }
    }
  })())
})

```

### src/utils/draftStorage.js

```javascript
// Private device-only drafts. Never use Cache Storage, network requests or logs.
export function createDraftStorage(getFactory = () => globalThis.indexedDB) {
  let opened
  const epochs = new Map()
  const blocked = new Set()
  const revisions = new Map()
  function epoch(userId) { return epochs.get(userId) || 0 }
  function begin(userId) {
    if (blocked.delete(userId)) epochs.set(userId, epoch(userId) + 1)
    return epoch(userId)
  }
  async function open() {
    if (!opened) opened = new Promise((resolve, reject) => {
      const factory = getFactory()
      if (!factory) { reject(new Error('Device draft storage is unavailable.')); return }
      const request = factory.open('closure-private-drafts', 1)
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('drafts', { keyPath: 'key' })
        store.createIndex('userId', 'userId')
      }
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); opened = null }; resolve(request.result) }
      request.onerror = () => reject(new Error('Device draft storage is unavailable.'))
      request.onblocked = () => reject(new Error('Close another Closure tab to use device drafts.'))
    }).catch(error => { opened = null; throw error })
    return opened
  }
  function key(userId, entryKey) { return JSON.stringify([userId, entryKey]) }
  async function transact(mode, action) {
    const db = await open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', mode)
      let result
      try { result = action(transaction.objectStore('drafts')) } catch (error) { transaction.abort(); reject(error); return }
      transaction.oncomplete = () => resolve(result?.result)
      transaction.onerror = transaction.onabort = () => reject(new Error('Device draft storage could not finish.'))
    })
  }
  return {
    begin, epoch,
    revision: (userId, entryKey) => revisions.get(key(userId, entryKey)) || 0,
    async put(userId, entryKey, values, token = epoch(userId), savedAt = null, updatedAt = Date.now(), revision = revisions.get(key(userId, entryKey)) || 0) {
      if (!userId || !entryKey || blocked.has(userId) || token !== epoch(userId)) return false
      // Check once more after opening: logout may have invalidated this writer.
      await open()
      if (blocked.has(userId) || token !== epoch(userId) || revision !== (revisions.get(key(userId, entryKey)) || 0)) return false
      let written = false
      await transact('readwrite', store => {
        if (blocked.has(userId) || token !== epoch(userId) || revision !== (revisions.get(key(userId, entryKey)) || 0)) return
        written = true
        return store.put({ key: key(userId, entryKey), userId, entryKey, values: structuredClone(values), updatedAt, savedAt })
      })
      return written
    },
    async get(userId, entryKey) { return await transact('readonly', store => store.get(key(userId, entryKey))) || null },
    async list(userId) { return (await transact('readonly', store => store.index('userId').getAll(userId))).sort((a, b) => b.updatedAt - a.updatedAt) },
    async remove(userId, entryKey) { revisions.set(key(userId, entryKey), (revisions.get(key(userId, entryKey)) || 0) + 1); await transact('readwrite', store => store.delete(key(userId, entryKey))) },
    async clearUser(userId) {
      blocked.add(userId); epochs.set(userId, epoch(userId) + 1)
      await transact('readwrite', store => {
        const request = store.index('userId').openCursor(userId)
        request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue() } }
      })
    },
  }
}
export function isNewerDraft(draft, savedAt, currentValues) {
  if (!draft || JSON.stringify(draft.values) === JSON.stringify(currentValues)) return false
  const serverTime = Date.parse(savedAt || '')
  return !Number.isFinite(serverTime) || draft.updatedAt > serverTime
}
export const drafts = createDraftStorage()

```

### src/utils/journalRequests.js

```javascript
import { withRequestTimeout } from './requestTimeout.js'

export function validateJournalEntry({ content, entryType }) {
  if (!content.trim()) return 'Please write something before saving.'

  if (!['journal', 'unsent_letter'].includes(entryType)) {
    return 'Please choose Journal entry or Unsent letter.'
  }

  return ''
}

export function createJournalService(client, { timeoutMs = 15000 } = {}) {
  const fields = 'id, title, content, entry_type, created_at, updated_at'

  return {
    async getJournalEntries(userId, { page = 1, entryType = 'all', signal } = {}) {
      const pageSize = 20
      const offset = (page - 1) * pageSize
      let query = client
        .from('journal_entries')
        .select('id, title, entry_type, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize)

      if (entryType !== 'all') query = query.eq('entry_type', entryType)
      if (signal) query = query.abortSignal(signal)

      const { data, error } = await query
      if (error) throw error

      return {
        entries: data.slice(0, pageSize),
        hasMore: data.length > pageSize,
      }
    },

    async getJournalEntry(userId, entryId, signal) {
      let query = client
        .from('journal_entries')
        .select(fields)
        .eq('user_id', userId)
        .eq('id', entryId)

      if (signal) query = query.abortSignal(signal)

      const { data, error } = await query.maybeSingle()
      if (error) throw error

      return data
    },

    async saveJournalEntry({ userId, entryId, title, content, entryType, signal }) {
      const validationError = validateJournalEntry({ content, entryType })
      if (validationError) throw new Error(validationError)

      const entry = {
        title: title.trim(),
        content,
        entry_type: entryType,
      }

      let query

      if (entryId) {
        query = client
          .from('journal_entries')
          .update(entry)
          .eq('user_id', userId)
          .eq('id', entryId)
      } else {
        query = client
          .from('journal_entries')
          .insert({ ...entry, user_id: userId })
      }

      const { data, error } = await withRequestTimeout(requestSignal => query.select(fields).abortSignal(requestSignal).single(), { signal, timeoutMs })
      if (error) throw error

      return data
    },

    async deleteJournalEntry(userId, entryId, signal) {
      const { data, error } = await withRequestTimeout(requestSignal => client
        .from('journal_entries')
        .delete()
        .eq('user_id', userId)
        .eq('id', entryId)
        .select('id')
        .abortSignal(requestSignal)
        .single(), { signal, timeoutMs })

      if (error) throw error

      return data
    },
  }
}

```

