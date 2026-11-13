-- Run after 20261113_reminder_lifecycle.sql. All fixtures roll back.
begin;
do $$
begin
  if has_function_privilege('authenticated', 'public.claim_due_reminders()', 'execute')
     or has_function_privilege('anon', 'public.claim_due_reminders()', 'execute') then
    raise exception 'Browser roles must not claim reminders';
  end if;
  if not has_function_privilege('service_role', 'public.claim_due_reminders()', 'execute') then
    raise exception 'Server must be able to claim reminders';
  end if;
  if has_column_privilege('authenticated', 'public.push_reminders', 'last_sent_date', 'insert')
     or has_column_privilege('authenticated', 'public.push_reminders', 'last_sent_date', 'update') then
    raise exception 'Clients must not alter delivery claims';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.push_reminders'::regclass) then
    raise exception 'Reminders require RLS';
  end if;
end $$;
rollback;

-- Lifecycle checks use only synthetic endpoint/key fixtures; all roll back.
-- Requires two existing auth accounts, like the core privacy suite.
begin;
create temporary table closure_reminder_fixture (
  account_a uuid, account_b uuid, endpoint text, other_endpoint text,
  device_a uuid, device_b uuid, subscription jsonb
) on commit drop;
insert into closure_reminder_fixture(account_a, account_b, endpoint, other_endpoint, device_a, device_b)
select ids[1], ids[2], 'https://fcm.googleapis.com/closure-fixture-' || gen_random_uuid(),
  'https://fcm.googleapis.com/closure-fixture-' || gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
from (select array_agg(id) ids from (select id from auth.users order by created_at, id limit 2) users) accounts;
do $$
begin
  if (select account_b is null from closure_reminder_fixture) then raise exception 'Two test accounts are required.'; end if;
end $$;
update closure_reminder_fixture set subscription = jsonb_build_object('endpoint', endpoint, 'keys', jsonb_build_object(
  'auth', rtrim(translate(encode(decode(repeat('11', 16), 'hex'), 'base64'), '+/', '-_'), '='),
  'p256dh', rtrim(translate(replace(encode(decode('04' || repeat('11', 64), 'hex'), 'base64'), E'\n', ''), '+/', '-_'), '=')
));
grant select on closure_reminder_fixture to authenticated;

-- Definer privileges are restricted; direct browser INSERT/UPDATE are revoked.
do $$
begin
  if has_function_privilege('anon', 'public.register_push_reminder(text,jsonb,time,uuid)', 'execute')
    or has_function_privilege('service_role', 'public.register_push_reminder(text,jsonb,time,uuid)', 'execute') then
    raise exception 'Only authenticated callers may register their browser';
  end if;
  if not has_function_privilege('authenticated', 'public.register_push_reminder(text,jsonb,time,uuid)', 'execute') then
    raise exception 'Authenticated registration is missing';
  end if;
  if has_column_privilege('authenticated', 'public.push_reminders', 'user_id', 'update')
    or has_column_privilege('authenticated', 'public.push_reminders', 'subscription', 'insert') then
    raise exception 'Direct registration would bypass verification';
  end if;
end $$;
select set_config('request.jwt.claim.sub', (select account_a::text from closure_reminder_fixture), true);
set local role authenticated;
do $$
declare f record := (select f from closure_reminder_fixture f);
begin
  perform public.register_push_reminder(f.endpoint, f.subscription, '19:00', f.device_a);
  if not exists (select 1 from public.push_reminders where endpoint = f.endpoint and user_id = auth.uid() and device_id = f.device_a) then
    raise exception 'Owner registration failed';
  end if;
end $$;
reset role;
update public.push_reminders set last_sent_date = current_date where endpoint = (select endpoint from closure_reminder_fixture);
select set_config('request.jwt.claim.sub', (select account_b::text from closure_reminder_fixture), true);
set local role authenticated;
do $$
declare f record := (select f from closure_reminder_fixture f);
begin
  if exists (select 1 from public.push_reminders where endpoint = f.endpoint) then raise exception 'Other owner row leaked'; end if;
  begin
    perform public.register_push_reminder(f.endpoint, jsonb_set(f.subscription, '{keys,auth}', to_jsonb(repeat('A', 22))), '19:00', f.device_b);
    raise exception 'Wrong subscription keys allowed a transfer';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.register_push_reminder(f.endpoint, jsonb_set(f.subscription, '{keys,p256dh}',
      to_jsonb(rtrim(translate(replace(encode(decode('04' || repeat('22', 64), 'hex'), 'base64'), E'\n', ''), '+/', '-_'), '='))), '19:00', f.device_b);
    raise exception 'Wrong public key allowed a transfer';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.register_push_reminder(f.endpoint || '-mismatch', f.subscription, '19:00', f.device_b);
    raise exception 'Mismatched subscription endpoint accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.register_push_reminder(f.endpoint, jsonb_build_object('endpoint', f.endpoint), '19:00', f.device_b);
    raise exception 'Missing keys accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.register_push_reminder('https://localhost/private', jsonb_set(f.subscription, '{endpoint}', '"https://localhost/private"'::jsonb), '19:00', f.device_b);
    raise exception 'Unapproved push provider accepted';
  exception when invalid_parameter_value then null;
  end;
  -- Matching both keys proves possession without revealing the old user ID.
  perform public.register_push_reminder(f.endpoint, f.subscription, '20:00', f.device_b);
  if not exists (select 1 from public.push_reminders where endpoint = f.endpoint and user_id = auth.uid()
    and last_sent_date = current_date and reminder_time = time '20:00') then raise exception 'Safe transfer or daily cap preservation failed'; end if;
  perform public.register_push_reminder(f.other_endpoint, jsonb_set(f.subscription, '{endpoint}', to_jsonb(f.other_endpoint)), '18:00', f.device_a);
  perform public.register_push_reminder(f.endpoint || '-replacement', jsonb_set(f.subscription, '{endpoint}', to_jsonb(f.endpoint || '-replacement')), '20:00', f.device_b);
  if exists (select 1 from public.push_reminders where endpoint = f.endpoint) then raise exception 'Old same-device endpoint was not retired'; end if;
  delete from public.push_reminders where user_id = auth.uid() and device_id = f.device_b;
  if exists (select 1 from public.push_reminders where endpoint = f.endpoint || '-replacement') then raise exception 'Replacement device cleanup failed'; end if;
  if exists (select 1 from public.push_reminders where endpoint = f.endpoint) then raise exception 'Device cleanup failed'; end if;
  if not exists (select 1 from public.push_reminders where endpoint = f.other_endpoint) then raise exception 'Cleanup removed another device'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role authenticated;
do $$
begin
  begin
    perform public.register_push_reminder('https://fcm.googleapis.com/fixture', '{}'::jsonb, '19:00', gen_random_uuid());
    raise exception 'Missing auth.uid accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
