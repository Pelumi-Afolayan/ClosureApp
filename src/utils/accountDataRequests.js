const definitions = [
  ['profile', 'profiles', 'id', 'id, preferred_name, goals, timezone, onboarding_complete, show_celebrations, created_at, updated_at'],
  ['check_ins', 'check_ins', 'user_id', 'id, user_id, check_in_date, moods, note, created_at, updated_at'],
  ['journal_entries', 'journal_entries', 'user_id', 'id, user_id, title, content, entry_type, created_at, updated_at'],
  ['story', 'stories', 'user_id', 'user_id, what_happened, what_hurt, what_i_need, created_at, updated_at'],
  ['reflections', 'reflections', 'user_id', 'id, user_id, kind, content, created_at, updated_at'],
  ['app_visits', 'app_visits', 'user_id', 'user_id, activity_date, recorded_at'],
  ['no_contact_days', 'no_contact_days', 'user_id', 'user_id, activity_date, recorded_at'],
]

export function createAccountDataRequests(client, { disableReminder, clearSession }) {
  return {
    async exportAccountData(userId, signal) {
      const { data: identity, error: authError } = await client.auth.getSession()
      if (authError || identity.session?.user?.id !== userId) throw new Error('Please sign in again before downloading your data.')
      const result = {}
      for (const [key, table, owner, fields] of definitions) {
        const rows = []
        const order = ['profiles', 'stories'].includes(table) ? owner
          : ['app_visits', 'no_contact_days'].includes(table) ? 'activity_date' : 'id'
        for (let offset = 0; ; offset += 500) {
          let query = client.from(table).select(fields).eq(owner, userId).order(order, { ascending: true }).range(offset, offset + 499)
          if (signal) query = query.abortSignal(signal)
          const { data, error } = await query
          if (error) throw new Error('Your download could not be prepared. No partial file was created.')
          rows.push(...data)
          if (data.length < 500) break
        }
        result[key] = ['profile', 'story'].includes(key) ? rows[0] || null : rows
      }
      return result
    },
    async deleteAccount({ userId, confirmation, permanent }) {
      if (confirmation !== 'DELETE' || permanent !== true) throw new Error('Type DELETE and confirm that deletion is permanent.')
      const { data: sessionData, error: sessionError } = await client.auth.getSession()
      const token = sessionData.session?.access_token
      if (sessionError || !token) throw new Error('Please sign in again before deleting your account.')
      const { data: identity, error: identityError } = await client.auth.getUser(token)
      if (identityError || identity.user?.id !== userId) throw new Error('Please sign in again before deleting your account.')
      try { await disableReminder(userId) } catch {
        throw new Error("We couldn't finish turning off this device's reminders. Your account has not been deleted. Please try again.")
      }
      const { data, error } = await client.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${token}` },
        body: { confirmation: 'DELETE', permanent: true },
      })
      if (error || data?.deleted !== true) throw new Error("Account deletion wasn't confirmed. Your reminders may now be off. Please check your connection and try again.")
      await clearSession(userId)
    },
  }
}

export async function finishDeletedSession({ auth, storage, storageKey, leave, timeoutMs = 2500 }) {
  let timeout
  try {
    await auth.stopAutoRefresh()
    await Promise.race([
      auth.signOut({ scope: 'local' }),
      new Promise(resolve => { timeout = setTimeout(resolve, timeoutMs) }),
    ])
  } catch { /* Remote deletion succeeded. Always clear the local persisted session too. */ }
  finally { clearTimeout(timeout) }
  let cleared = true
  try {
    for (const key of [storageKey, `${storageKey}-code-verifier`, `${storageKey}-user`, 'closure.push-device-id']) storage.removeItem(key)
  } catch { cleared = false }
  leave(cleared)
}
