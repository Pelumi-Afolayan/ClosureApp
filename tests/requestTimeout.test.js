import test from 'node:test'
import assert from 'node:assert/strict'
import { withRequestTimeout } from '../src/utils/requestTimeout.js'
import { createJournalService } from '../src/utils/journalRequests.js'

test('stalled requests time out and abort the underlying query without retries', async () => {
  let signal
  let calls = 0
  await assert.rejects(withRequestTimeout(value => { signal = value; calls++; return new Promise(() => {}) }, { timeoutMs: 10 }), /too long/)
  assert.equal(signal.aborted, true)
  assert.equal(calls, 1)
})
test('caller cancellation prevents pre-cancelled work and aborts in-flight work', async () => {
  const controller = new AbortController(); controller.abort()
  let called = false
  await assert.rejects(withRequestTimeout(() => { called = true }, { signal: controller.signal }), /cancelled/)
  assert.equal(called, false)
  const pending = new AbortController()
  let signal
  const result = withRequestTimeout(value => { signal = value; return new Promise(() => {}) }, { signal: pending.signal })
  await Promise.resolve(); pending.abort()
  await assert.rejects(result, /cancelled/)
  assert.equal(signal.aborted, true)
})
test('journal save and delete both abort on timeout and remain owner scoped', async () => {
  for (const operation of ['save', 'delete']) {
    let signal
    const calls = []
    const query = {}
    for (const name of ['update','delete','eq','select']) query[name] = (...args) => { calls.push([name,...args]); return query }
    query.abortSignal = value => { signal = value; return query }
    query.single = () => new Promise(() => {})
    const service = createJournalService({ from: () => query }, { timeoutMs: 10 })
    await assert.rejects(operation === 'save'
      ? service.saveJournalEntry({ userId: 'owner', entryId: 'entry', title: '', content: 'Words', entryType: 'journal' })
      : service.deleteJournalEntry('owner','entry'), /too long/)
    assert.equal(signal.aborted, true)
    assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner'))
    assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'id' && call[2] === 'entry'))
  }
})
