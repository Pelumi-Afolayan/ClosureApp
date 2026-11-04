import test from 'node:test'
import assert from 'node:assert/strict'

import { createStoryService, storyAnswers } from '../src/utils/storyRequests.js'

function fakeClient(response) {
  const calls = []
  const query = {
    select(...args) { calls.push(['select', ...args]); return this },
    eq(...args) { calls.push(['eq', ...args]); return this },
    abortSignal(...args) { calls.push(['abortSignal', ...args]); return this },
    upsert(...args) { calls.push(['upsert', ...args]); return this },
    async maybeSingle() { return response },
    async single() { return response },
  }

  return {
    calls,
    service: createStoryService({
      from(table) { calls.push(['from', table]); return query },
    }),
  }
}

test('a new story starts with optional blank answers', () => {
  assert.deepEqual(storyAnswers(null), { whatHappened: '', whatHurt: '', whatINeed: '' })
})

test('loading an existing story preserves its writing exactly', () => {
  assert.deepEqual(storyAnswers({
    what_happened: ' First line\nSecond line ',
    what_hurt: '',
    what_i_need: 'Time',
  }), {
    whatHappened: ' First line\nSecond line ',
    whatHurt: '',
    whatINeed: 'Time',
  })
})

test('loading filters the owner and allows request cancellation', async () => {
  const { service, calls } = fakeClient({ data: null, error: null })
  const controller = new AbortController()

  assert.equal(await service.getStory('account-a', controller.signal), null)
  assert.deepEqual(calls.find((call) => call[0] === 'from'), ['from', 'stories'])
  assert.deepEqual(calls.find((call) => call[0] === 'eq'), ['eq', 'user_id', 'account-a'])
  assert.equal(calls.find((call) => call[0] === 'abortSignal')[1], controller.signal)
})

test('all answers can be cleared and saved blank', async () => {
  const saved = { user_id: 'account-a', what_happened: '', what_hurt: '', what_i_need: '' }
  const { service, calls } = fakeClient({ data: saved, error: null })

  assert.equal(await service.saveStory({
    userId: 'account-a', whatHappened: '', whatHurt: '', whatINeed: '',
  }), saved)
  assert.deepEqual(calls.find((call) => call[0] === 'upsert'), [
    'upsert', saved, { onConflict: 'user_id' },
  ])
})

test('repeated saves update the same owner and preserve formatting', async () => {
  const { service, calls } = fakeClient({ data: {}, error: null })
  const input = { userId: 'account-a', whatHappened: ' A\nB ', whatHurt: '', whatINeed: 'Rest' }

  await service.saveStory(input)
  await service.saveStory({ ...input, whatINeed: 'More rest' })

  const saves = calls.filter((call) => call[0] === 'upsert')
  assert.equal(saves[1][1].user_id, 'account-a')
  assert.equal(saves[1][1].what_happened, ' A\nB ')
  assert.equal(saves[1][1].what_i_need, 'More rest')
  assert.deepEqual(saves[0][2], saves[1][2])
})

test('loading failures are not mistaken for a missing story', async () => {
  const error = new Error('Read denied')
  const { service } = fakeClient({ data: null, error })
  await assert.rejects(service.getStory('account-a'), error)
})

test('save failures propagate so the form keeps its draft', async () => {
  const error = new Error('Write denied')
  const { service } = fakeClient({ data: null, error })
  await assert.rejects(service.saveStory({
    userId: 'account-a', whatHappened: 'Draft', whatHurt: '', whatINeed: '',
  }), error)
})
