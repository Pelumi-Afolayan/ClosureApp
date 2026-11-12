import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import webpush from 'npm:web-push@3.6.7'
import { deliverReminders } from './pushDelivery.js'

Deno.serve(async (request) => {
  const secret = Deno.env.get('REMINDER_CRON_SECRET')
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!secret || request.headers.get('x-reminder-secret') !== secret) return new Response('Unauthorized', { status: 401 })
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')
  if (!publicKey || !privateKey || !subject) return new Response('Push setup incomplete', { status: 503 })
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    webpush.setVapidDetails(subject, publicKey, privateKey)
    const { data, error } = await client.rpc('claim_due_reminders')
    if (error) throw error
    const result = await deliverReminders(data || [], webpush.sendNotification.bind(webpush), async (endpoint: string) => {
      const { error } = await client.from('push_reminders').delete().eq('endpoint', endpoint)
      if (error) throw error
    })
    return Response.json(result)
  } catch {
    // Do not log subscription endpoints, keys or user data.
    return new Response('Reminder job failed', { status: 500 })
  }
})
