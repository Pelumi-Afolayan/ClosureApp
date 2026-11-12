import { supabase } from '../lib/supabase'

export const pushConfigured = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
export function supportsPush() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}
export async function getReminder(userId) {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return null
  const { data, error } = await supabase.from('push_reminders').select('reminder_time').eq('user_id', userId).eq('endpoint', subscription.endpoint).maybeSingle()
  if (error) throw error
  return data
}
export async function enableReminder(userId, time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid reminder time.')
  if (!pushConfigured || !supportsPush()) throw new Error('Reminders are not available here yet.')
  // Permission must be requested directly from the user's button press.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications are blocked. You can allow them in your browser settings.')
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const padded = key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4)
  const applicationServerKey = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
  const { error } = await supabase.from('push_reminders').upsert({
    user_id: userId, endpoint: subscription.endpoint, subscription: subscription.toJSON(), reminder_time: time,
  }, { onConflict: 'endpoint' })
  if (error) throw new Error('Could not save this reminder. Check your connection and the reminder setup.')
}
export async function disableReminder(userId) {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  const { error } = await supabase.from('push_reminders').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint)
  if (error) throw error
  await subscription.unsubscribe()
}
export async function testReminder() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration || Notification.permission !== 'granted') throw new Error('Enable reminders first.')
  await registration.showNotification('Your Closure reminder is ready', {
    body: 'This is a test notification on this device.', icon: '/icons/closure-192.png', tag: 'closure-test',
  })
}
