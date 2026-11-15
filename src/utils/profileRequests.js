const fields = 'id, preferred_name, goals, timezone, onboarding_complete, show_celebrations'

export function createProfileRequests(client) {
  return {
    async getProfile(userId, signal) {
      let query = client.from('profiles').select(fields).eq('id', userId)
      if (signal) query = query.abortSignal(signal)
      const { data, error } = await query.maybeSingle()
      if (error) throw error
      return data
    },
    async saveProfile(profile) {
      const { data, error } = await client.from('profiles')
        .upsert(profile, { onConflict: 'id' }).select(fields).single()
      if (error) throw error
      return data
    },
  }
}
