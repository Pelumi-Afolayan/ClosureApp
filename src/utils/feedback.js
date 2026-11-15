// Static configuration only. Never append account data or writing to this URL.
export function getFeedbackUrl(configuredUrl) {
  if (typeof configuredUrl !== 'string' || !configuredUrl.trim()) return null
  try {
    const url = new URL(configuredUrl.trim())
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.href
  } catch { return null }
}
