export function createStoryService(client) {
  const fields = 'user_id, what_happened, what_hurt, what_i_need, created_at, updated_at'

  return {
    async getStory(userId, signal) {
      let query = client
        .from('stories')
        .select(fields)
        .eq('user_id', userId)

      if (signal) query = query.abortSignal(signal)

      const { data, error } = await query.maybeSingle()
      if (error) throw error

      return data
    },

    async saveStory({ userId, whatHappened, whatHurt, whatINeed }) {
      const { data, error } = await client
        .from('stories')
        .upsert(
          {
            user_id: userId,
            what_happened: whatHappened,
            what_hurt: whatHurt,
            what_i_need: whatINeed,
          },
          {
            onConflict: 'user_id',
          }
        )
        .select(fields)
        .single()

      if (error) throw error

      return data
    },
  }
}

export function storyAnswers(story) {
  return {
    whatHappened: story?.what_happened || '',
    whatHurt: story?.what_hurt || '',
    whatINeed: story?.what_i_need || '',
  }
}
