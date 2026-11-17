import test from 'node:test'
import assert from 'node:assert/strict'
import { validActivityDate, normalizeConfirmationDates, hasVisitGap, confirmationDateRange, confirmationDaysEndingOn } from '../src/utils/noContactHistory.js'
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

test('inclusive ranges cover pre-app dates, leap days and year boundaries without local DST drift', () => {
  assert.deepEqual(confirmationDateRange('2024-02-28', '2024-03-01', '2026-11-17'), ['2024-02-28', '2024-02-29', '2024-03-01'])
  assert.deepEqual(confirmationDateRange('2025-12-31', '2026-01-02', '2026-11-17'), ['2025-12-31', '2026-01-01', '2026-01-02'])
  assert.deepEqual(confirmationDateRange('2026-11-17', '2026-11-17', '2026-11-17'), ['2026-11-17'])
  assert.equal(confirmationDateRange('2024-01-01', '2024-12-31', '2026-11-17').length, 366)
  assert.equal(confirmationDateRange('2026-10-24', '2026-10-26', '2026-11-17').length, 3)
  for (const [start, end] of [['2026-11-18', '2026-11-19'], ['2026-11-17', '2026-11-16'], ['2026-02-30', '2026-03-01'], ['2024-01-01', '2025-01-01']]) {
    assert.throws(() => confirmationDateRange(start, end, '2026-11-17'))
  }
})

test('consecutive-day count includes the chosen end date, validates whole numbers and previews the same range', () => {
  assert.deepEqual(confirmationDaysEndingOn('3', '2026-11-17', '2026-11-17'), ['2026-11-15', '2026-11-16', '2026-11-17'])
  assert.deepEqual(confirmationDaysEndingOn('1', '2026-11-16', '2026-11-17'), ['2026-11-16'])
  const month = confirmationDaysEndingOn('30', '2026-11-17', '2026-11-17')
  assert.equal(month[0], '2026-10-19')
  assert.equal(month.length, 30)
  for (const count of ['', '1.5', '-1', '0', '367', '1e2', 'Infinity']) {
    assert.throws(() => confirmationDaysEndingOn(count, '2026-11-17', '2026-11-17'))
  }
  assert.throws(() => confirmationDaysEndingOn('2', '2026-11-18', '2026-11-17'))
  assert.throws(() => confirmationDaysEndingOn('2', '0001-01-01', '2026-11-17'))
})
