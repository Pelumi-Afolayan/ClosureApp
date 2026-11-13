import { supabase } from '../lib/supabase'
import { createCheckInService } from '../utils/checkInRequests'

export const { getCheckIn, saveCheckIn, getCheckInDates, getCheckInsInRange } = createCheckInService(supabase)
