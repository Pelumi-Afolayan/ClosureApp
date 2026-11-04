import { supabase } from '../lib/supabase'
import { createStoryService } from '../utils/storyRequests'

export const { getStory, saveStory } = createStoryService(supabase)
