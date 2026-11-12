import test from 'node:test'
import assert from 'node:assert/strict'
import { latestMilestone, milestoneLabel } from '../src/utils/milestones.js'
test('milestones never credit unearned days and include requested celebrations', () => {
  for (const day of [3, 7, 10, 14, 21, 28, 30, 100, 120, 365, 400, 1000]) assert.equal(latestMilestone(day), day)
  for (const day of [0, 1, 2, -1, NaN, 3.5]) assert.equal(latestMilestone(day), null)
  assert.equal(latestMilestone(6), 3)
  assert.equal(latestMilestone(119), 100)
  assert.equal(latestMilestone(399), 365)
})
test('week and month wording does not invent calendar months', () => {
  assert.match(milestoneLabel(21), /3 weeks/)
  assert.match(milestoneLabel(28), /4 weeks/)
  assert.match(milestoneLabel(30), /about a month/)
  assert.match(milestoneLabel(120), /about four months/)
})
