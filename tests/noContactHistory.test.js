import test from 'node:test'
import assert from 'node:assert/strict'
import { validActivityDate, normalizeConfirmationDates, hasVisitGap } from '../src/utils/noContactHistory.js'
import { createActivityService } from '../src/utils/activityRequests.js'
import { calculateStreaks } from '../src/utils/streaks.js'

test('past-day selection validates calendar dates and future dates, sorts and deduplicates', () => {
  assert.equal(validActivityDate('2024-02-29'), true)
  for (const value of ['2026-02-29', '2026-11-31', '2026-1-01', null, '0000-01-01', 'infinity']) assert.equal(validActivityDate(value), false)
  assert.deepEqual(normalizeConfirmationDates(['2026-11-14', '2026-11-13', '2026-11-14'], '2026-11-15'), ['2026-11-13', '2026-11-14'])
  for (const dates of [[], null, ['2026-11-16'], ['2026-02-30'], Array(367).fill('2026-11-14')]) {
    assert.throws(() => normalizeConfirmationDates(dates, '2026-11-15'))
  }
})

test('welcome back uses an actual gap in app visits, not missing moods or no-contact records', () => {
  assert.equal(hasVisitGap([], '2026-11-15'), false)
  assert.equal(hasVisitGap(['2026-11-15'], '2026-11-15'), false)
  assert.equal(hasVisitGap(['2026-11-14', '2026-11-15'], '2026-11-15'), false)
  assert.equal(hasVisitGap(['2026-11-12', '2026-11-15'], '2026-11-15'), true)
  assert.equal(hasVisitGap(['2026-11-16', 'bad'], '2026-11-15'), false)
  assert.equal(hasVisitGap(['2026-10-31'], '2026-11-02'), true)
})

test('backfill sends dates only, forwards cancellation, and verifies the complete response', async () => {
  const calls = []
  const controller = new AbortController()
  const service = createActivityService({ rpc(name, parameters) {
    calls.push({ name, parameters })
    return { abortSignal(signal) {
      assert.equal(signal, controller.signal)
      return Promise.resolve({ data: parameters.confirmed_dates, error: null })
    } }
  } })
  assert.deepEqual(await service.confirmNoContactDates(['2026-11-14', '2026-11-13', '2026-11-14'], '2026-11-15', controller.signal), ['2026-11-13', '2026-11-14'])
  assert.deepEqual(calls, [{ name: 'confirm_no_contact_dates', parameters: { confirmed_dates: ['2026-11-13', '2026-11-14'] } }])
  await assert.rejects(service.confirmNoContactDates(['2026-11-16'], '2026-11-15'))
  assert.equal(calls.length, 1)
  for (const response of [{ data: ['2026-11-12'] }, { data: [] }, { error: new Error('Offline') }]) {
    const failed = createActivityService({ rpc: () => Promise.resolve(response) })
    await assert.rejects(failed.confirmNoContactDates(['2026-11-14'], '2026-11-15'))
  }
})

test('filling gaps joins no-contact days without altering the separate app visit history', () => {
  const visits = ['2026-11-12', '2026-11-15']
  assert.equal(calculateStreaks(visits, '2026-11-15').currentStreak, 1)
  assert.equal(calculateStreaks([...visits, '2026-11-13', '2026-11-14', '2026-11-14'], '2026-11-15').currentStreak, 4)
  assert.equal(calculateStreaks(visits, '2026-11-15').currentStreak, 1)
})
