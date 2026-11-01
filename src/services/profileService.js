import { supabase } from '../lib/supabase'

export async function getProfile(userId, signal) {
  let query = supabase
    .from('profiles')
    .select('id, preferred_name, goals, timezone, onboarding_complete')
    .eq('id', userId)

  if (signal) {
    query = query.abortSignal(signal)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error

  return data
}

export async function saveProfile(profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, {
      onConflict: 'id',
    })
    .select('id, preferred_name, goals, timezone, onboarding_complete')
    .single()

  if (error) throw error

  return data
}
