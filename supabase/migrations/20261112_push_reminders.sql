-- Run after the existing activity migration. No reminders are enabled by default.
begin;
create table public.push_reminders (
  endpoint text primary key check (length(endpoint) < 2048 and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  reminder_time time not null default '19:00',
  last_sent_date date,
  check (coalesce(subscription->>'endpoint' = endpoint, false) and subscription->'keys'->>'auth' is not null and subscription->'keys'->>'p256dh' is not null)
);
create index push_reminders_owner on public.push_reminders(user_id);
alter table public.push_reminders enable row level security;
revoke all on public.push_reminders from public, anon, authenticated;
grant select, delete on public.push_reminders to authenticated;
grant insert (endpoint, user_id, subscription, reminder_time), update (endpoint, user_id, subscription, reminder_time) on public.push_reminders to authenticated;
create policy "Own reminder devices" on public.push_reminders for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Only the server may claim deliveries. Atomic claims prevent overlapping jobs
-- from repeatedly sending the same device a reminder on the same local date.
create or replace function public.claim_due_reminders()
returns table(endpoint text, subscription jsonb, ttl integer)
language sql security definer set search_path = '' as $$
  with due as (
    select r.endpoint, (now() at time zone p.timezone)::date as local_day,
      greatest(1, least(3600, extract(epoch from (
        (((now() at time zone p.timezone)::date + 1)::timestamp at time zone p.timezone) - now()
      ))::integer)) as ttl
    from public.push_reminders r
    join public.profiles p on p.id = r.user_id
    join pg_catalog.pg_timezone_names tz on tz.name = p.timezone
    where p.onboarding_complete = true
      and (now() at time zone p.timezone)::time >= r.reminder_time
      and r.last_sent_date is distinct from (now() at time zone p.timezone)::date
      and not exists (select 1 from public.app_visits v where v.user_id = r.user_id
        and v.activity_date = (now() at time zone p.timezone)::date)
    order by r.endpoint limit 50 for update of r skip locked
  ), claimed as (
    update public.push_reminders r set last_sent_date = due.local_day
    from due where r.endpoint = due.endpoint
    returning r.endpoint, r.subscription, due.ttl
  ) select * from claimed;
$$;
revoke all on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;
grant all on public.push_reminders to service_role;
commit;
