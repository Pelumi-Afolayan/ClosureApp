import { supabase } from '../lib/supabase'
import { createNotificationActions } from '../utils/notificationRequests'

export const pushConfigured = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
const deviceKey = 'closure.push-device-id'

export function supportsPush() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

const browser = {
  deviceId() {
    // An opaque identifier only: no user IDs, emails, writing or subscription keys.
    try {
      let id = window.localStorage.getItem(deviceKey)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) {
        id = window.crypto.randomUUID()
        window.localStorage.setItem(deviceKey, id)
      }
      return id
    } catch {
      throw new Error('Reminder settings need site storage on this device.')
    }
  },
  registration: () => 'serviceWorker' in navigator ? navigator.serviceWorker.getRegistration('/') : null,
  permission: () => 'Notification' in window ? Notification.permission : 'denied',
  requestPermission: () => Notification.requestPermission(),
  async subscribe() {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
    const padded = key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4)
    const applicationServerKey = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
    return await registration.pushManager.getSubscription() || registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
  },
}

const actions = createNotificationActions(supabase, browser)
export const getReminder = actions.getReminder
export const disableReminder = actions.disableReminder
export const signOutWithReminderCleanup = actions.signOutWithReminderCleanup

export async function enableReminder(userId, time) {
  if (!pushConfigured || !supportsPush()) throw new Error('Reminders are not available here yet.')
  return actions.enableReminder(userId, time)
}

export async function testReminder() {
  const registration = await browser.registration()
  if (!registration || browser.permission() !== 'granted') throw new Error('Enable reminders first.')
  await registration.showNotification('Your Closure reminder is ready', {
    body: 'This is a test notification on this device.', icon: '/icons/closure-192.png', tag: 'closure-test',
  })
}
