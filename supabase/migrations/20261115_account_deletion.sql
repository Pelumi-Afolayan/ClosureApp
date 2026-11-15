-- Run after all earlier migrations. Repairs only app owner FKs to auth.users.
begin;
set local lock_timeout = '5s';
do $$
declare
  item record;
  owner_att smallint;
  target_att smallint;
  fk record;
begin
  select attnum into target_att from pg_catalog.pg_attribute where attrelid = 'auth.users'::regclass and attname = 'id';
  for item in select * from (values
    ('profiles', 'id'), ('check_ins', 'user_id'), ('journal_entries', 'user_id'),
    ('stories', 'user_id'), ('reflections', 'user_id'), ('app_visits', 'user_id'),
    ('no_contact_days', 'user_id'), ('push_reminders', 'user_id')
  ) as tables(table_name, owner_column) loop
    if pg_catalog.to_regclass('public.' || item.table_name) is null then raise exception 'Apply all earlier migrations first: missing table %', item.table_name; end if;
    select attnum into owner_att from pg_catalog.pg_attribute where attrelid = pg_catalog.to_regclass('public.' || item.table_name) and attname = item.owner_column and not attisdropped;
    if owner_att is null then raise exception 'Missing owner column on %', item.table_name; end if;
    for fk in select conname, confdeltype from pg_catalog.pg_constraint
      where conrelid = pg_catalog.to_regclass('public.' || item.table_name) and contype = 'f'
        and confrelid = 'auth.users'::regclass and conkey = array[owner_att] and confkey = array[target_att]
    loop
      if fk.confdeltype <> 'c' then execute format('alter table public.%I drop constraint %I', item.table_name, fk.conname); end if;
    end loop;
    if not exists (select 1 from pg_catalog.pg_constraint where conrelid = pg_catalog.to_regclass('public.' || item.table_name)
      and contype = 'f' and confrelid = 'auth.users'::regclass and conkey = array[owner_att] and confkey = array[target_att] and confdeltype = 'c') then
      execute format('alter table public.%I add constraint closure_account_owner_fk foreign key (%I) references auth.users(id) on delete cascade', item.table_name, item.owner_column);
    end if;
    for fk in select conname from pg_catalog.pg_constraint where conrelid = pg_catalog.to_regclass('public.' || item.table_name)
      and contype = 'f' and confrelid = 'auth.users'::regclass and conkey = array[owner_att] and confkey = array[target_att] and not convalidated
    loop execute format('alter table public.%I validate constraint %I', item.table_name, fk.conname); end loop;
  end loop;
end;
$$;

create or replace function public.account_deletion_ready()
returns boolean language sql stable security invoker set search_path = '' as $$
  select bool_and(exists (
    select 1 from pg_catalog.pg_constraint c
    join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attname = e.owner_column
    join pg_catalog.pg_attribute u on u.attrelid = c.confrelid and u.attname = 'id'
    where c.conrelid = pg_catalog.to_regclass('public.' || e.table_name) and c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass and c.conkey = array[a.attnum] and c.confkey = array[u.attnum]
      and c.confdeltype = 'c' and c.convalidated
  )) from (values ('profiles','id'),('check_ins','user_id'),('journal_entries','user_id'),('stories','user_id'),
    ('reflections','user_id'),('app_visits','user_id'),('no_contact_days','user_id'),('push_reminders','user_id')) e(table_name, owner_column);
$$;
revoke all on function public.account_deletion_ready() from public, anon, authenticated;
grant execute on function public.account_deletion_ready() to service_role;
commit;
