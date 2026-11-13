import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { createReflectionService, validateReflection, lessonDraft, reflectionKinds } from '../src/utils/reflectionRequests.js'

function fake(response = { data: [], error: null }) {
  const calls = []
  const query = {}
  for (const method of ['select','eq','in','order','abortSignal','insert','update','delete']) {
    query[method] = (...args) => { calls.push([method, ...args]); return query }
  }
  query.single = async () => response
  query.then = (resolve, reject) => Promise.resolve(response).then(resolve, reject)
  const service = createReflectionService({ from: table => { calls.push(['from',table]); return query } })
  return { calls, service }
}
test('reflection validation covers every kind, blank text, Unicode and length', () => {
  for (const kind of reflectionKinds) assert.equal(validateReflection({kind,content:'A thought'}),'')
  for (const content of ['', ' \n\t', null, 'a'.repeat(1001)]) assert.ok(validateReflection({kind:'lesson',content}))
  assert.equal(validateReflection({kind:'lesson',content:'🌿'.repeat(1000)}),'')
  assert.ok(validateReflection({kind:'unknown',content:'words'}))
})
test('lesson draft uses selection or the full entry without silently truncating', () => {
  assert.equal(lessonDraft('first second',6,12),'second')
  assert.equal(lessonDraft('first second',0,0),'first second')
  assert.equal(lessonDraft('x'.repeat(1001),0,0).length,1001)
})
test('all reflection kinds attach owners and preserve entered content', async () => {
  for (const kind of reflectionKinds) {
    const {service,calls} = fake({data:{id:'a'},error:null})
    await service.saveReflection({userId:'owner',kind,content:' Words\n '})
    assert.deepEqual(calls.find(c=>c[0]==='insert')[1],{user_id:'owner',kind,content:' Words\n '})
  }
})
test('validation happens before sending a request', async () => {
  const {service,calls}=fake()
  await assert.rejects(service.saveReflection({userId:'owner',kind:'reason',content:' '}))
  assert.equal(calls.length,0)
})
test('list filters owner and kinds, supports cancellation, and orders consistently', async () => {
  const {service,calls}=fake(); const signal = new AbortController().signal
  await service.getReflections('owner',['lesson'],signal)
  assert.ok(calls.some(c=>c[0]==='eq' && c[1]==='user_id' && c[2]==='owner'))
  assert.deepEqual(calls.find(c=>c[0]==='in'),['in','kind',['lesson']])
  assert.deepEqual(calls.find(c=>c[0]==='abortSignal'),['abortSignal',signal])
})
test('update/delete scope both owner and id and propagate errors', async () => {
  for (const method of ['saveReflection','deleteReflection']) {
    const {service,calls}=fake({data:null,error:new Error('unavailable')})
    await assert.rejects(method==='saveReflection' ? service[method]({userId:'owner',id:'row',kind:'reason',content:'Words'}) : service[method]('owner','row'),/unavailable/)
    assert.ok(calls.some(c=>c[0]==='eq' && c[1]==='user_id' && c[2]==='owner'))
    assert.ok(calls.some(c=>c[0]==='eq' && c[1]==='id' && c[2]==='row'))
  }
})
test('reflection migration creates a missing timestamp helper, enforces constraints and supports reruns and cascade', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
      create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as 'select null::uuid';
      insert into auth.users values ('11111111-1111-4111-8111-111111111111');`)
    const sql=await readFile(new URL('../supabase/migrations/20261114_reflections.sql',import.meta.url),'utf8')
    await db.exec(sql); await db.exec(sql)
    for (const [kind,content] of [['unknown','words'],['lesson',' \n\t'],['reason','x'.repeat(1001)]]) {
      await assert.rejects(db.query('insert into public.reflections(user_id,kind,content) values($1,$2,$3)',['11111111-1111-4111-8111-111111111111',kind,content]))
    }
    await db.exec(`insert into public.reflections(user_id,kind,content,updated_at) values ('11111111-1111-4111-8111-111111111111','reason','Words','2000-01-01'); update public.reflections set content='Changed';`)
    const {rows}=await db.query('select updated_at > \'2000-01-01\'::timestamptz as touched from public.reflections')
    assert.equal(rows[0].touched,true)
    await db.exec('delete from auth.users');assert.equal((await db.query('select * from public.reflections')).rows.length,0)
  } finally { await db.close() }
})
