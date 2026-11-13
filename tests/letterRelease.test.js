import test from 'node:test'
import assert from 'node:assert/strict'
import { canReleaseLetter, releaseLetter, shouldRereadLetter } from '../src/utils/letterRelease.js'

const savedLetter = { userId: 'owner', entryId: 'letter', entryType: 'unsent_letter', savedEntryType: 'unsent_letter' }

test('release is available only for existing saved letters, not unsaved type changes', () => {
  assert.equal(canReleaseLetter(savedLetter), true)
  assert.equal(canReleaseLetter({ ...savedLetter, entryId: null }), false)
  assert.equal(canReleaseLetter({ ...savedLetter, savedEntryType: 'journal' }), false)
  assert.equal(canReleaseLetter({ ...savedLetter, entryType: 'journal' }), false)
})

test('animation finishes before the existing delete service is called', async () => {
  const calls = []
  let finishAnimation
  const result = releaseLetter({
    ...savedLetter,
    animate: () => { calls.push('animation'); return new Promise(resolve => { finishAnimation = resolve }) },
    deleteEntry: async (userId, entryId) => { calls.push(['delete', userId, entryId]) },
  })
  assert.deepEqual(calls, ['animation'])
  finishAnimation(true)
  assert.deepEqual(await result, { deleted: true, released: true })
  assert.deepEqual(calls, ['animation', ['delete', 'owner', 'letter']])
})

test('reduced-motion fade follows the same sequence without requiring movement', async () => {
  let deleted = false
  const result = await releaseLetter({
    ...savedLetter,
    animate: async () => true,
    deleteEntry: async () => { deleted = true },
  })
  assert.equal(deleted, true)
  assert.equal(result.released, true)
})

test('closing the component during animation cancels before deletion', async () => {
  let deleted = false
  assert.deepEqual(await releaseLetter({
    ...savedLetter, animate: async () => false, deleteEntry: async () => { deleted = true },
  }), { cancelled: true })
  assert.equal(deleted, false)
})

test('deletion failure never reports release success or mutates the letter, and allows retry', async () => {
  const letter = { ...savedLetter, title: 'Fixture', content: 'Private fixture words' }
  const original = structuredClone(letter)
  let attempts = 0
  const options = {
    ...letter,
    animate: async () => true,
    deleteEntry: async () => { if (++attempts === 1) throw new Error('network unavailable') },
  }
  await assert.rejects(releaseLetter(options), /network unavailable/)
  assert.deepEqual(letter, original)
  assert.equal((await releaseLetter(options)).released, true)
  assert.equal(attempts, 2)
})

test('invalid release requests cannot animate or delete', async () => {
  for (const invalid of [{ entryId: null }, { entryType: 'journal' }, { savedEntryType: 'journal' }, { userId: null }]) {
    let touched = false
    await assert.rejects(releaseLetter({
      ...savedLetter, ...invalid,
      animate: async () => { touched = true }, deleteEntry: async () => { touched = true },
    }), /saved unsent letter/)
    assert.equal(touched, false)
  }
})

test('animation failure does not delete the letter', async () => {
  let deleted = false
  await assert.rejects(releaseLetter({
    ...savedLetter, animate: async () => { throw new Error('interrupted') },
    deleteEntry: async () => { deleted = true },
  }), /interrupted/)
  assert.equal(deleted, false)
})

test('reread nudge appears at 30 days only for letters, using creation time', () => {
  const now = Date.parse('2026-11-13T12:00:00Z')
  const day = 24 * 60 * 60 * 1000
  const letter = { entry_type: 'unsent_letter', created_at: new Date(now - 30 * day).toISOString(), updated_at: new Date(now).toISOString() }
  assert.equal(shouldRereadLetter(letter, now), true)
  assert.equal(shouldRereadLetter(letter, now - 1), false)
  assert.equal(shouldRereadLetter({ ...letter, entry_type: 'journal' }, now), false)
  assert.equal(shouldRereadLetter({ ...letter, created_at: 'invalid' }, now), false)
  assert.equal(shouldRereadLetter({ ...letter, created_at: new Date(now + day).toISOString() }, now), false)
})
