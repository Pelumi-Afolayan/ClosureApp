-- Run after the reminders migration. Read-only privilege assertions.
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
