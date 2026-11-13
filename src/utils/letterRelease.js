export function canReleaseLetter({ entryId, entryType, savedEntryType }) {
  return Boolean(entryId && entryType === 'unsent_letter' && savedEntryType === 'unsent_letter')
}

export function shouldRereadLetter(entry, now = Date.now()) {
  const created = new Date(entry.created_at).getTime()
  return entry.entry_type === 'unsent_letter' && Number.isFinite(created)
    && Number.isFinite(now) && now - created >= 30 * 24 * 60 * 60 * 1000
}

// No optimistic deletion: animate first, then use the existing owner-filtered
// delete service. A rejected delete leaves the editor's text untouched.
export async function releaseLetter({ entryId, entryType, savedEntryType, userId, animate, deleteEntry }) {
  if (!userId || !canReleaseLetter({ entryId, entryType, savedEntryType })) {
    throw new Error('Only a saved unsent letter can be released.')
  }
  const completed = await animate()
  if (completed === false) return { cancelled: true }
  await deleteEntry(userId, entryId)
  return { deleted: true, released: true }
}
