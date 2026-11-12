const hosts = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/
export function validPushEndpoint(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && hosts.test(url.hostname)
  } catch { return false }
}
export async function deliverReminders(rows, send, remove) {
  const result = { sent: 0, failed: 0, expired: 0 }
  async function deliver(row) {
    if (!validPushEndpoint(row.endpoint) || row.subscription?.endpoint !== row.endpoint) { result.failed++; return }
    try {
      // Generic content only. No names, moods, writing or breakup details.
      await send(row.subscription, JSON.stringify({ kind: 'daily-reminder' }), {
        TTL: Math.max(1, Math.min(3600, row.ttl)), timeout: 10000, urgency: 'normal', topic: 'closure-daily-reminder',
      })
      result.sent++
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) { await remove(row.endpoint); result.expired++ }
      else result.failed++
    }
  }
  // Bound concurrency so 50 slow push providers cannot exhaust the function runtime.
  for (let index = 0; index < rows.length; index += 5) {
    await Promise.all(rows.slice(index, index + 5).map(deliver))
  }
  return result
}
