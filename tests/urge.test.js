import test from 'node:test'
import assert from 'node:assert/strict'
import { createUrgeSession, pauseDurationMs, pauseState, selectRealityChecks } from '../src/utils/urge.js'

const start = 1_800_000_000_000
const deadline = start + pauseDurationMs

test('pause uses a ten-minute deadline and rounds displayed seconds up', () => {
  assert.equal(pauseState(deadline, start).display, '10:00')
  assert.equal(pauseState(deadline, start + 1).display, '10:00')
  assert.equal(pauseState(deadline, start + 1000).display, '9:59')
  assert.equal(pauseState(deadline, deadline - 1).display, '0:01')
})

test('sleep and dropped ticks do not extend the pause', () => {
  assert.equal(pauseState(deadline, start + 8 * 60_000).display, '2:00')
  const complete = pauseState(deadline, deadline + 45 * 60_000)
  assert.equal(complete.display, '0:00')
  assert.equal(complete.complete, true)
  assert.equal(complete.canSkip, true)
})

test('optional skip becomes available at exactly two minutes, never before', () => {
  assert.equal(pauseState(deadline, start + 119_999).canSkip, false)
  assert.equal(pauseState(deadline, start + 120_000).canSkip, true)
  assert.equal(pauseState(deadline, start + 120_001).complete, false)
})

test('missing deadlines do not claim a completed pause; backwards clock is bounded', () => {
  for (const missing of [null, undefined, NaN, Infinity, 0]) {
    const state = pauseState(missing, start)
    assert.equal(state.started, false)
    assert.equal(state.canSkip, false)
    assert.equal(state.complete, false)
  }
  assert.equal(pauseState(deadline, start - 60_000).display, '10:00')
})

test('breathing cue follows a gentle four-in/six-out cycle', () => {
  assert.equal(pauseState(deadline, start).cue, 'Breathe in gently')
  assert.equal(pauseState(deadline, start + 4000).cue, 'Let your breath out gently')
  assert.equal(pauseState(deadline, start + 10_000).cue, 'Breathe in gently')
})

const reflections = [
  { id: 'reason', kind: 'reason', content: 'Private reason fixture' },
  ...['a', 'b', 'c', 'd'].map(id => ({ id, kind: 'reality_check', content: 'Fixture' })),
]

test('random selection shows only a few unique reality checks without changing originals', () => {
  const original = structuredClone(reflections)
  const selected = selectRealityChecks([...reflections, reflections[1]], 3, () => 0)
  assert.deepEqual(selected.map(item => item.id), ['b', 'c', 'd'])
  assert.equal(new Set(selected.map(item => item.id)).size, 3)
  assert.ok(selected.every(item => item.kind === 'reality_check'))
  assert.deepEqual(reflections, original)
})

test('random choices influence the sample without inventing items', () => {
  const first = selectRealityChecks(reflections, 3, () => 0)
  const second = selectRealityChecks(reflections, 3, () => 0.99999)
  assert.notDeepEqual(first.map(item => item.id), second.map(item => item.id))
  assert.ok([...first, ...second].every(item => reflections.includes(item)))
})

test('empty and short reality lists are safe, and invalid random values stay in bounds', () => {
  assert.deepEqual(selectRealityChecks([]), [])
  assert.deepEqual(selectRealityChecks([reflections[0]]), [])
  assert.equal(selectRealityChecks([reflections[1]]).length, 1)
  assert.deepEqual(selectRealityChecks(reflections, 0), [])
  for (const value of [NaN, Infinity, -1, 1]) {
    assert.ok(selectRealityChecks(reflections, 3, () => value).every(Boolean))
  }
})

test('leaving and returning reuses one deadline; finishing removes it without history', () => {
  let now = start
  const session = createUrgeSession({ loadReflections: async () => [], now: () => now })
  session.beginPause()
  assert.equal(session.getSnapshot().deadline, deadline)
  now += 180_000
  session.beginPause()
  assert.equal(session.getSnapshot().deadline, deadline)
  assert.equal(pauseState(session.getSnapshot().deadline, now).display, '7:00')
  session.finishPause()
  assert.equal(session.getSnapshot().deadline, null)
  assert.deepEqual(Object.keys(session.getSnapshot()).sort(), ['deadline', 'reflections'])
  session.beginPause()
  assert.equal(session.getSnapshot().deadline, now + pauseDurationMs)
})

test('loaded guidance stays available without another request, even if connectivity is lost', async () => {
  let calls = 0
  const session = createUrgeSession({ loadReflections: async () => {
    calls++
    if (calls > 1) throw new Error('offline')
    return reflections
  } })
  await session.load()
  await session.load()
  assert.equal(calls, 1)
  assert.deepEqual(session.getSnapshot().reflections.rows, reflections)
})

test('concurrent loads share a request and do not overwrite a running timer', async () => {
  let resolve
  let calls = 0
  const session = createUrgeSession({ now: () => start, loadReflections: () => {
    calls++
    return new Promise(done => { resolve = done })
  } })
  const first = session.load()
  const second = session.load()
  assert.equal(first, second)
  await Promise.resolve()
  session.beginPause()
  resolve(reflections)
  await first
  assert.equal(calls, 1)
  assert.equal(session.getSnapshot().deadline, deadline)
})

test('failed loading is not confused with no saved reasons and can be retried', async () => {
  let calls = 0
  const session = createUrgeSession({ loadReflections: async () => {
    if (++calls === 1) throw new Error('offline')
    return []
  } })
  await session.load()
  assert.equal(session.getSnapshot().reflections.error, true)
  assert.equal(session.getSnapshot().reflections.rows, null)
  await session.load()
  assert.equal(session.getSnapshot().reflections.error, false)
  assert.deepEqual(session.getSnapshot().reflections.rows, [])
})

test('saved reason/reality edits and deletes update the in-memory guidance snapshot', async () => {
  const session = createUrgeSession({ loadReflections: async () => reflections })
  await session.load()
  session.applyChange({ id: 'reason', kind: 'reason', content: 'Edited fixture' })
  assert.equal(session.getSnapshot().reflections.rows.find(item => item.id === 'reason').content, 'Edited fixture')
  session.applyChange({ id: 'new', kind: 'reason', content: 'New fixture' })
  assert.ok(session.getSnapshot().reflections.rows.some(item => item.id === 'new'))
  session.applyChange({ id: 'a', deleted: true })
  assert.equal(session.getSnapshot().reflections.rows.some(item => item.id === 'a'), false)
  session.applyChange({ id: 'lesson', kind: 'lesson', content: 'Unrelated fixture' })
  assert.equal(session.getSnapshot().reflections.rows.some(item => item.id === 'lesson'), false)
})

test('separate account sessions share neither timer nor saved reflections', async () => {
  const first = createUrgeSession({ now: () => start, loadReflections: async () => reflections })
  const second = createUrgeSession({ loadReflections: async () => [] })
  await first.load()
  first.beginPause()
  assert.equal(second.getSnapshot().deadline, null)
  assert.equal(second.getSnapshot().reflections.rows, null)
  await second.load()
  assert.deepEqual(second.getSnapshot().reflections.rows, [])
})

test('subscriptions update mounted views and are removable without keeping history', () => {
  const session = createUrgeSession({ now: () => start, loadReflections: async () => [] })
  let changes = 0
  const unsubscribe = session.subscribe(() => changes++)
  session.beginPause()
  session.beginPause()
  assert.equal(changes, 1)
  unsubscribe()
  session.finishPause()
  assert.equal(changes, 1)
})
