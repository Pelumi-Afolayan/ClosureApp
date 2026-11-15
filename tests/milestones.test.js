import test from 'node:test'
import assert from 'node:assert/strict'
import { getMilestoneAnnouncement, latestMilestone, milestoneLabel } from '../src/utils/milestones.js'
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


test('automatic celebrations default on, can be off without altering days, and never replay when enabled later', () => {
  const tracker = { today: '2026-11-15', current: 3, dates: ['2026-11-13', '2026-11-14', '2026-11-15'], message: 'Confirmed', error: '', loading: false, saving: false, recordedToday: true }
  const original = structuredClone(tracker)
  assert.deepEqual(getMilestoneAnnouncement(tracker, 'previous'), { key: '2026-11-15:3', open: true })
  const muted = getMilestoneAnnouncement(tracker, 'previous', false)
  assert.deepEqual(muted, { key: '2026-11-15:3', open: false })
  assert.equal(getMilestoneAnnouncement(tracker, muted.key, true), null)
  assert.equal(latestMilestone(tracker.current), 3, 'manual milestone viewing remains available')
  assert.deepEqual(tracker, original, 'confirmation dates and counts are unchanged')
  assert.deepEqual(getMilestoneAnnouncement({ ...tracker, today: '2026-11-19', current: 7 }, muted.key, true), { key: '2026-11-19:7', open: true })
})

test('loading, errors, pending saves, unconfirmed dates and ordinary days do not celebrate automatically', () => {
  const tracker = { today: '2026-11-15', current: 3, message: 'Confirmed', recordedToday: true }
  for (const changes of [{ loading: true }, { error: 'Synthetic failure' }, { saving: true }, { message: '' }, { recordedToday: false }, { current: 4 }]) {
    assert.equal(getMilestoneAnnouncement({ ...tracker, ...changes }, 'previous'), null)
  }
})
