import test from 'node:test'
import assert from 'node:assert/strict'
import { validPushEndpoint, deliverReminders } from '../supabase/functions/send-reminders/pushDelivery.js'
const endpoint = 'https://fcm.googleapis.com/fcm/send/example'
const row = { endpoint, subscription: { endpoint, keys: { auth: 'x', p256dh: 'y' } }, ttl: 600 }
test('push allowlist rejects arbitrary hosts, credentials, ports and deceptive subdomains', () => {
  assert.equal(validPushEndpoint(endpoint), true)
  assert.equal(validPushEndpoint('https://web.push.apple.com/abc'), true)
  for (const url of ['http://fcm.googleapis.com/x', 'https://localhost/x', 'https://127.0.0.1/', 'https://fcm.googleapis.com.evil.test/x', 'https://user@fcm.googleapis.com/x', 'https://fcm.googleapis.com:444/x', 'bad']) assert.equal(validPushEndpoint(url), false)
})
test('sender uses generic content, bounded lifetime and removes expired devices only', async () => {
  let payload
  const removed = []
  let index = 0
  const result = await deliverReminders([row, row, row, row], async (sub, body, options) => {
    payload = body
    assert.equal(options.TTL, 600)
    index++
    if (index > 1) throw { statusCode: index === 2 ? 410 : index === 3 ? 404 : 503 }
  }, async (url) => removed.push(url))
  assert.deepEqual(result, { sent: 1, expired: 2, failed: 1 })
  assert.equal(removed.length, 2)
  assert.equal(payload, '{"kind":"daily-reminder"}')
})
test('invalid or mismatched subscription cannot cause an outbound request', async () => {
  let calls = 0
  const result = await deliverReminders([{ ...row, endpoint: 'https://localhost/x' }, { ...row, subscription: { endpoint: 'https://web.push.apple.com/other' } }], async () => calls++, async () => {})
  assert.equal(calls, 0)
  assert.equal(result.failed, 2)
})
