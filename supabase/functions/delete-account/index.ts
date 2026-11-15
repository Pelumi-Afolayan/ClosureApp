import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createDeleteAccountHandler } from './handler.js'

const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

Deno.serve(createDeleteAccountHandler({
  allowedOrigins: (Deno.env.get('DELETE_ACCOUNT_ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean),
  async verifyUser(token: string) {
    const { data, error } = await admin.auth.getUser(token)
    if (error) throw error
    return data.user
  },
  async ready() {
    const { data, error } = await admin.rpc('account_deletion_ready')
    if (error) throw error
    return data
  },
  async deleteUser(userId: string) {
    const { error } = await admin.auth.admin.deleteUser(userId, false)
    if (error) throw error
  },
}))
