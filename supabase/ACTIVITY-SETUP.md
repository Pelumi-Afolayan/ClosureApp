# Independent activity streaks

## Set up Supabase

1. Open the Closure Supabase project, then SQL Editor → New query.
2. Copy and run the entire `supabase/migrations/20261111_activity_streaks.sql` file.
3. If two test accounts exist, run the entire `supabase/tests/activity_privacy.sql` file. This rolls back its changes.
4. Refresh Closure after setup. Before setup, the trackers will display a retryable error; mood saving and writing still work.

## Behaviour

- Opening any signed-in page after onboarding records an app visit, once per local date.
- Visits are also recorded when a visible app crosses midnight or returns to the foreground on a new day.
- Hidden/background tabs do not generate days by themselves.
- Internet access is required to record a day; offline days are not backfilled.
- No-contact records are added only by the explicit confirmation button. Merely visiting its page does not add a day.
- Missing a confirmed date leaves a gap. Yesterday's streak remains available to continue during today.
- The database chooses the date from server time and the signed-in user's saved profile timezone.
- Duplicate confirmations, multiple tabs, and multiple devices share one record per date.
- Each owner can read only their own history. Clients cannot backdate, future-date, update, or delete days.
- Existing mood check-ins are unchanged. Old mood dates are NOT copied into app visits or no-contact history.

## Manual verification

- Sign in and open Journal directly: Today's app visit should be recorded without a mood save.
- Refresh several times: the app streak should not grow again that day.
- Open No contact: no day should be confirmed yet. Confirm once, then reload: it should remain one day.
- Confirm from two tabs/devices: still one record for the date.
- Save or update a mood: neither streak should receive an extra day.
- Check the two independent progress dialogs and the mobile navigation at 360px.
- Verify that navigating from an unsaved story or journal to No contact still offers Keep writing / Discard and leave.

Local tests and build can verify the code, but database policies require running the SQL check in Supabase.
