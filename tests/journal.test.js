import test from 'node:test'
import assert from 'node:assert/strict'

import { createJournalService, validateJournalEntry } from '../src/utils/journalRequests.js'

function fakeClient(response) {
  const calls = []
  const query = {
    select(...args) { calls.push(['select', ...args]); return this },
    eq(...args) { calls.push(['eq', ...args]); return this },
    order(...args) { calls.push(['order', ...args]); return this },
    range(...args) { calls.push(['range', ...args]); return this },
    abortSignal(...args) { calls.push(['abortSignal', ...args]); return this },
    insert(...args) { calls.push(['insert', ...args]); return this },
    update(...args) { calls.push(['update', ...args]); return this },
    delete(...args) { calls.push(['delete', ...args]); return this },
    async single() { return response },
    async maybeSingle() { return response },
    then(resolve, reject) { return Promise.resolve(response).then(resolve, reject) },
  }

  return {
    calls,
    service: createJournalService({
      from(table) { calls.push(['from', table]); return query },
    }),
  }
}

test('blank and whitespace-only writing is rejected before any request', async () => {
  const { service, calls } = fakeClient({ data: null, error: null })

  for (const content of ['', '   ', '\n\t']) {
    await assert.rejects(service.saveJournalEntry({
      userId: 'owner-a', title: '', content, entryType: 'journal',
    }), /write something/)
  }

  assert.equal(calls.length, 0)
})

test('unknown entry types cannot be saved', () => {
  assert.match(validateJournalEntry({ content: 'Some words', entryType: 'email' }), /choose/)
})

test('new letters keep their content and attach the authenticated owner', async () => {
  const saved = { id: 'entry-a' }
  const { service, calls } = fakeClient({ data: saved, error: null })
  const content = ' First line\nSecond line '

  assert.equal(await service.saveJournalEntry({
    userId: 'owner-a', title: ' A letter ', content, entryType: 'unsent_letter',
  }), saved)

  assert.deepEqual(calls.find((call) => call[0] === 'insert'), ['insert', {
    user_id: 'owner-a', title: 'A letter', content, entry_type: 'unsent_letter',
  }])
})

test('editing filters both owner and entry and never inserts a new entry', async () => {
  const { service, calls } = fakeClient({ data: { id: 'entry-a' }, error: null })

  await service.saveJournalEntry({
    userId: 'owner-a', entryId: 'entry-a', title: '', content: 'Changed words', entryType: 'journal',
  })

  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner-a'))
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'id' && call[2] === 'entry-a'))
  assert.equal(calls.some((call) => call[0] === 'insert'), false)
  assert.deepEqual(calls.find((call) => call[0] === 'update')[1], {
    title: '', content: 'Changed words', entry_type: 'journal',
  })
})

test('listing does not request full entry content and supports further pages', async () => {
  const records = Array.from({ length: 21 }, (_, index) => ({ id: `entry-${index}` }))
  const { service, calls } = fakeClient({ data: records, error: null })

  const result = await service.getJournalEntries('owner-a', { page: 2 })

  assert.equal(result.entries.length, 20)
  assert.equal(result.hasMore, true)
  assert.deepEqual(calls.find((call) => call[0] === 'range'), ['range', 20, 40])
  assert.equal(calls.find((call) => call[0] === 'select')[1].includes('content'), false)
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner-a'))
})

test('letter filtering is applied in the database rather than after pagination', async () => {
  const { service, calls } = fakeClient({ data: [], error: null })

  const result = await service.getJournalEntries('owner-a', { entryType: 'unsent_letter' })

  assert.equal(result.hasMore, false)
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'entry_type' && call[2] === 'unsent_letter'))
})

test('opening an entry filters the owner and ID and supports cancelled requests', async () => {
  const { service, calls } = fakeClient({ data: null, error: null })
  const controller = new AbortController()

  assert.equal(await service.getJournalEntry('owner-a', 'entry-a', controller.signal), null)
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner-a'))
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'id' && call[2] === 'entry-a'))
  assert.equal(calls.find((call) => call[0] === 'abortSignal')[1], controller.signal)
})

test('delete filters both owner and entry and requests a deleted ID as confirmation', async () => {
  const { service, calls } = fakeClient({ data: { id: 'entry-a' }, error: null })

  assert.deepEqual(await service.deleteJournalEntry('owner-a', 'entry-a'), { id: 'entry-a' })
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'owner-a'))
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'id' && call[2] === 'entry-a'))
  assert.deepEqual(calls.find((call) => call[0] === 'select'), ['select', 'id'])
})

test('database failures propagate for list, read, save and delete', async () => {
  const error = new Error('Permission denied')
  const { service } = fakeClient({ data: null, error })

  await assert.rejects(service.getJournalEntries('owner-a'), error)
  await assert.rejects(service.getJournalEntry('owner-a', 'entry-a'), error)
  await assert.rejects(service.saveJournalEntry({
    userId: 'owner-a', title: '', content: 'Draft', entryType: 'journal',
  }), error)
  await assert.rejects(service.deleteJournalEntry('owner-a', 'entry-a'), error)
})
