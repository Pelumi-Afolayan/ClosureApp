import test from 'node:test'
import assert from 'node:assert/strict'
import { createNotificationActions } from '../src/utils/notificationRequests.js'

function setup(options = {}) {
  const calls = []
  const state = { permission: 'granted', saved: { reminder_time: '19:00', device_id: 'device-1' }, ...options }
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/test-device',
    toJSON: () => ({ endpoint: subscription.endpoint, keys: { auth: 'fixture', p256dh: 'fixture' } }),
    unsubscribe: async () => {
      calls.push(['unsubscribe'])
      if (state.unsubscribeError) throw new Error('fixture failure')
      state.noSubscription = true
      return true
    },
  }
  const registration = {
    pushManager: { getSubscription: async () => state.noSubscription ? null : subscription },
    getNotifications: async () => [{ close: () => calls.push(['close notification']) }],
  }
  const client = {
    from(table) {
      const query = {
        filters: [], operation: '',
        select() { this.operation = 'select'; return this },
        delete() { this.operation = 'delete'; return this },
        eq(...args) { this.filters.push(args); return this },
        abortSignal(signal) { this.signal = signal; return this },
        async maybeSingle() { calls.push(['select', table, this.filters]); return { data: state.saved, error: null } },
        then(resolve, reject) {
          calls.push([this.operation, table, this.filters])
          if (state.deleteHang) return new Promise(() => {})
          return Promise.resolve({ error: state.deleteError ? new Error('fixture failure') : null }).then(resolve, reject)
        },
      }
      return query
    },
    rpc(name, params) {
      calls.push(['rpc', name, params])
      return { abortSignal: () => state.rpcPromise || Promise.resolve({ error: state.rpcError ? new Error('fixture failure') : null }) }
    },
    auth: { signOut: async (config) => { calls.push(['signOut', config]); return { error: state.authError || null } } },
  }
  const browser = {
    deviceId: () => 'device-1',
    registration: async () => registration,
    permission: () => state.permission,
    requestPermission: async () => { calls.push(['requestPermission']); return state.permissionPromise || state.permission },
    subscribe: async () => { calls.push(['subscribe']); state.noSubscription = false; return subscription },
  }
  return { calls, state, client, browser, subscription, actions: createNotificationActions(client, browser, { timeoutMs: 20 }) }
}

test('logout unsubscribes and deletes only this owner/device before ending the session', async () => {
  const { actions, calls } = setup()
  await actions.signOutWithReminderCleanup('account-a', { scope: 'global' })
  assert.equal(calls.at(-1)[0], 'signOut')
  assert.ok(calls.some(([name]) => name === 'unsubscribe'))
  assert.ok(calls.some(([name]) => name === 'close notification'))
  const deletes = calls.filter(([name]) => name === 'delete')
  assert.ok(deletes.every(([, , filters]) => filters.some(([key, value]) => key === 'user_id' && value === 'account-a')))
  assert.ok(deletes.some(([, , filters]) => filters.some(([key, value]) => key === 'device_id' && value === 'device-1')))
})

test('database deletion failure does not prevent unsubscribing or signing out', async () => {
  const { actions, calls } = setup({ deleteError: true })
  await actions.signOutWithReminderCleanup('a', { scope: 'local' })
  assert.ok(calls.some(([name]) => name === 'unsubscribe'))
  assert.equal(calls.at(-1)[0], 'signOut')
})

test('unsubscribe failure does not prevent database cleanup or signing out', async () => {
  const { actions, calls } = setup({ unsubscribeError: true })
  await actions.signOutWithReminderCleanup('a', { scope: 'local' })
  assert.ok(calls.some(([name]) => name === 'delete'))
  assert.equal(calls.at(-1)[0], 'signOut')
})

test('stalled cleanup times out rather than hanging sign-out', async () => {
  const { actions, calls } = setup({ deleteHang: true })
  await actions.signOutWithReminderCleanup('a', { scope: 'local' })
  assert.equal(calls.at(-1)[0], 'signOut')
})

test('an actual auth sign-out error is returned rather than swallowed with cleanup errors', async () => {
  const error = new Error('Auth unavailable')
  const { actions } = setup({ deleteError: true, authError: error })
  assert.equal((await actions.signOutWithReminderCleanup('a', { scope: 'global' })).error, error)
})

test('revoked permission reports off and removes stale rows even if subscription lookup throws', async () => {
  const { actions, browser, calls } = setup({ permission: 'denied' })
  browser.registration = async () => { throw new Error('No permission') }
  const result = await actions.getReminder('a')
  assert.equal(result.enabled, false)
  assert.ok(calls.some(([name]) => name === 'delete'))
  assert.ok(!calls.some(([name]) => name === 'requestPermission'))
})

test('missing subscription cleans the saved device row without affecting other devices', async () => {
  const { actions, calls } = setup({ noSubscription: true })
  assert.deepEqual(await actions.getReminder('a'), { enabled: false, cleanupPending: false })
  assert.equal(calls.filter(([name]) => name === 'delete').length, 1)
  assert.deepEqual(calls.find(([name]) => name === 'delete')[2], [['user_id', 'a'], ['device_id', 'device-1']])
})

test('reconciliation remains off if remote cleanup is pending', async () => {
  const { actions } = setup({ permission: 'denied', deleteError: true })
  assert.deepEqual(await actions.getReminder('a'), { enabled: false, cleanupPending: true })
})

test('legacy active subscription gets a device binding, while already-bound reads stay read-only', async () => {
  const legacy = setup({ saved: { reminder_time: '18:30', device_id: null } })
  assert.equal((await legacy.actions.getReminder('a')).enabled, true)
  assert.equal(legacy.calls.find(([name]) => name === 'rpc')[1], 'register_push_reminder')
  const bound = setup()
  assert.equal((await bound.actions.getReminder('a')).enabled, true)
  assert.ok(!bound.calls.some(([name]) => name === 'rpc'))
})

test('enabling uses the verified RPC without a caller-supplied user ID or direct upsert', async () => {
  const { actions, calls, subscription } = setup()
  await actions.enableReminder('new-account', '20:15')
  const [, name, params] = calls.find(([kind]) => kind === 'rpc')
  assert.equal(name, 'register_push_reminder')
  assert.equal(params.p_endpoint, subscription.endpoint)
  assert.equal(params.p_subscription.endpoint, subscription.endpoint)
  assert.equal(params.p_device_id, 'device-1')
  assert.equal(params.p_reminder_time, '20:15')
  assert.ok(!JSON.stringify(params).includes('new-account'))
})

test('denied permission and invalid times do not register a subscription', async () => {
  const denied = setup({ permission: 'denied' })
  await assert.rejects(denied.actions.enableReminder('a', '19:00'), /blocked/)
  assert.ok(!denied.calls.some(([name]) => name === 'subscribe' || name === 'rpc'))
  const invalid = setup()
  await assert.rejects(invalid.actions.enableReminder('a', '24:00'), /valid reminder time/)
  assert.equal(invalid.calls.length, 0)
})

test('logout cancels setup waiting for browser permission without a late registration', async () => {
  let resolvePermission
  const permissionPromise = new Promise((resolve) => { resolvePermission = resolve })
  const { actions, calls } = setup({ permissionPromise })
  const pending = actions.enableReminder('a', '19:00')
  const rejected = assert.rejects(pending, /cancelled/)
  await actions.signOutWithReminderCleanup('a', { scope: 'global' })
  resolvePermission('granted')
  await rejected
  assert.ok(!calls.some(([name]) => name === 'rpc'))
})

test('a stale Settings read cannot unsubscribe a newly enabled reminder', async () => {
  const { actions, browser, calls } = setup({ noSubscription: true })
  let resolveRegistration
  let reading = true
  browser.registration = () => reading
    ? new Promise((resolve) => { resolveRegistration = resolve })
    : Promise.resolve(null)
  const staleRead = actions.getReminder('a')
  const rejected = assert.rejects(staleRead, /settings changed/)
  await Promise.resolve()
  await actions.enableReminder('a', '19:00')
  reading = false
  resolveRegistration({ pushManager: { getSubscription: async () => null } })
  await rejected
  assert.ok(!calls.some(([name]) => name === 'unsubscribe'))
})

test('new setup waits for older cleanup before subscribing', async () => {
  const { actions, subscription, calls } = setup()
  let releaseUnsubscribe
  subscription.unsubscribe = () => new Promise((resolve) => {
    releaseUnsubscribe = () => { calls.push(['old unsubscribe finished']); resolve(true) }
  })
  const cleanup = actions.disableReminder('a')
  while (!releaseUnsubscribe) await new Promise((resolve) => setImmediate(resolve))
  const setupReminder = actions.enableReminder('b', '19:00')
  await Promise.resolve()
  assert.ok(!calls.some(([name]) => name === 'subscribe'))
  releaseUnsubscribe()
  await cleanup
  await setupReminder
  assert.ok(calls.findIndex(([name]) => name === 'old unsubscribe finished') < calls.findIndex(([name]) => name === 'subscribe'))
})
