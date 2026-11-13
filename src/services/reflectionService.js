import { supabase } from '../lib/supabase'
import { createReflectionService } from '../utils/reflectionRequests'

export const { getReflections, saveReflection, deleteReflection } = createReflectionService(supabase)
