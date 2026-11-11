import { supabase } from '../lib/supabase'
import { createActivityService } from '../utils/activityRequests'

export const { getActivityDates, recordAppVisit, confirmNoContact } = createActivityService(supabase)
