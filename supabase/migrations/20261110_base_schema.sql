-- Closure's base schema. Run the WHOLE file before the activity migration.
-- Transactional and rerunnable: no records are rewritten or deleted.
-- An incompatible existing column/key or invalid data aborts the transaction.
begin;
set local lock_timeout = '5s';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text not null default '',
  goals text[] not null default '{}',
  timezone text not null default 'UTC',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_in_date date not null,
  moods text[] not null default '{}',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_ins_user_id_check_in_date_key unique (user_id, check_in_date)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  entry_type text not null default 'journal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint closure_entry_type_check check (entry_type in ('journal', 'unsent_letter'))
);

create table if not exists public.stories (
  user_id uuid primary key references auth.users(id) on delete cascade,
  what_happened text not null default '',
  what_hurt text not null default '',
  what_i_need text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing installations may lack timestamps. Only newly added timestamp
-- columns receive migration-time values; existing timestamp values stay intact.
do $$
declare
  table_name text;
  expected record;
  actual_type oid;
begin
  foreach table_name in array array['profiles', 'check_ins', 'journal_entries', 'stories'] loop
    execute format('alter table public.%I add column if not exists created_at timestamptz not null default now()', table_name);
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', table_name);
  end loop;

  -- Do not silently cast live data or invent a missing owner/content column.
  for expected in
    select * from (values
      ('profiles', 'id', 'uuid'),
      ('profiles', 'preferred_name', 'text'),
      ('profiles', 'goals', 'text[]'),
      ('profiles', 'timezone', 'text'),
      ('profiles', 'onboarding_complete', 'boolean'),
      ('check_ins', 'id', 'uuid'),
      ('check_ins', 'user_id', 'uuid'),
      ('check_ins', 'check_in_date', 'date'),
      ('check_ins', 'moods', 'text[]'),
      ('check_ins', 'note', 'text'),
      ('journal_entries', 'id', 'uuid'),
      ('journal_entries', 'user_id', 'uuid'),
      ('journal_entries', 'title', 'text'),
      ('journal_entries', 'content', 'text'),
      ('journal_entries', 'entry_type', 'text'),
      ('stories', 'user_id', 'uuid'),
      ('stories', 'what_happened', 'text'),
      ('stories', 'what_hurt', 'text'),
      ('stories', 'what_i_need', 'text')
    ) as columns(table_name, column_name, type_name)
    union all
    select name, stamp, 'timestamp with time zone'
    from unnest(array['profiles', 'check_ins', 'journal_entries', 'stories']) name
    cross join unnest(array['created_at', 'updated_at']) stamp
  loop
    select a.atttypid into actual_type from pg_catalog.pg_attribute a
    where a.attrelid = format('public.%I', expected.table_name)::regclass
      and a.attname = expected.column_name and not a.attisdropped;
    if actual_type is null or not (
      actual_type = expected.type_name::regtype
      or (expected.type_name = 'text' and actual_type = 'character varying'::regtype)
    ) then
      raise exception 'Schema mismatch: %.% must be %. No data was changed.', expected.table_name, expected.column_name, expected.type_name;
    end if;
  end loop;
end;
$$;

-- Repair omitted defaults without replacing existing field values.
alter table public.profiles alter column preferred_name set default '', alter column goals set default '{}',
  alter column timezone set default 'UTC', alter column onboarding_complete set default false;
alter table public.check_ins alter column id set default gen_random_uuid(), alter column moods set default '{}', alter column note set default '';
alter table public.journal_entries alter column id set default gen_random_uuid(), alter column title set default '',
  alter column content set default '', alter column entry_type set default 'journal';
alter table public.stories alter column what_happened set default '', alter column what_hurt set default '', alter column what_i_need set default '';

do $$
declare
  target record;
  column_name text;
  key_columns smallint[];
  owner_column smallint;
  auth_id_column smallint;
  existing_fk record;
  invalid_rows boolean;
begin
  select attnum into auth_id_column from pg_catalog.pg_attribute where attrelid = 'auth.users'::regclass and attname = 'id';
  for target in
    select * from (values
      ('profiles', 'id', array['id'], array['id', 'preferred_name', 'goals', 'timezone', 'onboarding_complete']),
      ('check_ins', 'user_id', array['id'], array['id', 'user_id', 'check_in_date', 'moods', 'note']),
      ('journal_entries', 'user_id', array['id'], array['id', 'user_id', 'title', 'content', 'entry_type']),
      ('stories', 'user_id', array['user_id'], array['user_id', 'what_happened', 'what_hurt', 'what_i_need'])
    ) as tables(table_name, owner_column, primary_columns, required_columns)
  loop
    foreach column_name in array target.required_columns || array['created_at', 'updated_at'] loop
      execute format('select exists(select 1 from public.%I where %I is null)', target.table_name, column_name) into invalid_rows;
      if invalid_rows then
        raise exception 'Schema mismatch: %.% contains NULLs. No data was changed.', target.table_name, column_name;
      end if;
      execute format('alter table public.%I alter column %I set not null', target.table_name, column_name);
    end loop;
    execute format('alter table public.%I alter column created_at set default now(), alter column updated_at set default now()', target.table_name);
    select array_agg(a.attnum order by ord.position) into key_columns
    from unnest(target.primary_columns) with ordinality as ord(name, position)
    join pg_catalog.pg_attribute a on a.attrelid = format('public.%I', target.table_name)::regclass and a.attname = ord.name;
    if not exists (select 1 from pg_catalog.pg_constraint where conrelid = format('public.%I', target.table_name)::regclass and contype = 'p') then
      execute format('alter table public.%I add primary key (%I)', target.table_name, target.primary_columns[1]);
    elsif not exists (select 1 from pg_catalog.pg_constraint where conrelid = format('public.%I', target.table_name)::regclass and contype = 'p' and conkey = key_columns) then
      raise exception 'Schema mismatch: unexpected primary key on %. No data was changed.', target.table_name;
    end if;

    execute format('select exists(select 1 from public.%I t where not exists (select 1 from auth.users u where u.id = t.%I))', target.table_name, target.owner_column) into invalid_rows;
    if invalid_rows then
      raise exception 'Schema mismatch: % has an owner missing from auth.users. No data was changed.', target.table_name;
    end if;
    select attnum into owner_column from pg_catalog.pg_attribute
    where attrelid = format('public.%I', target.table_name)::regclass and attname = target.owner_column;
    -- Replace only matching auth-owner FKs with the required delete cascade.
    for existing_fk in select conname from pg_catalog.pg_constraint
      where conrelid = format('public.%I', target.table_name)::regclass and contype = 'f'
        and conkey = array[owner_column] and confrelid = 'auth.users'::regclass
        and confkey = array[auth_id_column] and confdeltype <> 'c'
    loop
      execute format('alter table public.%I drop constraint %I', target.table_name, existing_fk.conname);
    end loop;
    if not exists (select 1 from pg_catalog.pg_constraint
      where conrelid = format('public.%I', target.table_name)::regclass and contype = 'f'
        and conkey = array[owner_column] and confrelid = 'auth.users'::regclass
        and confkey = array[auth_id_column] and confdeltype = 'c') then
      execute format('alter table public.%I add constraint %I foreign key (%I) references auth.users(id) on delete cascade',
        target.table_name, target.table_name || '_closure_owner_fkey', target.owner_column);
    end if;
  end loop;

  select array_agg(attnum order by attname desc) into key_columns from pg_catalog.pg_attribute
  where attrelid = 'public.check_ins'::regclass and attname in ('user_id', 'check_in_date');
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.check_ins'::regclass and contype in ('u', 'p') and conkey @> key_columns and conkey <@ key_columns) then
    alter table public.check_ins add constraint check_ins_closure_user_date_key unique (user_id, check_in_date);
  end if;
end;
$$;

-- This constraint is ours to replace on rerun; older unrelated constraints stay.
do $$
begin
  if exists (select 1 from public.journal_entries where entry_type not in ('journal', 'unsent_letter')) then
    raise exception 'Schema mismatch: journal_entries has an unsupported entry_type. No data was changed.';
  end if;
end;
$$;
alter table public.journal_entries drop constraint if exists closure_entry_type_check;
alter table public.journal_entries add constraint closure_entry_type_check check (entry_type in ('journal', 'unsent_letter'));

create or replace function public.closure_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.closure_touch_updated_at() from public, anon, authenticated;

do $$
declare
  target record;
begin
  for target in select * from (values ('profiles', 'id'), ('check_ins', 'user_id'), ('journal_entries', 'user_id'), ('stories', 'user_id')) as tables(table_name, owner_column)
  loop
    execute format('alter table public.%I enable row level security', target.table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', target.table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', target.table_name);
    execute format('grant all on public.%I to service_role', target.table_name);

    execute format('drop policy if exists closure_select_own on public.%I', target.table_name);
    execute format('create policy closure_select_own on public.%I for select to authenticated using ((select auth.uid()) = %I)', target.table_name, target.owner_column);
    execute format('drop policy if exists closure_insert_own on public.%I', target.table_name);
    execute format('create policy closure_insert_own on public.%I for insert to authenticated with check ((select auth.uid()) = %I)', target.table_name, target.owner_column);
    execute format('drop policy if exists closure_update_own on public.%I', target.table_name);
    execute format('create policy closure_update_own on public.%I for update to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)', target.table_name, target.owner_column, target.owner_column);
    execute format('drop policy if exists closure_delete_own on public.%I', target.table_name);
    execute format('create policy closure_delete_own on public.%I for delete to authenticated using ((select auth.uid()) = %I)', target.table_name, target.owner_column);
    -- Permissive policies are ORed. This AND guard prevents a legacy broad
    -- policy from reopening other users rows. Service-role administration remains.
    execute format('drop policy if exists closure_owner_guard on public.%I', target.table_name);
    execute format('create policy closure_owner_guard on public.%I as restrictive for all to public using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)', target.table_name, target.owner_column, target.owner_column);

    execute format('drop trigger if exists closure_touch_updated_at on public.%I', target.table_name);
    execute format('create trigger closure_touch_updated_at before update on public.%I for each row execute function public.closure_touch_updated_at()', target.table_name);
  end loop;
end;
$$;

commit;
