import { validConfiguration } from '../utils/configuration'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Match the SDK's existing default key; this does not change stored sessions.
export const configurationReady = validConfiguration(supabaseUrl, supabaseKey)
export const authStorageKey = configurationReady ? `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token` : 'closure.unconfigured'

export const supabase = configurationReady ? createClient(supabaseUrl, supabaseKey) : null