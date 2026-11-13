import { supportResources } from '../data/supportResources.js'

export const friendMessage = "Hey, I'm having a hard night. Can we talk?"
export const groundingDuration = 60

// A timezone suggests a country; it is not a location lookup. Unmapped or
// ambiguous zones remain unset so the user can choose, with fallback always shown.
const timezoneCountries = {
  'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE',
  'Africa/Johannesburg': 'ZA', 'Europe/London': 'GB', 'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Perth': 'AU',
  'Australia/Brisbane': 'AU', 'Australia/Adelaide': 'AU', 'Australia/Darwin': 'AU',
}

export function suggestedSupportCountry(timezone) {
  return Object.hasOwn(timezoneCountries, timezone) ? timezoneCountries[timezone] : ''
}

export function verifiedSupportResources(country, resources = supportResources) {
  return resources.filter((resource) => {
    if (!resource || resource.country !== country || resource.verified !== true) return false
    if (typeof resource.name !== 'string' || !resource.name.trim()) return false
    if (typeof resource.contact !== 'string' || typeof resource.url !== 'string') return false
    if (!resource.contact.trim() && !resource.url.trim()) return false
    if (!resource.url) return true
    try {
      const url = new URL(resource.url)
      return url.protocol === 'https:' && !url.username && !url.password
    } catch { return false }
  })
}

export function groundingStep(elapsedSeconds) {
  const elapsed = Math.max(0, Math.min(groundingDuration, Number.isFinite(elapsedSeconds) ? Math.floor(elapsedSeconds) : 0))
  return {
    remaining: groundingDuration - elapsed,
    complete: elapsed === groundingDuration,
    cue: elapsed === groundingDuration ? 'Take your time. Notice how the floor supports you.'
      : elapsed % 10 < 4 ? 'Breathe in gently' : 'Let your breath out gently',
  }
}

export async function copySupportMessage(clipboard) {
  if (!clipboard?.writeText) return false
  try { await clipboard.writeText(friendMessage); return true } catch { return false }
}
