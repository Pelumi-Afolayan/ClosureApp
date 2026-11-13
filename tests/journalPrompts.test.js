import test from 'node:test'
import assert from 'node:assert/strict'
import { journalPrompts } from '../src/data/journalPrompts.js'
import { goals } from '../src/data/goals.js'
import { chooseJournalPrompt, dismissPromptTitle, journalPromptSequence } from '../src/utils/journalPromptSelection.js'
import { journalReflectionDraft, journalReflectionOptions, validateReflection } from '../src/utils/reflectionRequests.js'

const firstThemeByGoal = {
  move_on: 'who_im_becoming',
  find_peace: 'what_i_need_now',
  rebuild_confidence: 'what_im_proud_of',
  accept_breakup: 'what_i_miss',
  reduce_contact: 'what_i_dont_miss',
}

test('all six requested themes have six to eight distinct nonblank prompts', () => {
  assert.deepEqual(journalPrompts.map(theme => theme.id), [
    'what_i_miss', 'what_i_dont_miss', 'what_i_learned', 'what_i_need_now', 'what_im_proud_of', 'who_im_becoming',
  ])
  const texts = journalPrompts.flatMap(theme => theme.prompts)
  assert.equal(new Set(texts).size, texts.length)
  for (const theme of journalPrompts) {
    assert.ok(theme.prompts.length >= 6 && theme.prompts.length <= 8)
    assert.ok(theme.label.trim())
    assert.ok(theme.prompts.every(prompt => typeof prompt === 'string' && prompt.trim().length > 0))
  }
})

test('every current profile goal biases a relevant theme to the first suggestion', () => {
  for (const goal of goals) {
    assert.equal(chooseJournalPrompt([goal.id]).theme, firstThemeByGoal[goal.id])
  }
})

test('goal order and duplicates never change the deterministic prompt sequence', () => {
  const selected = ['move_on', 'rebuild_confidence', 'reduce_contact']
  assert.deepEqual(journalPromptSequence(selected), journalPromptSequence([...selected].reverse()))
  assert.deepEqual(journalPromptSequence(selected), journalPromptSequence([...selected, ...selected]))
  assert.deepEqual(journalPromptSequence(selected), journalPromptSequence(selected))
})

test('missing and unknown goals fall back to the full library without losing themes', () => {
  assert.deepEqual(journalPromptSequence(['unknown']), journalPromptSequence())
  assert.deepEqual(journalPromptSequence(null), journalPromptSequence())
  const sequence = journalPromptSequence(['find_peace'])
  assert.equal(sequence.length, journalPrompts.flatMap(theme => theme.prompts).length)
  assert.equal(new Set(sequence.map(prompt => prompt.id)).size, sequence.length)
  assert.equal(new Set(sequence.slice(0, 6).map(prompt => prompt.theme)).size, 6)
})

test('another prompt advances without repeating until the library wraps', () => {
  const selected = ['accept_breakup']
  const sequence = journalPromptSequence(selected)
  for (let index = 0; index < sequence.length; index++) {
    assert.deepEqual(chooseJournalPrompt(selected, index), sequence[index])
    assert.notEqual(chooseJournalPrompt(selected, index).id, chooseJournalPrompt(selected, index + 1).id)
  }
  assert.deepEqual(chooseJournalPrompt(selected, sequence.length), sequence[0])
  for (const invalid of [-1, NaN, Infinity, 1.5]) assert.deepEqual(chooseJournalPrompt(selected, invalid), sequence[0])
})

test('prompt selection leaves source goals and the prompt library unchanged', () => {
  const before = structuredClone(journalPrompts)
  const selected = ['find_peace', 'move_on']
  journalPromptSequence(selected)
  assert.deepEqual(selected, ['find_peace', 'move_on'])
  assert.deepEqual(journalPrompts, before)
})

test('dismissing clears only an unchanged prompt title and preserves custom titles', () => {
  const prompt = chooseJournalPrompt([]).text
  assert.equal(dismissPromptTitle(prompt, prompt), '')
  assert.equal(dismissPromptTitle('My own title', prompt), 'My own title')
  assert.equal(dismissPromptTitle(`${prompt} — my thoughts`, prompt), `${prompt} — my thoughts`)
  assert.equal(dismissPromptTitle('My own title', ''), 'My own title')
  assert.equal(dismissPromptTitle('', prompt), '')
})

test('all three menu destinations copy selected text into the exact reflection kind', () => {
  assert.deepEqual(journalReflectionOptions.map(option => option.kind), ['lesson', 'reality_check', 'next_time'])
  const source = 'First line\nA thought to keep\nLast line'
  const start = source.indexOf('A thought')
  const end = source.indexOf('\nLast')
  for (const { kind } of journalReflectionOptions) {
    assert.deepEqual(journalReflectionDraft(kind, source, start, end), { kind, content: 'A thought to keep' })
  }
  assert.equal(source, 'First line\nA thought to keep\nLast line')
})

test('no selection uses the whole entry without changing formatting or silently truncating', () => {
  const source = ` First line\n${'words '.repeat(250)} `
  assert.deepEqual(journalReflectionDraft('lesson', source, 4, 4), { kind: 'lesson', content: source })
  assert.deepEqual(journalReflectionDraft('next_time', source), { kind: 'next_time', content: source })
  assert.match(validateReflection(journalReflectionDraft('reality_check', source)), /1,000/)
})

test('copy respects browser UTF-16 selection offsets and leaves empty drafts editable', () => {
  const source = 'A 🌿 thought'
  const start = source.indexOf('🌿')
  assert.equal(journalReflectionDraft('lesson', source, start, start + 2).content, '🌿')
  assert.deepEqual(journalReflectionDraft('lesson', ''), { kind: 'lesson', content: '' })
  assert.match(validateReflection(journalReflectionDraft('lesson', '')), /few words/)
})

test('the journal menu cannot accidentally create a reason, my-part, or unknown reflection', () => {
  for (const kind of ['reason', 'my_part', 'unknown']) {
    assert.throws(() => journalReflectionDraft(kind, 'Fixture'), /choose Lesson/)
  }
})
