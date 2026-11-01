import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateStreaks } from '../src/utils/streaks.js'
import { createCheckInService } from '../src/utils/checkInRequests.js'

const today = '2026-11-05'

test('no saved days gives zero current and longest streaks', () => {
  assert.deepEqual(calculateStreaks([], today), {
    currentStreak: 0,
    longestStreak: 0,
    checkedInToday: false,
  })
})

test('a first check-in earns one day', () => {
  assert.deepEqual(calculateStreaks([today], today), {
    currentStreak: 1,
    longestStreak: 1,
    checkedInToday: true,
  })
})

test('yesterday keeps the streak alive until today has been missed', () => {
  const dates = ['2026-11-02', '2026-11-03', '2026-11-04']

  assert.equal(calculateStreaks(dates, '2026-11-05').currentStreak, 3)
  assert.equal(calculateStreaks(dates, '2026-11-06').currentStreak, 0)
  assert.equal(calculateStreaks(dates, '2026-11-06').longestStreak, 3)
})

test('duplicate dates and ordering cannot inflate streaks', () => {
  assert.deepEqual(calculateStreaks([
    '2026-11-05', '2026-11-03', '2026-11-04', '2026-11-05',
  ], today), {
    currentStreak: 3,
    longestStreak: 3,
    checkedInToday: true,
  })
})

test('an old longest streak remains when the current streak restarts', () => {
  assert.deepEqual(calculateStreaks([
    '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-11-05',
  ], today), {
    currentStreak: 1,
    longestStreak: 4,
    checkedInToday: true,
  })
})

test('future records do not earn streak credit', () => {
  assert.deepEqual(calculateStreaks(['2026-11-06', '2026-11-07'], today), {
    currentStreak: 0,
    longestStreak: 0,
    checkedInToday: false,
  })
})

test('runs cross month and year boundaries', () => {
  assert.equal(calculateStreaks(['2026-10-31', '2026-11-01'], '2026-11-01').currentStreak, 2)
  assert.equal(calculateStreaks(['2026-12-31', '2027-01-01'], '2027-01-01').currentStreak, 2)
})

test('leap-day and non-leap-day boundaries are counted correctly', () => {
  assert.equal(calculateStreaks(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01').currentStreak, 3)
  assert.equal(calculateStreaks(['2027-02-28', '2027-03-01'], '2027-03-01').currentStreak, 2)
})

function historyClient(records, failedOffset = null) {
  const calls = []
  return {
    calls,
    service: createCheckInService({
      from(table) {
        const call = { table }
        calls.push(call)
        return {
          select(columns) { call.columns = columns; return this },
          eq(column, value) { call.filter = [column, value]; return this },
          order(column, options) { call.order = [column, options]; return this },
          range(start, end) { call.range = [start, end]; return this },
          abortSignal(signal) { call.signal = signal; return this },
          then(resolve, reject) {
            const [start, end] = call.range
            const response = start === failedOffset
              ? { data: null, error: new Error('History unavailable') }
              : { data: records.slice(start, end + 1), error: null }
            return Promise.resolve(response).then(resolve, reject)
          },
        }
      },
    }),
  }
}

test('history pages beyond 1,000 records and requests only the owner dates', async () => {
  const records = Array.from({ length: 1201 }, (_, index) => ({
    check_in_date: new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10),
  }))
  const { service, calls } = historyClient(records)
  const controller = new AbortController()
  const dates = await service.getCheckInDates('account-a', controller.signal)

  assert.equal(dates.length, 1201)
  assert.equal(dates.at(-1), records.at(-1).check_in_date)
  assert.deepEqual(calls.map((call) => call.range), [[0, 499], [500, 999], [1000, 1499]])
  for (const call of calls) {
    assert.equal(call.table, 'check_ins')
    assert.equal(call.columns, 'check_in_date')
    assert.deepEqual(call.filter, ['user_id', 'account-a'])
    assert.equal(call.signal, controller.signal)
  }
})

test('failure on a later history page rejects instead of returning a partial streak', async () => {
  const { service } = historyClient(Array.from({ length: 600 }, () => ({ check_in_date: today })), 500)

  await assert.rejects(service.getCheckInDates('account-a'), /History unavailable/)
})

test('an exact full history page requests the next page before finishing', async () => {
  const { service, calls } = historyClient(Array.from({ length: 500 }, () => ({ check_in_date: today })))

  assert.equal((await service.getCheckInDates('account-a')).length, 500)
  assert.equal(calls.length, 2)
})
