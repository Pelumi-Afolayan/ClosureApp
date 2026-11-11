-- Run this WHOLE file in Closure's Supabase SQL Editor.
-- Adds separate app-visit and manually confirmed no-contact histories.
-- Existing moods, journals, stories and profiles are not changed.
begin;

create table if not exists public.app_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  recorded_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create table if not exists public.no_contact_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  recorded_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create or replace function public.closure_local_day()
returns date language sql stable security invoker set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select nullif(p.timezone, '') from public.profiles p where p.id = auth.uid()),
    'UTC'
  ))::date;
$$;

alter table public.app_visits enable row level security;
alter table public.no_contact_days enable row level security;
revoke all on public.app_visits, public.no_contact_days from public, anon, authenticated;
grant select, insert on public.app_visits, public.no_contact_days to authenticated;

drop policy if exists "Read own app visits" on public.app_visits;
create policy "Read own app visits" on public.app_visits for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Record own app visit today" on public.app_visits;
create policy "Record own app visit today" on public.app_visits for insert to authenticated
  with check ((select auth.uid()) = user_id and activity_date = (select public.closure_local_day()));

drop policy if exists "Read own no contact days" on public.no_contact_days;
create policy "Read own no contact days" on public.no_contact_days for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Confirm own no contact today" on public.no_contact_days;
create policy "Confirm own no contact today" on public.no_contact_days for insert to authenticated
  with check ((select auth.uid()) = user_id and activity_date = (select public.closure_local_day()));

create or replace function public.record_app_visit()
returns date language plpgsql security invoker set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  local_day date := public.closure_local_day();
begin
  if owner_id is null then raise exception 'Sign in is required.' using errcode = '42501'; end if;
  insert into public.app_visits (user_id, activity_date) values (owner_id, local_day)
  on conflict (user_id, activity_date) do nothing;
  return local_day;
end;
$$;

create or replace function public.confirm_no_contact()
returns date language plpgsql security invoker set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  local_day date := public.closure_local_day();
begin
  if owner_id is null then raise exception 'Sign in is required.' using errcode = '42501'; end if;
  insert into public.no_contact_days (user_id, activity_date) values (owner_id, local_day)
  on conflict (user_id, activity_date) do nothing;
  return local_day;
end;
$$;

revoke all on function public.closure_local_day() from public, anon;
revoke all on function public.record_app_visit() from public, anon;
revoke all on function public.confirm_no_contact() from public, anon;
grant execute on function public.closure_local_day() to authenticated;
grant execute on function public.record_app_visit() to authenticated;
grant execute on function public.confirm_no_contact() to authenticated;

commit;
