// The client is passed in so database request behaviour can be tested safely.
export function createCheckInService(client) {
  return {
    async getCheckInDates(userId, signal) {
      const dates = []
      const pageSize = 500
      let offset = 0

      while (true) {
        let query = client
          .from('check_ins')
          .select('check_in_date')
          .eq('user_id', userId)
          .order('check_in_date', { ascending: true })
          .range(offset, offset + pageSize - 1)

        if (signal) query = query.abortSignal(signal)

        const { data, error } = await query

        if (error) throw error

        dates.push(...data.map((entry) => entry.check_in_date))

        if (data.length < pageSize) break
        offset += pageSize
      }

      return dates
    },

    async getCheckIn(userId, date, signal) {
      let query = client
        .from('check_ins')
        .select('id, check_in_date, moods, note')
        .eq('user_id', userId)
        .eq('check_in_date', date)

      if (signal) query = query.abortSignal(signal)

      const { data, error } = await query.maybeSingle()

      if (error) throw error

      return data
    },

    async saveCheckIn({ userId, date, moods, note }) {
      const { data, error } = await client
        .from('check_ins')
        .upsert(
          {
            user_id: userId,
            check_in_date: date,
            moods,
            note,
          },
          {
            onConflict: 'user_id,check_in_date',
          }
        )
        .select('id, check_in_date, moods, note')
        .single()

      if (error) throw error

      return data
    },
  }
}
