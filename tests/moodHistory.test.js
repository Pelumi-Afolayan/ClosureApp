import test from 'node:test'
import assert from 'node:assert/strict'
import { getLocalDate } from '../src/utils/dates.js'
import { createCheckInService } from '../src/utils/checkInRequests.js'
import { moodGroup, moodPeriod, moodHistoryRange, moodHistorySummary, shiftMoodDate } from '../src/utils/moodHistory.js'

const today = '2026-11-13'
const entry = (date, moods, note = '') => ({ id: date, check_in_date: date, moods, note })

test('mood groups treat combinations from both groups as neutral mixed days', () => {
  assert.equal(moodGroup(['sad', 'angry', 'numb']), 'heavier')
  assert.equal(moodGroup(['hopeful', 'relieved']), 'lighter')
  assert.equal(moodGroup(['sad', 'angry', 'hopeful']), 'mixed')
  assert.equal(moodGroup(['numb', 'relieved', 'hopeful']), 'mixed')
  assert.equal(moodGroup([]), 'neutral')
  assert.equal(moodGroup(['unknown']), 'neutral')
})

test('empty history includes exactly one neutral blank for every calendar day', () => {
  for (const days of [7, 30, 90]) {
    const result = moodHistorySummary([], today, days)
    assert.equal(result.cells.length, days)
    assert.equal(result.cells.at(-1).date, today)
    assert.ok(result.cells.every(cell => cell.entry === null && cell.group === 'blank'))
    assert.equal(result.savedDays, 0)
    assert.equal(result.summary, 'No check-ins saved in this period.')
    assert.equal(result.comparison, null)
  }
})

test('sparse history keeps gaps blank and notes untouched without inventing moods', () => {
  const rows = [entry(today, ['sad', 'hopeful'], ' First line\nSecond line ')]
  const original = structuredClone(rows)
  const result = moodHistorySummary(rows, today, 7)
  assert.equal(result.savedDays, 1)
  assert.equal(result.lighterDays, 1)
  assert.equal(result.cells.filter(cell => cell.group === 'blank').length, 6)
  assert.equal(result.cells.at(-1).group, 'mixed')
  assert.equal(result.cells.at(-1).entry.note, rows[0].note)
  assert.equal(result.summary, 'Hopeful or relieved on 1 of the last 7 days.')
  assert.equal(result.comparison, null)
  assert.deepEqual(rows, original)
})

test('each date counts once even if moods or source rows are duplicated', () => {
  const row = entry(today, ['hopeful', 'hopeful', 'relieved'])
  const result = moodHistorySummary([row, row], today, 7)
  assert.equal(result.savedDays, 1)
  assert.equal(result.lighterDays, 1)
})

test('full history groups each saved day and includes only this period', () => {
  const rows = Array.from({ length: 30 }, (_, index) => entry(shiftMoodDate(today, -index), index % 2 ? ['sad'] : ['relieved']))
  rows.push(entry(shiftMoodDate(today, 1), ['hopeful']))
  rows.push(entry(shiftMoodDate(today, -30), ['hopeful']))
  const result = moodHistorySummary(rows, today, 30)
  assert.equal(result.savedDays, 30)
  assert.equal(result.lighterDays, 15)
  assert.equal(result.cells.filter(cell => cell.group === 'heavier').length, 15)
  assert.equal(result.cells.filter(cell => cell.group === 'lighter').length, 15)
  assert.equal(result.comparison, null)
})

test('comparison needs at least half the days with check-ins in both periods', () => {
  for (const days of [7, 30, 90]) {
    const minimum = Math.ceil(days / 2)
    const current = Array.from({ length: minimum }, (_, i) => entry(shiftMoodDate(today, -i), ['hopeful']))
    const previous = Array.from({ length: minimum }, (_, i) => entry(shiftMoodDate(today, -days - i), ['sad']))
    assert.equal(moodHistorySummary([...current, ...previous.slice(1)], today, days).comparison, null)
    assert.equal(moodHistorySummary([...current.slice(1), ...previous], today, days).comparison, null)
    const result = moodHistorySummary([...current, ...previous], today, days)
    assert.equal(result.comparison, `Previous ${days} days: hopeful or relieved on 0 days, with ${minimum} check-in days saved.`)
    assert.equal(result.lighterDays, minimum)
  }
})

test('profile timezone sets today before calendar-day arithmetic, including DST and leap dates', () => {
  const instant = new Date('2026-11-01T23:30:00Z')
  assert.equal(moodPeriod([], getLocalDate('Africa/Lagos', instant), 7).end, '2026-11-02')
  assert.equal(moodPeriod([], getLocalDate('America/Los_Angeles', instant), 7).end, '2026-11-01')
  assert.deepEqual(moodPeriod([], '2024-03-02', 7).cells.map(cell => cell.date), [
    '2024-02-25','2024-02-26','2024-02-27','2024-02-28','2024-02-29','2024-03-01','2024-03-02',
  ])
  assert.equal(shiftMoodDate('2026-01-01', -1), '2025-12-31')
})

test('one 180-day query range covers all three views and all previous periods', () => {
  const range = moodHistoryRange(today)
  assert.equal(range.end, today)
  assert.equal(range.start, shiftMoodDate(today, -179))
  for (const days of [7, 30, 90]) {
    const current = moodPeriod([], today, days)
    const previous = moodPeriod([], shiftMoodDate(current.start, -1), days)
    assert.ok(previous.start >= range.start)
  }
})

test('invalid dates and unsupported period lengths fail explicitly', () => {
  assert.throws(() => shiftMoodDate('2026-02-30', 0), /Invalid calendar/)
  assert.throws(() => shiftMoodDate('wrong', 0), /Invalid calendar/)
  assert.throws(() => moodPeriod([], today, 14), /7, 30 or 90/)
})

function fake(response) {
  const calls = []
  const query = {}
  for (const method of ['select','eq','gte','lte','order','abortSignal']) {
    query[method] = (...args) => { calls.push([method, ...args]); return query }
  }
  query.then = (resolve, reject) => Promise.resolve(response).then(resolve, reject)
  const service = createCheckInService({ from: table => { calls.push(['from', table]); return query } })
  return { calls, service }
}

test('history uses one owner-filtered ranged read and forwards cancellation', async () => {
  const rows = [entry(today, ['hopeful'], 'Fixture note')]
  const { calls, service } = fake({ data: rows, error: null })
  const signal = new AbortController().signal
  const { start, end } = moodHistoryRange(today)
  assert.deepEqual(await service.getCheckInsInRange('owner', start, end, signal), rows)
  assert.equal(calls.filter(call => call[0] === 'from').length, 1)
  assert.deepEqual(calls.find(call => call[0] === 'eq'), ['eq','user_id','owner'])
  assert.deepEqual(calls.find(call => call[0] === 'gte'), ['gte','check_in_date',start])
  assert.deepEqual(calls.find(call => call[0] === 'lte'), ['lte','check_in_date',end])
  assert.deepEqual(calls.find(call => call[0] === 'abortSignal'), ['abortSignal',signal])
  assert.deepEqual(calls.find(call => call[0] === 'select'), ['select','id, check_in_date, moods, note'])
})

test('failed history reads are not reported as an empty period', async () => {
  const { service } = fake({ data: null, error: new Error('unavailable') })
  await assert.rejects(service.getCheckInsInRange('owner', '2026-01-01', today), /unavailable/)
})
