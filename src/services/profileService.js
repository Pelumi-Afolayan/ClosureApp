import { supabase } from '../lib/supabase'
import { createProfileRequests } from '../utils/profileRequests'

export const { getProfile, saveProfile } = createProfileRequests(supabase)
