// Push only: this worker never caches pages, API responses or private writing.
self.addEventListener('push', (event) => {
  event.waitUntil(self.registration.showNotification('A little space for you', {
    body: 'Come back to Closure whenever you are ready.',
    icon: '/icons/closure-192.png',
    badge: '/icons/closure-192.png',
    tag: 'closure-daily-reminder',
    data: { url: '/today' },
  }))
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
