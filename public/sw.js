// Push only: this worker never caches pages, API responses or private writing.
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
