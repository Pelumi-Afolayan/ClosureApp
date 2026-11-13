// Testable reminder lifecycle; browser APIs and the Supabase client are injected.
export function createNotificationActions(client, browser, { timeoutMs = 2500 } = {}) {
  let generation = 0
  let cleanupInProgress = Promise.resolve()

  async function bounded(action) {
    const controller = new AbortController()
    let timer
    try {
      return await Promise.race([
        Promise.resolve().then(() => action(controller.signal)),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort()
            reject(new Error('Could not finish reminder cleanup.'))
          }, timeoutMs)
        }),
      ])
    } finally { clearTimeout(timer) }
  }

  async function deleteDeviceRows(userId, deviceId, endpoint) {
    const jobs = []
    if (deviceId) jobs.push(bounded(async (signal) => {
      const { error } = await client.from('push_reminders').delete()
        .eq('user_id', userId).eq('device_id', deviceId).abortSignal(signal)
      if (error) throw error
    }))
    // Also covers subscriptions created before device_id was introduced.
    if (endpoint) jobs.push(bounded(async (signal) => {
      const { error } = await client.from('push_reminders').delete()
        .eq('user_id', userId).eq('endpoint', endpoint).abortSignal(signal)
      if (error) throw error
    }))
    const results = await Promise.allSettled(jobs)
    if (results.some((result) => result.status === 'rejected')) throw new Error('Could not remove the saved reminder yet.')
  }

  async function performCleanup(userId) {
    let deviceId
    try { deviceId = browser.deviceId() } catch { /* Still unsubscribe if storage is unavailable. */ }
    let registration
    let subscription
    let lookupError
    try {
      registration = await bounded(() => browser.registration())
      subscription = await bounded(() => registration?.pushManager.getSubscription())
    } catch (error) { lookupError = error }
    const results = await Promise.allSettled([
      deleteDeviceRows(userId, deviceId, subscription?.endpoint),
      bounded(async () => {
        if (subscription) {
          const removed = await subscription.unsubscribe()
          if (!removed) throw new Error('Could not unsubscribe this device yet.')
        }
        const notifications = await registration?.getNotifications?.() || []
        for (const notification of notifications) notification.close()
      }),
    ])
    if (lookupError || results.some((result) => result.status === 'rejected')) {
      throw new Error('Some reminder cleanup could not finish. Please try again when connected.')
    }
  }

  function disableReminder(userId) {
    generation++
    const cleanup = cleanupInProgress.then(() => performCleanup(userId))
    cleanupInProgress = cleanup.catch(() => {})
    return cleanup
  }

  async function getReminder(userId) {
    const version = generation
    async function off() {
      if (version !== generation) throw new Error('Reminder settings changed. Please try again.')
      let cleanupPending = false
      try { await disableReminder(userId) } catch { cleanupPending = true }
      return { enabled: false, cleanupPending }
    }
    if (browser.permission() !== 'granted') return off()
    let subscription
    try {
      const registration = await bounded(() => browser.registration())
      subscription = await bounded(() => registration?.pushManager.getSubscription())
    } catch { return off() }
    if (!subscription) return off()
    const { data, error } = await bounded((signal) => client.from('push_reminders')
      .select('reminder_time, device_id').eq('user_id', userId).eq('endpoint', subscription.endpoint)
      .abortSignal(signal).maybeSingle())
    if (error) throw new Error('Could not load reminders. Please try again.')
    if (version !== generation) throw new Error('Reminder settings changed. Please try again.')
    if (!data) return off()
    // Bind old subscriptions to this device so a later loss/revocation can be cleaned up.
    if (version !== generation) throw new Error('Reminder settings changed. Please try again.')
    const deviceId = browser.deviceId()
    if (data.device_id !== deviceId) await register(userId, subscription, data.reminder_time, deviceId)
    return { enabled: true, reminder_time: data.reminder_time, cleanupPending: false }
  }

  async function register(userId, subscription, time, deviceId) {
    const version = generation
    const { error } = await bounded((signal) => client.rpc('register_push_reminder', {
      p_endpoint: subscription.endpoint,
      p_subscription: subscription.toJSON(),
      p_reminder_time: time,
      p_device_id: deviceId,
    }).abortSignal(signal))
    if (error) throw new Error('Could not save this reminder. Check your connection and reminder setup.')
    if (version !== generation) {
      await deleteDeviceRows(userId, deviceId, subscription.endpoint)
      throw new Error('Reminder setup was cancelled.')
    }
  }

  async function enableReminder(userId, time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid reminder time.')
    const version = ++generation
    const deviceId = browser.deviceId()
    const assertActive = () => {
      if (version !== generation) throw new Error('Reminder setup was cancelled.')
    }
    // This call happens before awaiting network work, directly from the button press.
    const permission = await browser.requestPermission()
    assertActive()
    if (permission !== 'granted') throw new Error('Notifications are blocked. You can allow them in your browser settings.')
    await cleanupInProgress
    assertActive()
    const subscription = await bounded(() => browser.subscribe())
    assertActive()
    await register(userId, subscription, time, deviceId)
    if (version !== generation) {
      // If logout raced an in-flight registration, remove that old account's row.
      await deleteDeviceRows(userId, deviceId, subscription.endpoint)
      await subscription.unsubscribe()
      assertActive()
    }
  }

  async function signOutWithReminderCleanup(userId, options) {
    try { await disableReminder(userId) } catch { /* Cleanup must never prevent logout. */ }
    return client.auth.signOut(options)
  }

  return { getReminder, enableReminder, disableReminder, signOutWithReminderCleanup }
}
