# Closure manual QA checklist

Date/build/browser/device: ____________________

Status: local automated tests run separately. Every unchecked item below still needs manual verification; this file does not report a phone/Lighthouse/live Supabase pass.

## Setup and authentication
- [ ] Fresh project: run all migrations in README order, configure Auth redirects and Google provider, deploy both Edge Functions and cron separately.
- [ ] Missing VITE variables show the setup screen without exposing values; malformed URL is handled.
- [ ] Signup, confirmation email, email/password login, Google login, recovery link and password update work on the intended origin.
- [ ] Incomplete onboarding hides app navigation; multi-select goals and name save correctly.
- [ ] Settings celebration opt-out survives reload; other devices pick it up after a profile reload.
- [ ] Logout clears this account’s device drafts and reminder subscription before leaving; fallback logout paths behave consistently.
- [ ] Unknown signed-in and signed-out routes show a friendly 404; a forced render error shows the safe route error screen.

## Writing and reflection
- [ ] New journal/letter defaults, optional prompts, type selection and title work; no prompt is forced into content.
- [ ] Save opens read mode; saved entries require Edit; Cancel and navigation use the existing dirty-form protection.
- [ ] Edit, delete and release operate only on the current account’s entry. Release animation honours reduced motion; failure keeps the visible writing and explains an unconfirmed outcome.
- [ ] Journal, letter, My Story, reflection/reason and journal-to-reflection drafts survive refresh after autosave; Restore and Discard behave as labelled.
- [ ] Pagehide, immediate navigation, slow IndexedDB, quota/blocked storage, cancelled navigation and successful save do not overwrite a newer draft or re-create a discarded draft.
- [ ] Drafts never appear to a second signed-in account; explicit logout/delete removes them locally. Check other open tabs too.
- [ ] My Story read/edit/save works with blank optional answers and long text.
- [ ] All six reflection kinds support owner-only create/read/edit/delete; Looking forward to appears only in What I’m learning, reasons remain in No Contact.
- [ ] Mood history 7/30/90 days handles empty/sparse/full data, neutral gaps, read-only notes, timezone boundaries and comparisons without grading the user.

## No contact, support and optional features
- [ ] App visits count opening the signed-in app; mood saves do not control either streak.
- [ ] No-contact dates change only after manual confirmation; duplicates do not add credit.
- [ ] A genuine milestone opens once when celebrations are on; off prevents automatic popups but preserves days/manual viewing. Re-enabling does not replay a prior confirmation.
- [ ] “If you slipped” opens Support and the urge tool without resetting anything.
- [ ] Urge flow’s timestamp timer survives a sleep/return within the mounted session; skip is optional after two minutes; no history is recorded. Reasons/reality items, unsent-letter link and friend-copy action work.
- [ ] Support is reachable on signed-in desktop/mobile screens; breathing works with reduced motion/offline; only explicitly verified resources appear plus the generic fallback.
- [ ] Small steps are deterministic for account/date/goals, can be dismissed and cause no network writes or streak changes.
- [ ] Closing is opened only from Settings. Re-read story, review lessons, save a titled JOURNAL entry to past self, then keep/export/delete choices. Cancelling does not set completion flags. Deletion still needs typed DELETE plus permanent confirmation.

## Privacy and data ownership
- [ ] Welcome and Settings privacy links work; wording matches actual storage/admin access and no end-to-end encryption claim.
- [ ] Markdown/JSON export includes all rows, Unicode/line breaks, six reflection kinds, preference and activity dates; filenames contain date, not a name; no tokens/push keys are exported.
- [ ] Disposable account deletion rejects incomplete confirmation, forged/missing JWT and body-supplied IDs. Real disposable deletion removes Auth plus all eight owner tables; an unrelated test account remains intact.
- [ ] Run all `supabase/tests/*.sql` on a separate test project, after all migrations. Record each result below, preserve ROLLBACK, never substitute real user IDs in the deletion test.
  - privacy.sql: ____________________
  - activity_privacy.sql: ____________________
  - reminders.sql: ____________________
  - account_deletion.sql: ____________________

## PWA and design
- [ ] Follow every desktop/phone step in PWA-VERIFICATION.md. Check cache contents manually: public files only, no navigation/private API responses.
- [ ] Installed offline launch works after first successful online setup; support/local drafts work; saved account data is not available offline.
- [ ] Offline save controls are disabled with a reason. Reconnection enables manual Save; nothing syncs automatically.
- [ ] Update notice never auto-reloads during writing; refresh is explicit and unsaved protection remains.
- [ ] Android install prompt, iOS instructions, maskable safe areas, shortcuts and task-switcher theme colours work on real devices.
- [ ] System/Light/Dark survives reload without a wrong-theme flash; every screen/dialog/input is readable in both themes.
- [ ] Inspect scenic hero at 320/540/800/1100+ widths, 200% zoom and long quotes; no fixed minimum-height conflict or clipped text.
- [ ] Test textarea auto-grow in a browser without field-sizing support; no resize handle, lost text or toolbar overlap.
- [ ] Keyboard, focus order, labels, dialog focus/Escape, reduced motion and screen-reader status notices are usable.
- [ ] Record Lighthouse Mobile reports (Performance/Accessibility/Best Practices/SEO) and issues without presenting unrun scores as passes.
- [ ] Test real scheduled push, revoked permission, late registration, logout and account switching. All notification text remains generic.
