-- Run after 20261111_activity_streaks.sql. Requires two existing accounts.
-- All test records and operations are rolled back. No private writing is read.
begin;

create temporary table closure_tracker_accounts (account_a uuid, account_b uuid) on commit drop;
insert into closure_tracker_accounts
select ids[1], ids[2]
from (select array_agg(id) ids from (select id from auth.users order by created_at, id limit 2) users) accounts;

do $$
begin
  if (select account_b is null from closure_tracker_accounts) then
    raise exception 'Create a second test account, then run this entire script again.';
  end if;
end;
$$;

grant select on closure_tracker_accounts to authenticated;

-- A foreign owner's historical fixture ensures hidden rows actually exist.
do $$
declare
  other_id uuid := (select account_b from closure_tracker_accounts);
  fixture_date date;
begin
  select day::date into fixture_date
  from generate_series(date '1901-01-01', date '1902-01-01', interval '1 day') day
  where not exists (select 1 from public.app_visits where activity_date = day::date)
    and not exists (select 1 from public.no_contact_days where activity_date = day::date)
  limit 1;
  if fixture_date is null then raise exception 'No unused fixture date was found.'; end if;
  insert into public.app_visits (user_id, activity_date) values (other_id, fixture_date);
  insert into public.no_contact_days (user_id, activity_date) values (other_id, fixture_date);
end;
$$;

select set_config('request.jwt.claims', json_build_object(
  'sub', (select account_a from closure_tracker_accounts), 'role', 'authenticated'
)::text, true);
set local role authenticated;

do $$
declare
  owner_id uuid := auth.uid();
  other_id uuid := (select account_b from closure_tracker_accounts);
  local_day date := public.closure_local_day();
  tracker_table text;
  row_count integer;
  returned_day date;
begin
  -- Both RPCs are repeatable without adding another row for the same date.
  returned_day := public.record_app_visit();
  if returned_day <> local_day then raise exception 'App visit used an unexpected date.'; end if;
  perform public.record_app_visit();
  returned_day := public.confirm_no_contact();
  if returned_day <> local_day then raise exception 'No-contact confirmation used an unexpected date.'; end if;
  perform public.confirm_no_contact();

  foreach tracker_table in array array['app_visits', 'no_contact_days'] loop
    execute format('select count(*) from public.%I where user_id = $1 and activity_date = $2', tracker_table)
      into row_count using owner_id, local_day;
    if row_count <> 1 then raise exception 'Duplicate/own-read test failed for %.', tracker_table; end if;

    execute format('select count(*) from public.%I where user_id = $1', tracker_table)
      into row_count using other_id;
    if row_count <> 0 then raise exception 'Foreign history was visible for %.', tracker_table; end if;

    begin
      execute format('insert into public.%I (user_id, activity_date) values ($1, $2)', tracker_table)
        using other_id, local_day;
      raise exception 'Foreign insert was allowed for %.', tracker_table;
    exception when insufficient_privilege then null;
    end;

    begin
      execute format('insert into public.%I (user_id, activity_date) values ($1, $2)', tracker_table)
        using owner_id, local_day - 1;
      raise exception 'Backdated insert was allowed for %.', tracker_table;
    exception when insufficient_privilege then null;
    end;

    begin
      execute format('insert into public.%I (user_id, activity_date) values ($1, $2)', tracker_table)
        using owner_id, local_day + 1;
      raise exception 'Future insert was allowed for %.', tracker_table;
    exception when insufficient_privilege then null;
    end;

    begin
      execute format('update public.%I set activity_date = activity_date where user_id = $1', tracker_table) using other_id;
      raise exception 'Update privilege was available for %.', tracker_table;
    exception when insufficient_privilege then null;
    end;

    begin
      execute format('delete from public.%I where user_id = $1', tracker_table) using other_id;
      raise exception 'Delete privilege was available for %.', tracker_table;
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;

reset role;
set local role anon;

do $$
begin
  begin
    perform public.record_app_visit();
    raise exception 'Anonymous app recording was allowed.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.confirm_no_contact();
    raise exception 'Anonymous no-contact recording was allowed.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.app_visits;
    raise exception 'Anonymous app history read was allowed.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.no_contact_days;
    raise exception 'Anonymous no-contact history read was allowed.';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select 'PASS: owner isolation, same-day deduplication, date restrictions, and anonymous access checks' as result;
rollback;
