-- Closure privacy checks. Run the ENTIRE file in Closure's Supabase SQL Editor.
-- Run after all migrations in SCHEMA-SETUP.md.
-- Requires at least two existing accounts. Uses the two oldest accounts.
-- All fixtures and attempted edits/deletes are rolled back at the end.
-- No passwords, access tokens, or personal writing are printed.

begin;

create temporary table closure_privacy_results (
  check_name text not null,
  result text not null
) on commit drop;

grant insert, select on closure_privacy_results to authenticated;

do $$
declare
  account_ids uuid[];
  fixture_date date;
  journal_a uuid := gen_random_uuid();
  journal_b uuid := gen_random_uuid();
begin
  select array_agg(id)
  into account_ids
  from (
    select id
    from auth.users
    order by created_at, id
    limit 2
  ) accounts;

  if coalesce(cardinality(account_ids), 0) < 2 then
    raise exception 'Two accounts are needed. Create a second test account, then run this whole script again.';
  end if;

  -- Ensure both accounts have profiles, without replacing any existing choices.
  insert into public.profiles (id, preferred_name, goals, timezone)
  values
    (account_ids[1], 'Privacy test A', array['find_peace'], 'UTC'),
    (account_ids[2], 'Privacy test B', array['find_peace'], 'UTC')
  on conflict (id) do nothing;

  -- Choose an unused historical date for disposable check-in fixtures.
  select candidate::date
  into fixture_date
  from generate_series(
    '1800-01-01'::date,
    '1800-12-31'::date,
    interval '1 day'
  ) candidate
  where not exists (
    select 1 from public.check_ins
    where user_id = any(account_ids)
      and check_in_date = candidate::date
  )
  limit 1;

  if fixture_date is null then
    raise exception 'Could not choose an unused fixture date. No changes have been committed.';
  end if;

  insert into public.check_ins (user_id, check_in_date, moods, note)
  values
    (account_ids[1], fixture_date, array['hopeful'], 'Disposable privacy test A'),
    (account_ids[2], fixture_date, array['hopeful'], 'Disposable privacy test B');

  insert into public.journal_entries (id, user_id, title, content, entry_type)
  values
    (journal_a, account_ids[1], 'Privacy test A', 'Disposable test words.', 'journal'),
    (journal_b, account_ids[2], 'Privacy test B', 'Disposable unsent letter.', 'unsent_letter');

  insert into public.stories (user_id, what_happened)
  values
    (account_ids[1], 'Disposable story test A'),
    (account_ids[2], 'Disposable story test B')
  on conflict (user_id) do nothing;

  perform set_config('closure_test.account_a', account_ids[1]::text, true);
  perform set_config('closure_test.account_b', account_ids[2]::text, true);
  perform set_config('closure_test.journal_a', journal_a::text, true);
  perform set_config('closure_test.journal_b', journal_b::text, true);
  perform set_config('closure_test.fixture_date', fixture_date::text, true);
end;
$$;

-- This role switch is essential: the SQL Editor's normal administrator role
-- bypasses RLS and cannot be used to demonstrate a user's privacy restrictions.
set local role authenticated;

do $$
declare
  account_a uuid := current_setting('closure_test.account_a')::uuid;
  account_b uuid := current_setting('closure_test.account_b')::uuid;
  journal_a uuid := current_setting('closure_test.journal_a')::uuid;
  journal_b uuid := current_setting('closure_test.journal_b')::uuid;
  fixture_date date := current_setting('closure_test.fixture_date')::date;
  own_account uuid;
  other_account uuid;
  own_journal uuid;
  other_journal uuid;
  acting_as text;
  target record;
  mutation text;
  affected bigint;
  direction integer;
  attempt_sql text;
  changed_at timestamptz;
begin
  for direction in 1..2 loop
    own_account := case when direction = 1 then account_a else account_b end;
    other_account := case when direction = 1 then account_b else account_a end;
    own_journal := case when direction = 1 then journal_a else journal_b end;
    other_journal := case when direction = 1 then journal_b else journal_a end;
    acting_as := case when direction = 1 then 'Account A' else 'Account B' end;

    perform set_config('request.jwt.claim.sub', own_account::text, true);
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', own_account::text, 'role', 'authenticated')::text,
      true
    );

    if auth.uid() is distinct from own_account then
      raise exception 'Test identity setup failed. No privacy result can be trusted.';
    end if;

    for target in
      select * from (values
        (
          'profiles',
          'preferred_name',
          format('id = %L', own_account),
          format('id = %L', other_account)
        ),
        (
          'check_ins',
          'note',
          format('user_id = %L and check_in_date = %L', own_account, fixture_date),
          format('user_id = %L and check_in_date = %L', other_account, fixture_date)
        ),
        (
          'journal_entries',
          'title',
          format('id = %L', own_journal),
          format('id = %L', other_journal)
        )
        , (
          'stories',
          'what_happened',
          format('user_id = %L', own_account),
          format('user_id = %L', other_account)
        )
      ) as targets(table_name, edit_column, own_filter, other_filter)
    loop
      -- Positive checks ensure privacy does not merely block everybody.
      execute format('select count(*) from public.%I where %s', target.table_name, target.own_filter)
        into affected;
      if affected <> 1 then
        raise exception 'FAIL: % cannot read its own % fixture.', acting_as, target.table_name;
      end if;
      insert into closure_privacy_results values (acting_as || ': read own ' || target.table_name, 'PASS');

      execute format(
        'update public.%I set %I = %I where %s',
        target.table_name, target.edit_column, target.edit_column, target.own_filter
      );
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'FAIL: % cannot update its own % fixture.', acting_as, target.table_name;
      end if;
      insert into closure_privacy_results values (acting_as || ': update own ' || target.table_name, 'PASS');

      execute format('select updated_at from public.%I where %s', target.table_name, target.own_filter) into changed_at;
      if changed_at is null or changed_at < transaction_timestamp() then
        raise exception 'FAIL: updated_at did not refresh for %.', target.table_name;
      end if;
      insert into closure_privacy_results values (acting_as || ': timestamp own ' || target.table_name, 'PASS');

      -- Test owner DELETE, then roll back only that operation so both
      -- accounts can still exercise the same fixtures in the other direction.
      begin
        execute format('delete from public.%I where %s', target.table_name, target.own_filter);
        get diagnostics affected = row_count;
        if affected <> 1 then raise exception 'FAIL: owner cannot delete %.', target.table_name; end if;
        raise exception using errcode = 'ZC001', message = 'Rollback disposable owner delete';
      exception when sqlstate 'ZC001' then
        null;
      end;
      insert into closure_privacy_results values (acting_as || ': delete own ' || target.table_name, 'PASS');

      -- Moving an owned row to another account must fail WITH CHECK.
      begin
        execute format('update public.%I set %I = %L where %s', target.table_name,
          case when target.table_name = 'profiles' then 'id' else 'user_id' end,
          other_account, target.own_filter);
        raise exception 'PRIVACY FAIL: owner transfer allowed for %.', target.table_name;
      exception when insufficient_privilege then
        insert into closure_privacy_results values (acting_as || ': block owner transfer ' || target.table_name, 'PASS');
      end;

      execute format('select count(*) from public.%I where %s', target.table_name, target.other_filter)
        into affected;
      if affected <> 0 then
        raise exception 'PRIVACY FAIL: % can read another account''s %.', acting_as, target.table_name;
      end if;
      insert into closure_privacy_results values (acting_as || ': block reading other ' || target.table_name, 'PASS');

      foreach mutation in array array[
        format('update public.%I set %I = %L where %s', target.table_name, target.edit_column, 'ROLLBACK PRIVACY TEST', target.other_filter),
        format('delete from public.%I where %s', target.table_name, target.other_filter)
      ] loop
        begin
          execute mutation;
          get diagnostics affected = row_count;
        exception when insufficient_privilege then
          affected := 0;
        end;

        if affected <> 0 then
          raise exception 'PRIVACY FAIL: % can change another account''s %. The transaction will not commit.', acting_as, target.table_name;
        end if;

        insert into closure_privacy_results values (
          acting_as || ': block ' || split_part(mutation, ' ', 1) || ' other ' || target.table_name,
          'PASS'
        );
      end loop;
    end loop;

    -- The four upsert shapes match the app; keep existing private values intact.
    insert into public.profiles (id, preferred_name, goals, timezone, onboarding_complete)
      values (own_account, 'Privacy test', array['find_peace'], 'UTC', true)
      on conflict (id) do update set preferred_name = profiles.preferred_name;
    insert into public.check_ins (user_id, check_in_date, moods, note)
      values (own_account, fixture_date, array['hopeful'], '')
      on conflict (user_id, check_in_date) do update set note = check_ins.note;
    insert into public.journal_entries (id, user_id, title, content, entry_type)
      values (own_journal, own_account, '', 'Disposable test words.', 'journal')
      on conflict (id) do update set title = journal_entries.title;
    insert into public.stories (user_id) values (own_account)
      on conflict (user_id) do update set what_happened = stories.what_happened;
    insert into closure_privacy_results values (acting_as || ': owner upserts on all four tables', 'PASS');

    foreach attempt_sql in array array[
      format('insert into public.profiles (id) values (%L)', other_account),
      format('insert into public.check_ins (user_id, check_in_date) values (%L, %L)', other_account, fixture_date),
      format('insert into public.journal_entries (user_id) values (%L)', other_account),
      format('insert into public.stories (user_id) values (%L)', other_account)
    ] loop
      begin
        execute attempt_sql;
        raise exception 'PRIVACY FAIL: inserting for another account was allowed.';
      exception when insufficient_privilege then
        insert into closure_privacy_results values (
          acting_as || ': block forged insert ' || split_part(attempt_sql, ' ', 3), 'PASS');
      end;
    end loop;
  end loop;
end;
$$;

-- Each reflection kind supports owner CRUD and rejects cross-account operations.
do $$
declare
  owner_id uuid := current_setting('closure_test.account_a')::uuid;
  other_id uuid := current_setting('closure_test.account_b')::uuid;
  reflection_id uuid;
  reflection_kind text;
  affected integer;
begin
  foreach reflection_kind in array array['lesson', 'my_part', 'next_time', 'reality_check', 'reason'] loop
    perform set_config('request.jwt.claim.sub', owner_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', owner_id)::text, true);
    insert into public.reflections(user_id, kind, content) values(owner_id, reflection_kind, 'Disposable reflection') returning id into reflection_id;
    update public.reflections set content = 'Owner edit' where id = reflection_id;
    if not exists(select 1 from public.reflections where id = reflection_id and content = 'Owner edit') then raise exception 'Reflection owner CRUD failed'; end if;
    begin
      update public.reflections set user_id = other_id where id = reflection_id;
      raise exception 'Reflection ownership transfer allowed';
    exception when insufficient_privilege then null;
    end;
    perform set_config('request.jwt.claim.sub', other_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', other_id)::text, true);
    if exists(select 1 from public.reflections where id = reflection_id) then raise exception 'Reflection visible to stranger'; end if;
    update public.reflections set content = 'Forbidden' where id = reflection_id;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Reflection stranger update allowed'; end if;
    delete from public.reflections where id = reflection_id;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Reflection stranger delete allowed'; end if;
    begin
      insert into public.reflections(user_id, kind, content) values(owner_id, reflection_kind, 'Forbidden');
      raise exception 'Reflection forged insert allowed';
    exception when insufficient_privilege then null;
    end;
    perform set_config('request.jwt.claim.sub', owner_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', owner_id)::text, true);
    delete from public.reflections where id = reflection_id;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Reflection owner delete failed'; end if;
    insert into closure_privacy_results values ('Reflections: ' || reflection_kind || ' owner CRUD and isolation', 'PASS');
  end loop;
end;
$$;

reset role;
set local role anon;
do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles', 'check_ins', 'journal_entries', 'stories', 'reflections'] loop
    begin
      execute format('select 1 from public.%I limit 1', table_name);
      raise exception 'PRIVACY FAIL: anonymous table access was granted for %.', table_name;
    exception when insufficient_privilege then
      null;
    end;
  end loop;
end;
$$;
reset role;
insert into closure_privacy_results values ('Anonymous: base tables and reflections denied', 'PASS');

select check_name, result
from closure_privacy_results
order by check_name;

-- Never replace this with COMMIT. Nothing from this test should persist.
rollback;
