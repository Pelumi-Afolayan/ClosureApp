import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const migration = await readFile(new URL('../supabase/migrations/20261110_base_schema.sql', import.meta.url), 'utf8')
const accountA = '11111111-1111-4111-8111-111111111111'
const accountB = '22222222-2222-4222-8222-222222222222'
const tables = ['profiles', 'check_ins', 'journal_entries', 'stories']

async function database() {
  const db = new PGlite()
  // Only the Supabase-owned auth surface is mocked. The migrations, policies,
  // constraints and triggers below run in an actual embedded PostgreSQL engine.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $fn$
      select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid;
    $fn$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    insert into auth.users(id) values ('${accountA}'), ('${accountB}');
  `)
  return db
}

async function fixtures(db) {
  await db.exec(`
    insert into public.profiles(id, preferred_name, goals, timezone, onboarding_complete)
      values ('${accountA}', 'Fixture A', array['find_peace'], 'UTC', true), ('${accountB}', 'Fixture B', array['move_on'], 'UTC', true);
    insert into public.check_ins(user_id, check_in_date, moods, note)
      values ('${accountA}', '2026-01-01', array['sad', 'hopeful'], 'Fixture note');
    insert into public.journal_entries(user_id, title, content, entry_type)
      values ('${accountA}', '', E'  Fixture words\\nsecond line  ', 'unsent_letter');
    insert into public.stories(user_id, what_happened, what_hurt, what_i_need)
      values ('${accountA}', 'Fixture story', '', '');
  `)
}

async function snapshot(db) {
  const result = {}
  for (const table of tables) result[table] = (await db.query(`select * from public.${table} order by 1`)).rows
  return result
}

async function asUser(db, userId, sql) {
  await db.exec(`begin; set local role authenticated;`)
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId])
    return await db.exec(sql)
  } finally {
    await db.exec('rollback')
  }
}

function lastRows(results) {
  return results.at(-1).rows
}

test('fresh backend runs all migrations in order and every SQL privacy suite', async () => {
  const db = await database()
  try {
    await db.exec(migration)
    await fixtures(db)
    const before = await snapshot(db)
    await db.exec(migration)
    assert.deepEqual(await snapshot(db), before, 'rerunning the base migration preserves every existing value')
    for (const name of ['20261111_activity_streaks.sql', '20261112_push_reminders.sql', '20261113_reminder_lifecycle.sql', '20261114_reflections.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'))
    }
    for (const name of ['privacy.sql', 'activity_privacy.sql', 'reminders.sql']) {
      await db.exec(await readFile(new URL(`../supabase/tests/${name}`, import.meta.url), 'utf8'))
    }
    assert.deepEqual(await snapshot(db), before, 'SQL privacy tests roll back all fixture changes')
  } finally { await db.close() }
})

test('owners can create their rows and upsert, while strangers cannot insert or transfer ownership', async () => {
  const db = await database()
  try {
    await db.exec(migration)
    const ownCreates = [
      `insert into public.profiles(id) values ('${accountA}') returning id`,
      `insert into public.check_ins(user_id, check_in_date) values ('${accountA}', '2026-01-01') returning id`,
      `insert into public.journal_entries(user_id, content) values ('${accountA}', 'Fixture') returning id`,
      `insert into public.stories(user_id) values ('${accountA}') returning user_id`,
    ]
    for (const sql of ownCreates) assert.equal(lastRows(await asUser(db, accountA, sql)).length, 1)
    await fixtures(db)
    const forgedCreates = [
      `insert into public.profiles(id) values ('${accountB}')`,
      `insert into public.check_ins(user_id, check_in_date) values ('${accountB}', '2026-02-02')`,
      `insert into public.journal_entries(user_id) values ('${accountB}')`,
      `insert into public.stories(user_id) values ('${accountB}')`,
    ]
    for (const sql of forgedCreates) await assert.rejects(asUser(db, accountA, sql), { code: '42501' })
    for (const table of tables) {
      const owner = table === 'profiles' ? 'id' : 'user_id'
      await assert.rejects(asUser(db, accountA, `update public.${table} set ${owner} = '${accountB}' where ${owner} = '${accountA}'`), { code: '42501' })
    }
  } finally { await db.close() }
})

test('a legacy broad policy cannot bypass the owner guard after migration', async () => {
  const db = await database()
  try {
    await db.exec(migration)
    await fixtures(db)
    for (const table of tables) await db.exec(`create policy legacy_open on public.${table} for all to public using (true) with check (true)`)
    await db.exec(migration)
    for (const table of tables) {
      const owner = table === 'profiles' ? 'id' : 'user_id'
      const rows = lastRows(await asUser(db, accountB, `select ${owner} from public.${table}`))
      assert.ok(rows.every((row) => row[owner] === accountB), table)
      assert.equal(lastRows(await asUser(db, accountB, `delete from public.${table} where ${owner} = '${accountA}' returning ${owner}`)).length, 0)
    }
    await db.exec(`grant select (preferred_name) on public.profiles to anon; begin; set local role anon;`)
    assert.equal((await db.query('select preferred_name from public.profiles')).rows.length, 0)
    await db.exec('rollback')
  } finally { await db.close() }
})

test('database enforces unique daily check-ins, one story per user, allowed types and cascade deletion', async () => {
  const db = await database()
  try {
    await db.exec(migration)
    await fixtures(db)
    await assert.rejects(db.exec(`insert into public.check_ins(user_id, check_in_date) values ('${accountA}', '2026-01-01')`), { code: '23505' })
    await assert.rejects(db.exec(`insert into public.stories(user_id) values ('${accountA}')`), { code: '23505' })
    await assert.rejects(db.exec(`insert into public.journal_entries(user_id, entry_type) values ('${accountA}', 'sent_letter')`), { code: '23514' })
    await assert.rejects(db.exec(`insert into public.stories(user_id) values ('33333333-3333-4333-8333-333333333333')`), { code: '23503' })
    // Delete only synthetic users in this isolated engine, never real auth users.
    await db.exec(`delete from auth.users where id = '${accountA}'`)
    for (const table of tables) {
      const owner = table === 'profiles' ? 'id' : 'user_id'
      assert.equal((await db.query(`select count(*)::integer n from public.${table} where ${owner} = $1`, [accountA])).rows[0].n, 0)
    }
    assert.equal((await db.query('select count(*)::integer n from public.profiles')).rows[0].n, 1)
  } finally { await db.close() }
})

test('timestamps advance on every table without changing created_at or unrelated data', async () => {
  const db = await database()
  try {
    await db.exec(migration)
    await fixtures(db)
    for (const table of tables) {
      const owner = table === 'profiles' ? 'id' : 'user_id'
      // Seed historical metadata with trigger disabled only in this test DB.
      await db.exec(`alter table public.${table} disable trigger closure_touch_updated_at;
        update public.${table} set created_at = '2020-01-01Z', updated_at = '2020-01-02Z';
        alter table public.${table} enable trigger closure_touch_updated_at;`)
      const result = lastRows(await asUser(db, accountA, `update public.${table} set ${owner} = ${owner} where ${owner} = '${accountA}' returning created_at, updated_at`))
      assert.equal(result[0].created_at.toISOString(), '2020-01-01T00:00:00.000Z')
      assert.ok(result[0].updated_at > new Date('2020-01-02T00:00:00Z'), table)
    }
  } finally { await db.close() }
})

test('legacy missing timestamps, defaults and constraints are repaired without replacing records', async () => {
  const db = await database()
  try {
    await db.exec(migration)
    await fixtures(db)
    await db.exec(`
      alter table public.profiles drop column created_at, drop column updated_at;
      alter table public.stories alter column what_happened drop default;
      alter table public.check_ins drop constraint check_ins_user_id_check_in_date_key;
      alter table public.check_ins drop constraint check_ins_user_id_fkey;
      alter table public.check_ins add constraint legacy_owner_fk foreign key(user_id) references auth.users(id);
      alter table public.journal_entries drop constraint closure_entry_type_check;
    `)
    const before = (await db.query('select preferred_name, goals, timezone, onboarding_complete from public.profiles order by id')).rows
    await db.exec(migration)
    await db.exec(migration)
    assert.deepEqual((await db.query('select preferred_name, goals, timezone, onboarding_complete from public.profiles order by id')).rows, before)
    assert.ok((await db.query('select created_at, updated_at from public.profiles')).rows.every((row) => row.created_at && row.updated_at))
    await db.exec(`insert into public.stories(user_id) values ('${accountB}')`)
    assert.equal((await db.query('select what_happened from public.stories where user_id = $1', [accountB])).rows[0].what_happened, '')
    await assert.rejects(db.exec(`insert into public.check_ins(user_id, check_in_date) values ('${accountA}', '2026-01-01')`), { code: '23505' })
    await assert.rejects(db.exec(`insert into public.journal_entries(user_id, entry_type) values ('${accountA}', 'sent_letter')`), { code: '23514' })
    await db.exec(`delete from auth.users where id = '${accountA}'`)
    assert.equal((await db.query('select count(*)::integer n from public.check_ins')).rows[0].n, 0)
  } finally { await db.close() }
})

test('incompatible existing schema aborts atomically instead of casting or deleting data', async () => {
  const db = await database()
  try {
    await db.exec(`create table public.profiles(id text primary key); insert into public.profiles values ('fixture')`)
    await assert.rejects(db.exec(migration), /Schema mismatch: profiles.id must be uuid/)
    await db.exec('rollback')
    assert.deepEqual((await db.query('select * from public.profiles')).rows, [{ id: 'fixture' }])
    assert.equal((await db.query("select to_regclass('public.check_ins') name")).rows[0].name, null)
    assert.equal((await db.query("select count(*)::integer n from information_schema.columns where table_schema = 'public' and table_name = 'profiles'")).rows[0].n, 1)
  } finally { await db.close() }
})

test('legacy NULL content is rejected without exposing the row or changing live values', async () => {
  const db = await database()
  try {
    await db.exec(migration)
    await fixtures(db)
    await db.exec(`alter table public.journal_entries alter column content drop not null;
      update public.journal_entries set content = null, title = 'Private fixture title';`)
    const before = await snapshot(db)
    await assert.rejects(db.exec(migration), (error) => {
      assert.match(error.message, /journal_entries.content contains NULLs/)
      assert.doesNotMatch(JSON.stringify(error), /Private fixture title/)
      return true
    })
    await db.exec('rollback')
    assert.deepEqual(await snapshot(db), before)
  } finally { await db.close() }
})
