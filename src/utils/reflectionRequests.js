export const reflectionKinds = ['lesson', 'my_part', 'next_time', 'reality_check', 'reason']

export function validateReflection({ kind, content }) {
  if (!reflectionKinds.includes(kind)) return 'Please choose a reflection type.'
  if (typeof content !== 'string' || !content.trim()) return 'Add a few words before saving.'
  if ([...content].length > 1000) return 'Please keep this reflection within 1,000 characters.'
  return ''
}

export function lessonDraft(content, start, end) {
  return end > start ? content.slice(start, end) : content
}

export function createReflectionService(client) {
  const fields = 'id, kind, content, created_at, updated_at'
  return {
    async getReflections(userId, kinds, signal) {
      let query = client.from('reflections').select(fields).eq('user_id', userId)
        .in('kind', kinds).order('created_at', { ascending: false }).order('id', { ascending: false })
      if (signal) query = query.abortSignal(signal)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    async saveReflection({ userId, id, kind, content }) {
      const errorMessage = validateReflection({ kind, content })
      if (errorMessage) throw new Error(errorMessage)
      const values = { kind, content }
      const query = id
        ? client.from('reflections').update(values).eq('user_id', userId).eq('id', id)
        : client.from('reflections').insert({ ...values, user_id: userId })
      const { data, error } = await query.select(fields).single()
      if (error) throw error
      return data
    },
    async deleteReflection(userId, id) {
      const { data, error } = await client.from('reflections').delete().eq('user_id', userId)
        .eq('id', id).select('id').single()
      if (error) throw error
      return data
    },
  }
}

export const journalReflectionOptions = [
  { kind: 'lesson', label: 'Lesson', title: 'A lesson to keep' },
  { kind: 'reality_check', label: 'Real picture', title: 'The real picture' },
  { kind: 'next_time', label: 'Next time', title: 'What I want next time' },
]

export function journalReflectionDraft(kind, content, start = 0, end = 0) {
  if (!journalReflectionOptions.some(option => option.kind === kind)) {
    throw new Error('Please choose Lesson, Real picture or Next time.')
  }
  return { kind, content: lessonDraft(content, start, end) }
}
