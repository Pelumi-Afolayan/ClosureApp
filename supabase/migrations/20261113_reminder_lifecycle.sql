-- Reminder lifecycle: run after 20261112_push_reminders.sql.
begin;
set local lock_timeout = '5s';
alter table public.push_reminders add column if not exists device_id uuid;
create index if not exists push_reminders_device_owner on public.push_reminders(user_id, device_id);

-- Endpoint and both keys form a capability already held by PushManager.
-- A different account must prove that capability; an endpoint alone is not proof.
create or replace function public.register_push_reminder(
  p_endpoint text, p_subscription jsonb, p_reminder_time time, p_device_id uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  auth_key text := p_subscription->'keys'->>'auth';
  public_key text := p_subscription->'keys'->>'p256dh';
  clean_subscription jsonb;
begin
  if owner_id is null then
    raise exception 'Sign in to manage reminders.' using errcode = '42501';
  end if;
  if p_device_id is null or p_reminder_time is null or p_reminder_time = time '24:00' then
    raise exception 'Choose a valid reminder time and device.' using errcode = '22023';
  end if;
  if p_endpoint is null or length(p_endpoint) >= 2048
     or p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]*$'
     or p_subscription is null or jsonb_typeof(p_subscription) <> 'object'
     or (p_subscription->>'endpoint') is distinct from p_endpoint
     or jsonb_typeof(p_subscription->'keys'->'auth') is distinct from 'string'
     or jsonb_typeof(p_subscription->'keys'->'p256dh') is distinct from 'string'
     or auth_key !~ '^[A-Za-z0-9_-]{22}$' or public_key !~ '^B[A-Za-z0-9_-]{86}$' then
    raise exception 'The push subscription is not valid.' using errcode = '22023';
  end if;
  if octet_length(decode(translate(auth_key, '-_', '+/') || '==', 'base64')) <> 16
     or octet_length(decode(translate(public_key, '-_', '+/') || '=', 'base64')) <> 65
     or get_byte(decode(translate(public_key, '-_', '+/') || '=', 'base64'), 0) <> 4 then
    raise exception 'The push subscription is not valid.' using errcode = '22023';
  end if;
  clean_subscription := jsonb_build_object('endpoint', p_endpoint, 'keys',
    jsonb_build_object('auth', auth_key, 'p256dh', public_key));

  -- Atomic conflict check: two registrations cannot bypass verification by racing.
  insert into public.push_reminders as existing (endpoint, user_id, subscription, reminder_time, device_id)
  values (p_endpoint, owner_id, clean_subscription, p_reminder_time, p_device_id)
  on conflict (endpoint) do update set user_id = owner_id,
    subscription = excluded.subscription, reminder_time = excluded.reminder_time, device_id = excluded.device_id
  where existing.user_id = owner_id or (
    existing.subscription->'keys'->>'auth' = auth_key
    and existing.subscription->'keys'->>'p256dh' = public_key
  );
  if not found then
    raise exception 'The push subscription could not be verified.' using errcode = '42501';
  end if;
  -- Preserve last_sent_date on transfer/update; registration never resets the cap.
  -- Remove only this caller's obsolete endpoints for the same browser device.
  delete from public.push_reminders where user_id = owner_id and device_id = p_device_id and endpoint <> p_endpoint;
end;
$$;
revoke all on function public.register_push_reminder(text, jsonb, time, uuid) from public, anon, authenticated, service_role;
grant execute on function public.register_push_reminder(text, jsonb, time, uuid) to authenticated;

-- All browser registration/updates must go through the verified function.
-- Column grants must be revoked separately from table-level privileges.
revoke insert, update on public.push_reminders from public, anon, authenticated;
revoke insert (endpoint, user_id, subscription, reminder_time), update (endpoint, user_id, subscription, reminder_time)
  on public.push_reminders from public, anon, authenticated;
-- SELECT and DELETE remain owner-filtered by existing RLS.
commit;
