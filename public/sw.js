// Cache Storage contains ONLY the build's same-origin public static allowlist.
// NEVER cache Supabase/API/auth responses, navigation URLs, tokens or private data.
// Private drafts use a separate, user-scoped IndexedDB store in the app, not here.
const shell = self.__CLOSURE_SHELL__
const cacheName = shell ? `closure-shell-${shell.version}` : null
const assets = new Set(shell?.assets || [])

self.addEventListener('install', event => {
  if (!shell) return
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName)
    // Fetch only fixed public files, never a current URL with auth parameters.
    await cache.addAll(shell.assets.map(url => new Request(url, { credentials: 'omit', cache: 'reload' })))
  })())
  // A new worker waits. Only the explicit refresh button asks it to activate.
})
self.addEventListener('activate', event => {
  if (!shell) return
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('closure-shell-') && name !== cacheName) await caches.delete(name)
    }
    await self.clients.claim()
  })())
})
self.addEventListener('message', event => {
  if (event.data?.type === 'CLOSURE_ACTIVATE_UPDATE') self.skipWaiting()
})
self.addEventListener('fetch', event => {
  if (!shell || event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (event.request.mode === 'navigate') {
    // Do not cache the navigation response or its URL. An offline route gets
    // the generic index.html that was fetched without credentials at install.
    event.respondWith(fetch(event.request).catch(async () => (await caches.open(cacheName)).match('/index.html')))
    return
  }
  if (url.search || !assets.has(url.pathname) || url.pathname === '/index.html') return
  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    return await cache.match(url.pathname) || fetch(event.request)
  })())
})

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    // A queued push must not display after this browser has unsubscribed.
    if (!await self.registration.pushManager.getSubscription()) return
    await self.registration.showNotification('A little space for you', {
      body: 'Come back to Closure whenever you are ready.',
      icon: '/icons/closure-192.png',
      badge: '/icons/closure-192.png',
      tag: 'closure-daily-reminder',
      data: { url: '/today' },
    })
  })())
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const tab = tabs.find((client) => new URL(client.url).origin === self.location.origin)
    if (tab) { await tab.focus(); return }
    await self.clients.openWindow('/today')
  })())
})

// Do not renew anonymously or put account credentials in a service worker.
// Stop any replacement subscription; the signed-in Settings page reconciles
// the old device row, then the user can explicitly enable reminders again.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try { await event.oldSubscription?.unsubscribe() } catch { /* Already expired. */ }
    try { await event.newSubscription?.unsubscribe() } catch { /* Reconcile on return. */ }
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const tab of tabs) {
      if (new URL(tab.url).origin === self.location.origin) {
        tab.postMessage({ type: 'CLOSURE_PUSH_SUBSCRIPTION_CHANGED' })
      }
    }
  })())
})
