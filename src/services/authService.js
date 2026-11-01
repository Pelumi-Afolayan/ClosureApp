import { supabase } from '../lib/supabase'
import { createAuthActions } from '../utils/authActions'

export const authService = createAuthActions(
  supabase,
  window.location.origin
)
