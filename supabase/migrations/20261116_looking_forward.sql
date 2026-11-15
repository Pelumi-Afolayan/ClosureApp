begin;
set local lock_timeout = '5s';
do $$
declare constraint_row record;
begin
  for constraint_row in
    select c.conname from pg_catalog.pg_constraint c
    join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attname = 'kind' and a.attnum = any(c.conkey)
    where c.conrelid = 'public.reflections'::regclass and c.contype = 'c'
  loop
    execute format('alter table public.reflections drop constraint %I', constraint_row.conname);
  end loop;
end;
$$;
alter table public.reflections add constraint closure_reflection_kind_check
  check (kind in ('lesson', 'my_part', 'next_time', 'reality_check', 'reason', 'looking_forward'));
commit;
