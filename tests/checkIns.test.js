import test from 'node:test'
import assert from 'node:assert/strict'

import { getLocalDate } from '../src/utils/dates.js'
import { createCheckInService } from '../src/utils/checkInRequests.js'

function fakeClient(response) {
  const calls = []
  const query = {
    select(...args) {
      calls.push(['select', ...args])
      return this
    },
    eq(...args) {
      calls.push(['eq', ...args])
      return this
    },
    abortSignal(signal) {
      calls.push(['abortSignal', signal])
      return this
    },
    upsert(...args) {
      calls.push(['upsert', ...args])
      return this
    },
    async maybeSingle() {
      return response
    },
    async single() {
      return response
    },
  }

  return {
    calls,
    service: createCheckInService({
      from(table) {
        calls.push(['from', table])
        return query
      },
    }),
  }
}

test('Lagos changes date at its local midnight rather than UTC midnight', () => {
  assert.equal(getLocalDate('Africa/Lagos', new Date('2026-11-01T22:59:59Z')), '2026-11-01')
  assert.equal(getLocalDate('Africa/Lagos', new Date('2026-11-01T23:00:00Z')), '2026-11-02')
})

test('the same instant can belong to different dates in different timezones', () => {
  const instant = new Date('2026-11-02T00:30:00Z')

  assert.equal(getLocalDate('UTC', instant), '2026-11-02')
  assert.equal(getLocalDate('America/Los_Angeles', instant), '2026-11-01')
})

test('daylight-saving fallback does not create another local day', () => {
  assert.equal(getLocalDate('America/New_York', new Date('2026-11-01T05:30:00Z')), '2026-11-01')
  assert.equal(getLocalDate('America/New_York', new Date('2026-11-01T06:30:00Z')), '2026-11-01')
})

test('date calculation handles leap days and year boundaries', () => {
  assert.equal(getLocalDate('UTC', new Date('2028-02-29T12:00:00Z')), '2028-02-29')
  assert.equal(getLocalDate('Africa/Lagos', new Date('2026-12-31T23:00:00Z')), '2027-01-01')
})

test('invalid timezones fail explicitly rather than silently selecting another date', () => {
  assert.throws(() => getLocalDate('Invalid/Timezone'), RangeError)
})

test('loading requests only the specified owner and local date', async () => {
  const { service, calls } = fakeClient({ data: null, error: null })
  const controller = new AbortController()

  assert.equal(await service.getCheckIn('user-a', '2026-11-01', controller.signal), null)
  assert.ok(calls.some((call) => call[0] === 'from' && call[1] === 'check_ins'))
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'user-a'))
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'check_in_date' && call[2] === '2026-11-01'))
  assert.ok(calls.some((call) => call[0] === 'abortSignal' && call[1] === controller.signal))
})

test('loading failure is not misreported as an empty day', async () => {
  const error = new Error('Read denied')
  const { service } = fakeClient({ data: null, error })

  await assert.rejects(service.getCheckIn('user-a', '2026-11-01'), error)
})

test('save supports multiple moods and an empty optional note', async () => {
  const saved = { id: 'check-in-a', moods: ['sad', 'hopeful'], note: '' }
  const { service, calls } = fakeClient({ data: saved, error: null })

  const result = await service.saveCheckIn({
    userId: 'user-a',
    date: '2026-11-01',
    moods: ['sad', 'hopeful'],
    note: '',
  })

  assert.equal(result, saved)
  assert.deepEqual(calls.find((call) => call[0] === 'upsert'), [
    'upsert',
    {
      user_id: 'user-a',
      check_in_date: '2026-11-01',
      moods: ['sad', 'hopeful'],
      note: '',
    },
    { onConflict: 'user_id,check_in_date' },
  ])
})

test('repeat saves use the same owner/date conflict target and preserve note contents', async () => {
  const { service, calls } = fakeClient({ data: { id: 'same-row' }, error: null })
  const input = { userId: 'user-a', date: '2026-11-01', moods: ['numb'], note: ' First line\nSecond line ' }

  await service.saveCheckIn(input)
  await service.saveCheckIn({ ...input, moods: ['relieved', 'hopeful'] })

  const saves = calls.filter((call) => call[0] === 'upsert')
  assert.equal(saves.length, 2)
  assert.equal(saves[1][1].note, input.note)
  assert.equal(saves[0][1].check_in_date, saves[1][1].check_in_date)
  assert.deepEqual(saves[0][2], saves[1][2])
})

test('save failure is passed back so the form cannot announce success', async () => {
  const error = new Error('Write denied')
  const { service } = fakeClient({ data: null, error })

  await assert.rejects(service.saveCheckIn({
    userId: 'user-a',
    date: '2026-11-01',
    moods: ['sad'],
    note: 'Keep this draft',
  }), error)
})
