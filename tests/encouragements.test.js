import test from 'node:test'
import assert from 'node:assert/strict'

import { encouragements } from '../src/data/encouragements.js'
import { goals } from '../src/data/goals.js'
import { getDailyEncouragement } from '../src/utils/encouragements.js'
import { getLocalDate } from '../src/utils/dates.js'

const input = {
  selectedGoals: ['find_peace'],
  localDate: '2026-11-04',
  userId: 'account-a',
}

test('every approved goal has several messages with unique IDs and wording', () => {
  const messages = Object.values(encouragements).flat()

  for (const goal of goals) {
    assert.ok(encouragements[goal.id].length >= 5)
  }

  assert.ok(encouragements.general.length >= 5)
  assert.equal(new Set(messages.map((message) => message.id)).size, messages.length)
  assert.equal(new Set(messages.map((message) => message.text)).size, messages.length)
})

test('refreshing with the same account, date and goals returns the same message', () => {
  assert.deepEqual(getDailyEncouragement(input), getDailyEncouragement({ ...input }))
})

test('messages come from selected goals', () => {
  assert.ok(encouragements.find_peace.includes(getDailyEncouragement(input)))
})

test('reordering or duplicating selected goals does not change the message', () => {
  const first = getDailyEncouragement({ ...input, selectedGoals: ['find_peace', 'move_on'] })
  const reordered = getDailyEncouragement({ ...input, selectedGoals: ['move_on', 'find_peace', 'move_on'] })
  assert.deepEqual(first, reordered)
})

test('all goals can contribute messages without forcing a single goal', () => {
  const selectedGoals = goals.map((goal) => goal.id)
  const observed = new Set()

  for (let index = 0; index < 25; index++) {
    const localDate = new Date(Date.UTC(2026, 10, 1 + index)).toISOString().slice(0, 10)
    observed.add(getDailyEncouragement({ ...input, selectedGoals, localDate }).id)
  }

  assert.equal(observed.size, 25)
})

test('unknown or missing goals use the general collection', () => {
  assert.ok(encouragements.general.includes(getDailyEncouragement({ ...input, selectedGoals: [] })))
  assert.ok(encouragements.general.includes(getDailyEncouragement({ ...input, selectedGoals: ['unknown'] })))
})

test('consecutive days use different messages, including month/year transitions', () => {
  for (const [first, second] of [
    ['2026-11-04', '2026-11-05'],
    ['2026-11-30', '2026-12-01'],
    ['2026-12-31', '2027-01-01'],
    ['2028-02-29', '2028-03-01'],
  ]) {
    assert.notEqual(
      getDailyEncouragement({ ...input, localDate: first }).id,
      getDailyEncouragement({ ...input, localDate: second }).id
    )
  }
})

test('the account offsets the starting message deterministically', () => {
  const results = new Set(['account-a', 'account-b', 'account-c', 'account-d', 'account-e'].map((userId) => (
    getDailyEncouragement({ ...input, userId }).id
  )))

  assert.ok(results.size > 1)
})

test('Lagos midnight advances the message while the UTC date is unchanged', () => {
  const before = getLocalDate('Africa/Lagos', new Date('2026-11-04T22:59:59Z'))
  const after = getLocalDate('Africa/Lagos', new Date('2026-11-04T23:00:00Z'))

  assert.notEqual(
    getDailyEncouragement({ ...input, localDate: before }).id,
    getDailyEncouragement({ ...input, localDate: after }).id
  )
})

test('invalid and non-calendar dates are rejected', () => {
  for (const localDate of ['not-a-date', '2026-02-30', '2026-2-1', '2026-11-04T12:00:00Z']) {
    assert.throws(() => getDailyEncouragement({ ...input, localDate }), /valid local date/)
  }
})
