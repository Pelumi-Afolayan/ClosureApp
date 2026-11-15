import test from 'node:test'
import assert from 'node:assert/strict'
import { createProfileRequests } from '../src/utils/profileRequests.js'

function client(result) {
  const calls = []
  const query = {}
  for (const name of ['select', 'eq', 'abortSignal', 'upsert']) query[name] = (...args) => { calls.push([name, ...args]); return query }
  query.maybeSingle = query.single = async () => result
  return { calls, from: table => { calls.push(['from', table]); return query } }
}

test('profile reads include the celebration preference, scope the owner and forward cancellation', async () => {
  const db = client({ data: { id: 'owner', show_celebrations: false } })
  const signal = new AbortController().signal
  assert.equal((await createProfileRequests(db).getProfile('owner', signal)).show_celebrations, false)
  assert.ok(db.calls.some(([name, fields]) => name === 'select' && fields.includes('show_celebrations')))
  assert.deepEqual(db.calls.find(([name]) => name === 'eq'), ['eq', 'id', 'owner'])
  assert.deepEqual(db.calls.find(([name]) => name === 'abortSignal'), ['abortSignal', signal])
})

test('saving either celebration choice preserves profile input and returns the stored choice', async () => {
  for (const enabled of [false, true]) {
    const profile = { id: 'owner', preferred_name: 'Sample', goals: ['find_peace'], timezone: 'UTC', onboarding_complete: true, show_celebrations: enabled }
    const original = structuredClone(profile)
    const db = client({ data: profile })
    assert.deepEqual(await createProfileRequests(db).saveProfile(profile), original)
    assert.deepEqual(db.calls.find(([name]) => name === 'upsert'), ['upsert', original, { onConflict: 'id' }])
    assert.deepEqual(profile, original)
    assert.ok(db.calls.some(([name, fields]) => name === 'select' && fields.includes('show_celebrations')))
  }
})

test('profile failures propagate instead of reporting a saved preference', async () => {
  const error = new Error('Synthetic connection failure')
  const actions = createProfileRequests(client({ error }))
  await assert.rejects(actions.getProfile('owner'), error)
  await assert.rejects(actions.saveProfile({ id: 'owner', show_celebrations: false }), error)
})
