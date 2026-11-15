-- Run as administrator, after every migration. Only NEW synthetic accounts are
-- deleted. All fixtures, including auth rows, are rolled back. No real user IDs
-- are accepted by this script. Run the entire file, never selected statements.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  keeper_id uuid := gen_random_uuid();
  item record;
  target uuid;
  remaining integer;
begin
  if public.account_deletion_ready() is not true then raise exception 'Deletion setup is not ready'; end if;
  insert into auth.users(id) values (owner_id), (keeper_id);
  foreach target in array array[owner_id, keeper_id] loop
    insert into public.profiles(id, preferred_name, goals, timezone, onboarding_complete)
      values(target, 'Synthetic deletion fixture', '{}', 'UTC', false) on conflict(id) do nothing;
    insert into public.check_ins(user_id, check_in_date, moods, note) values(target, '1900-01-01', array['hopeful'], 'Synthetic fixture');
    insert into public.journal_entries(user_id, content, entry_type) values(target, 'Fixture journal', 'journal'),(target, 'Fixture letter', 'unsent_letter');
    insert into public.stories(user_id, what_happened) values(target, 'Synthetic fixture') on conflict(user_id) do nothing;
    insert into public.reflections(user_id, kind, content) select target, kind, 'Synthetic fixture' from unnest(array['lesson','my_part','next_time','reality_check','reason','looking_forward']) kind;
    insert into public.app_visits(user_id, activity_date) values(target, '1900-01-01');
    insert into public.no_contact_days(user_id, activity_date) values(target, '1900-01-01');
    insert into public.push_reminders(user_id, endpoint, subscription, device_id) values(target,
      'https://fcm.googleapis.com/fcm/send/fixture-' || target,
      jsonb_build_object('endpoint','https://fcm.googleapis.com/fcm/send/fixture-' || target,'keys',jsonb_build_object('auth','fixture','p256dh','fixture')), gen_random_uuid());
  end loop;
  delete from auth.users where id = owner_id;
  if exists(select 1 from auth.users where id = owner_id) then raise exception 'Synthetic auth user remained'; end if;
  for item in select * from (values ('profiles','id'),('check_ins','user_id'),('journal_entries','user_id'),('stories','user_id'),
    ('reflections','user_id'),('app_visits','user_id'),('no_contact_days','user_id'),('push_reminders','user_id')) e(table_name, owner_column)
  loop
    execute format('select count(*) from public.%I where %I = $1', item.table_name, item.owner_column) into remaining using owner_id;
    if remaining <> 0 then raise exception 'Deletion left fixture rows in %', item.table_name; end if;
    execute format('select count(*) from public.%I where %I = $1', item.table_name, item.owner_column) into remaining using keeper_id;
    if remaining = 0 then raise exception 'Deletion affected a different account in %', item.table_name; end if;
    execute format('select count(*) from public.%I r left join auth.users u on u.id = r.%I where u.id is null', item.table_name, item.owner_column) into remaining;
    if remaining <> 0 then raise exception 'Orphan rows exist in %', item.table_name; end if;
  end loop;
end;
$$;
select 'Account deletion cascade checks passed' as result;
rollback;
