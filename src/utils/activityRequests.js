// Server functions decide the authenticated owner and current local date.
export function createActivityService(client) {
  const tables = { app: 'app_visits', noContact: 'no_contact_days' }

  async function getActivityDates(kind, userId, signal) {
    const table = tables[kind]
    if (!Object.hasOwn(tables, kind)) throw new Error('Unknown activity type.')
    const dates = []
    const pageSize = 500

    for (let offset = 0; ; offset += pageSize) {
      let query = client.from(table)
        .select('activity_date')
        .eq('user_id', userId)
        .order('activity_date', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (signal) query = query.abortSignal(signal)
      const { data, error } = await query
      if (error) throw error
      dates.push(...data.map((record) => record.activity_date))
      if (data.length < pageSize) return dates
    }
  }

  async function record(functionName, signal) {
    let request = client.rpc(functionName)
    if (signal) request = request.abortSignal(signal)
    const { data, error } = await request
    if (error) throw error
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new Error('The activity date could not be verified.')
    }
    return data
  }

  return {
    getActivityDates,
    recordAppVisit: (signal) => record('record_app_visit', signal),
    confirmNoContact: (signal) => record('confirm_no_contact', signal),
  }
}
