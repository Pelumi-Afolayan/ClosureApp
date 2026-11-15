-- Run after the base schema and other earlier migrations, before deploying the UI.
-- This preference uses the existing owner-only profiles RLS and updated_at trigger.
begin;
set local lock_timeout = '5s';
alter table public.profiles
  add column if not exists show_celebrations boolean not null default true;
commit;
