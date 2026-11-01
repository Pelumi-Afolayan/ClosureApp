export function validateJournalEntry({ content, entryType }) {
  if (!content.trim()) return 'Please write something before saving.'

  if (!['journal', 'unsent_letter'].includes(entryType)) {
    return 'Please choose Journal entry or Unsent letter.'
  }

  return ''
}

export function createJournalService(client) {
  const fields = 'id, title, content, entry_type, created_at, updated_at'

  return {
    async getJournalEntries(userId, { page = 1, entryType = 'all', signal } = {}) {
      const pageSize = 20
      const offset = (page - 1) * pageSize
      let query = client
        .from('journal_entries')
        .select('id, title, entry_type, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize)

      if (entryType !== 'all') query = query.eq('entry_type', entryType)
      if (signal) query = query.abortSignal(signal)

      const { data, error } = await query
      if (error) throw error

      return {
        entries: data.slice(0, pageSize),
        hasMore: data.length > pageSize,
      }
    },

    async getJournalEntry(userId, entryId, signal) {
      let query = client
        .from('journal_entries')
        .select(fields)
        .eq('user_id', userId)
        .eq('id', entryId)

      if (signal) query = query.abortSignal(signal)

      const { data, error } = await query.maybeSingle()
      if (error) throw error

      return data
    },

    async saveJournalEntry({ userId, entryId, title, content, entryType }) {
      const validationError = validateJournalEntry({ content, entryType })
      if (validationError) throw new Error(validationError)

      const entry = {
        title: title.trim(),
        content,
        entry_type: entryType,
      }

      let query

      if (entryId) {
        query = client
          .from('journal_entries')
          .update(entry)
          .eq('user_id', userId)
          .eq('id', entryId)
      } else {
        query = client
          .from('journal_entries')
          .insert({ ...entry, user_id: userId })
      }

      const { data, error } = await query.select(fields).single()
      if (error) throw error

      return data
    },

    async deleteJournalEntry(userId, entryId) {
      const { data, error } = await client
        .from('journal_entries')
        .delete()
        .eq('user_id', userId)
        .eq('id', entryId)
        .select('id')
        .single()

      if (error) throw error

      return data
    },
  }
}
