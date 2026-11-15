import test from 'node:test'
import assert from 'node:assert/strict'
import { IDBFactory } from 'fake-indexeddb'
import { createDraftStorage, isNewerDraft } from '../src/utils/draftStorage.js'

function setup() { const indexedDB = new IDBFactory(); return { indexedDB, store: createDraftStorage(() => indexedDB) } }
test('drafts survive a new wrapper, preserve Unicode and isolate users, entry ids and new writing types', async () => {
  const { store, indexedDB } = setup()
  const values = { title: '  🌿 ', content: 'First\n  second', entryType: 'journal' }
  await store.put('a', 'journal:new:journal', values)
  values.content = 'Changed outside storage'
  await store.put('b', 'journal:new:journal', { content: 'Other account' })
  await store.put('a', 'journal:new:unsent_letter', { content: 'Letter' })
  await store.put('a', 'story', { whatHappened: 'Story' })
  const reopened = createDraftStorage(() => indexedDB)
  assert.equal((await reopened.get('a', 'journal:new:journal')).values.content, 'First\n  second')
  assert.equal((await reopened.list('a')).length, 3)
  assert.equal((await reopened.list('b')).length, 1)
  assert.equal(await reopened.get('b', 'story'), null)
})
test('successful save/discard removal invalidates delayed writes for that draft only', async () => {
  const { store } = setup()
  const token = store.begin('a')
  const revision = store.revision('a', 'entry')
  await store.put('a', 'entry', { content: 'Unsaved' }, token)
  const pending = store.put('a', 'entry', { content: 'Late write' }, token, null, Date.now(), revision)
  await store.remove('a', 'entry')
  await pending
  assert.equal(await store.get('a', 'entry'), null)
  assert.equal(await store.put('a', 'entry', { content: 'Stale unmount' }, token, null, Date.now(), revision), false)
  assert.equal(await store.put('a', 'entry', { content: 'New edit' }, token), true)
})
test('sign-out/deletion clears only that owner and rejects old pending writers after a fresh login', async () => {
  const { store } = setup()
  const oldSession = store.begin('a')
  await store.put('a', 'entry', { content: 'Private' }, oldSession)
  await store.put('b', 'entry', { content: 'Retain other user' })
  const pending = store.put('a', 'other', { content: 'Pending' }, oldSession)
  await store.clearUser('a'); await pending
  assert.deepEqual(await store.list('a'), [])
  assert.equal((await store.list('b')).length, 1)
  assert.equal(await store.put('a', 'entry', { content: 'Late' }, oldSession), false)
  const freshSession = store.begin('a')
  assert.notEqual(freshSession, oldSession)
  assert.equal(await store.put('a', 'entry', { content: 'Still stale' }, oldSession), false)
  assert.equal(await store.put('a', 'entry', { content: 'Fresh session' }, freshSession), true)
})
test('restoration is offered only for different, newer device writing', () => {
  const savedAt = '2026-11-15T10:00:00Z'
  const values = { content: 'Saved' }
  assert.equal(isNewerDraft(null, savedAt, values), false)
  assert.equal(isNewerDraft({ values, updatedAt: Date.now() }, savedAt, values), false)
  assert.equal(isNewerDraft({ values: { content: 'Different' }, updatedAt: Date.parse(savedAt) - 1 }, savedAt, values), false)
  assert.equal(isNewerDraft({ values: { content: 'Different' }, updatedAt: Date.parse(savedAt) + 1 }, savedAt, values), true)
  assert.equal(isNewerDraft({ values: { content: 'New' }, updatedAt: 1 }, null, {}), true)
})
test('unavailable IndexedDB fails explicitly instead of claiming a draft was kept', async () => {
  const store = createDraftStorage(() => undefined)
  await assert.rejects(store.put('a', 'entry', { content: 'Private' }), /unavailable/)
  await assert.rejects(store.get('a', 'entry'), /unavailable/)
})
