import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

async function worker() {
  const handlers = {}
  const shown = []
  const opened = []
  const self = {
    location: { origin: 'https://closuree.vercel.app' },
    registration: { showNotification: async (...args) => shown.push(args) },
    clients: { matchAll: async () => [], openWindow: async (url) => opened.push(url) },
    addEventListener: (name, callback) => { handlers[name] = callback },
  }
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), { self, URL })
  return { handlers, shown, opened, self }
}

test('push worker shows generic text rather than exposing incoming payload details', async () => {
  const { handlers, shown } = await worker()
  let pending
  handlers.push({ data: { json: () => ({ body: 'private story text' }) }, waitUntil: (promise) => { pending = promise } })
  await pending
  assert.equal(shown.length, 1)
  assert.equal(shown[0][0], 'A little space for you')
  assert.equal(shown[0][1].body, 'Come back to Closure whenever you are ready.')
  assert.equal(shown[0][1].data.url, '/today')
})
test('notification clicks open only the app route or focus an existing app window', async () => {
  const { handlers, opened, self } = await worker()
  let pending
  let closed = 0
  const event = { notification: { close: () => closed++, data: { url: 'https://evil.test' } }, waitUntil: (promise) => { pending = promise } }
  handlers.notificationclick(event)
  await pending
  assert.deepEqual(opened, ['/today'])
  let focused = false
  self.clients.matchAll = async () => [{ url: 'https://closuree.vercel.app/journal', focus: async () => { focused = true } }]
  handlers.notificationclick(event)
  await pending
  assert.equal(focused, true)
  assert.equal(opened.length, 1)
  assert.equal(closed, 2)
})
