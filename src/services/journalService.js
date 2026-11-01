import { supabase } from '../lib/supabase'
import { createJournalService } from '../utils/journalRequests'

export const {
  getJournalEntries,
  getJournalEntry,
  saveJournalEntry,
  deleteJournalEntry,
} = createJournalService(supabase)
