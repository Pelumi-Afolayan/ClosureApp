import test from 'node:test'
import assert from 'node:assert/strict'
import { createActivityService } from '../src/utils/activityRequests.js'
import { calculateStreaks } from '../src/utils/streaks.js'
import { getActivityWeek } from '../src/utils/activityDisplay.js'
import { getLocalDate } from '../src/utils/dates.js'

function historyClient(rowsByTable, failureOffset = -1) {
  const calls = []
  const rpcCalls = []
  const client = {
    rpc(name) {
      rpcCalls.push(name)
      return Promise.resolve({ data: '2026-11-11', error: null })
    },
    from(table) {
      const call = { table }
      calls.push(call)
      return {
        select(columns) { call.columns = columns; return this },
        eq(column, value) { call.owner = [column, value]; return this },
        order(column, options) { call.order = [column, options]; return this },
        range(start, end) { call.range = [start, end]; return this },
        abortSignal(signal) { call.signal = signal; return this },
        then(resolve, reject) {
          const response = call.range[0] === failureOffset
            ? { data: null, error: new Error('History unavailable') }
            : { data: (rowsByTable[table] || []).slice(call.range[0], call.range[1] + 1), error: null }
          return Promise.resolve(response).then(resolve, reject)
        },
      }
    },
  }
  return { service: createActivityService(client), calls, rpcCalls }
}

test('app and no-contact histories use different owner-filtered tables; reading never confirms', async () => {
  const { service, calls, rpcCalls } = historyClient({
    app_visits: [{ activity_date: '2026-11-11' }], no_contact_days: [],
  })
  assert.deepEqual(await service.getActivityDates('app', 'owner-a'), ['2026-11-11'])
  assert.deepEqual(await service.getActivityDates('noContact', 'owner-a'), [])
  assert.deepEqual(calls.map((c) => c.table), ['app_visits', 'no_contact_days'])
  for (const call of calls) assert.deepEqual(call.owner, ['user_id', 'owner-a'])
  assert.deepEqual(rpcCalls, [])
})

test('recording actions use separate server functions without client-supplied owner or date', async () => {
  const calls = []
  const service = createActivityService({ rpc(...args) {
    calls.push(args)
    return Promise.resolve({ data: '2026-11-11', error: null })
  } })
  assert.equal(await service.recordAppVisit(), '2026-11-11')
  assert.equal(await service.confirmNoContact(), '2026-11-11')
  assert.deepEqual(calls, [['record_app_visit'], ['confirm_no_contact']])
})

test('RPC failures and malformed dates do not announce success', async () => {
  for (const response of [{ error: new Error('Rejected') }, { data: null, error: null }]) {
    const service = createActivityService({ rpc: () => Promise.resolve(response) })
    await assert.rejects(service.recordAppVisit())
    await assert.rejects(service.confirmNoContact())
  }
})

test('recording and reading forward cancellation signals', async () => {
  const controller = new AbortController()
  const received = []
  const service = createActivityService({ rpc: () => ({ abortSignal(signal) {
    received.push(signal)
    return Promise.resolve({ data: '2026-11-11', error: null })
  } }) })
  await service.recordAppVisit(controller.signal)
  await service.confirmNoContact(controller.signal)
  assert.deepEqual(received, [controller.signal, controller.signal])
  const history = historyClient({ app_visits: [] })
  await history.service.getActivityDates('app', 'owner-a', controller.signal)
  assert.equal(history.calls[0].signal, controller.signal)
})

test('history beyond 1,000 days is paginated without truncating streaks', async () => {
  const rows = Array.from({ length: 1201 }, (_, index) => ({ activity_date: String(index) }))
  const { service, calls } = historyClient({ app_visits: rows })
  assert.equal((await service.getActivityDates('app', 'owner-a')).length, 1201)
  assert.deepEqual(calls.map((c) => c.range), [[0, 499], [500, 999], [1000, 1499]])
})

test('an exact full page fetches the next page, and later-page errors reject partial histories', async () => {
  const rows = Array.from({ length: 500 }, () => ({ activity_date: '2026-11-11' }))
  const success = historyClient({ no_contact_days: rows })
  assert.equal((await success.service.getActivityDates('noContact', 'owner-a')).length, 500)
  assert.equal(success.calls.length, 2)
  const failed = historyClient({ no_contact_days: [...rows, ...rows] }, 500)
  await assert.rejects(failed.service.getActivityDates('noContact', 'owner-a'), /History unavailable/)
})

test('unknown tracker types never query an arbitrary table', async () => {
  const { service, calls } = historyClient({})
  await assert.rejects(service.getActivityDates('check_ins', 'owner-a'), /Unknown/)
  await assert.rejects(service.getActivityDates('constructor', 'owner-a'), /Unknown/)
  assert.deepEqual(calls, [])
})

test('app and no-contact counts stay independent and repeated dates cannot inflate them', () => {
  const app = calculateStreaks(['2026-11-10', '2026-11-11', '2026-11-11'], '2026-11-11')
  const noContact = calculateStreaks(['2026-11-11'], '2026-11-11')
  assert.equal(app.currentStreak, 2)
  assert.equal(noContact.currentStreak, 1)
  assert.equal(calculateStreaks([], '2026-11-11').currentStreak, 0)
})

test('gaps break a confirmed run; yesterday remains available to continue today', () => {
  assert.equal(calculateStreaks(['2026-11-09', '2026-11-10'], '2026-11-11').currentStreak, 2)
  assert.equal(calculateStreaks(['2026-11-09'], '2026-11-11').currentStreak, 0)
})

test('weekly strip crosses month boundaries and ignores future credit', () => {
  const week = getActivityWeek('2026-11-01', ['2026-10-31', '2026-11-01', '2026-11-02'])
  assert.equal(week[0].date, '2026-10-26')
  assert.equal(week[6].date, '2026-11-01')
  assert.equal(week.filter((d) => d.recorded).length, 2)
  assert.deepEqual(getActivityWeek(null, []), [])
  assert.deepEqual(getActivityWeek('invalid', []), [])
})

test('local midnight changes the activity day even when UTC date has not changed', () => {
  assert.equal(getLocalDate('Africa/Lagos', new Date('2026-11-10T23:30:00Z')), '2026-11-11')
})
