import { supabase, authStorageKey } from '../lib/supabase'
import { drafts } from '../utils/draftStorage'
import { disableReminder } from './notificationService'
import { createAccountDataRequests, finishDeletedSession } from '../utils/accountDataRequests'

export const { exportAccountData, deleteAccount } = createAccountDataRequests(supabase, {
  disableReminder,
  clearSession: async userId => {
    let draftsCleared = true
    try {
      await drafts.clearUser(userId)
    } catch { draftsCleared = false }
    return finishDeletedSession({
    auth: supabase.auth,
    storage: { removeItem: key => window.localStorage.removeItem(key) },
    storageKey: authStorageKey,
    leave: cleared => window.location.replace(cleared && draftsCleared ? '/goodbye' : '/goodbye?clear=needed'),
    })
  },
})
