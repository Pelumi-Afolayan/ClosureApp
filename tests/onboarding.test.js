import test from 'node:test'
import assert from 'node:assert/strict'

import { goals } from '../src/data/goals.js'
import { toggleGoalSelection, validateOnboarding } from '../src/utils/onboarding.js'

test('selecting another goal preserves the previous choices', () => {
  const selected = ['move_on', 'find_peace']
  const result = toggleGoalSelection(selected, 'rebuild_confidence')

  assert.deepEqual(result, ['move_on', 'find_peace', 'rebuild_confidence'])
  assert.deepEqual(selected, ['move_on', 'find_peace'])
})

test('deselecting one goal preserves the other goals', () => {
  assert.deepEqual(
    toggleGoalSelection(['move_on', 'find_peace'], 'move_on'),
    ['find_peace']
  )
})

test('every goal can be selected together and saved as valid input', () => {
  const allGoals = goals.map((goal) => goal.id)

  assert.equal(new Set(allGoals).size, 5)
  assert.equal(validateOnboarding('Ada', allGoals), '')
})

test('empty or whitespace names and empty goals cannot complete onboarding', () => {
  assert.match(validateOnboarding('   ', ['find_peace']), /name/)
  assert.match(validateOnboarding('Ada', []), /at least one/)
})

test('overlong names and unknown goal IDs are rejected', () => {
  assert.match(validateOnboarding('a'.repeat(81), ['find_peace']), /80/)
  assert.match(validateOnboarding('Ada', ['unknown_goal']), /no longer available/)
  assert.equal(validateOnboarding(' Ada Lovelace ', ['find_peace']), '')
})
