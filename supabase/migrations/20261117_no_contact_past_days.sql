-- Run this whole file after the activity migration. Safe to rerun.
begin;

-- Direct inserts remain restricted to today by the existing RLS policy.
-- This narrow function alone permits explicit historical confirmations.
create or replace function public.confirm_no_contact_dates(confirmed_dates date[])
returns date[] language plpgsql security definer set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  local_day date := public.closure_local_day();
  saved_dates date[];
begin
  if owner_id is null then
    raise exception 'Sign in is required.' using errcode = '42501';
  end if;
  if confirmed_dates is null or cardinality(confirmed_dates) not between 1 and 366 then
    raise exception 'Choose between 1 and 366 dates.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(confirmed_dates) d where d is null or not isfinite(d) or d > local_day or d < date '0001-01-01') then
    raise exception 'Choose valid dates up to today.' using errcode = '22023';
  end if;
  select array_agg(d order by d) into saved_dates from (select distinct unnest(confirmed_dates) d) chosen;
  insert into public.no_contact_days (user_id, activity_date)
    select owner_id, d from unnest(saved_dates) d
    on conflict (user_id, activity_date) do nothing;
  return saved_dates;
end;
$$;
revoke all on function public.confirm_no_contact_dates(date[]) from public, anon;
grant execute on function public.confirm_no_contact_dates(date[]) to authenticated;
commit;
