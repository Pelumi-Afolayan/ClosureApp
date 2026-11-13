begin;

-- Older projects may have created the base tables manually, without this helper.
create or replace function public.closure_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.closure_touch_updated_at() from public, anon, authenticated;

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('lesson', 'my_part', 'next_time', 'reality_check', 'reason')),
  content text not null check (content ~ '[^[:space:]]' and char_length(content) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reflections_owner_kind_created on public.reflections(user_id, kind, created_at);
alter table public.reflections enable row level security;
revoke all on public.reflections from anon, authenticated;
grant select, insert, update, delete on public.reflections to authenticated;
grant all on public.reflections to service_role;
drop policy if exists reflections_select on public.reflections;
create policy reflections_select on public.reflections for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists reflections_insert on public.reflections;
create policy reflections_insert on public.reflections for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists reflections_update on public.reflections;
create policy reflections_update on public.reflections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists reflections_delete on public.reflections;
create policy reflections_delete on public.reflections for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists closure_touch_updated_at on public.reflections;
create trigger closure_touch_updated_at before update on public.reflections for each row execute function public.closure_touch_updated_at();
commit;
