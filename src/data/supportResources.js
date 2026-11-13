// Country codes are ISO 3166-1 alpha-2. No unverified contacts appear in the UI.
export const supportCountries = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'IE', name: 'Ireland' },
  { code: 'FR', name: 'France' },
  { code: 'KE', name: 'Kenya' },
  { code: 'GH', name: 'Ghana' },
]

// TODO (project owner): fill in each contact/name/official HTTPS URL, verify
// availability and country coverage, then explicitly change verified to true.
// Empty contacts are intentional placeholders, never invented phone numbers.
export const supportResources = [
  { country: 'NG', name: '', contact: '', url: '', verified: false },
  { country: 'GB', name: '', contact: '', url: '', verified: false },
  { country: 'US', name: '', contact: '', url: '', verified: false },
  { country: 'CA', name: '', contact: '', url: '', verified: false },
  { country: 'AU', name: '', contact: '', url: '', verified: false },
  { country: 'IN', name: '', contact: '', url: '', verified: false },
  { country: 'ZA', name: '', contact: '', url: '', verified: false },
  { country: 'IE', name: '', contact: '', url: '', verified: false },
  { country: 'FR', name: '', contact: '', url: '', verified: false },
  { country: 'KE', name: '', contact: '', url: '', verified: false },
  { country: 'GH', name: '', contact: '', url: '', verified: false },
]

export const emergencyFallback = 'If you are in immediate danger, contact your local emergency services.'
