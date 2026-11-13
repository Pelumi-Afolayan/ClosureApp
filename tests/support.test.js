import test from 'node:test'
import assert from 'node:assert/strict'
import { emergencyFallback, supportCountries, supportResources } from '../src/data/supportResources.js'
import { copySupportMessage, friendMessage, groundingStep, suggestedSupportCountry, verifiedSupportResources } from '../src/utils/support.js'

test('support ships no invented or enabled contacts and always has a generic fallback', () => {
  assert.ok(supportResources.length > 0)
  for (const resource of supportResources) {
    assert.equal(resource.verified, false)
    assert.equal(resource.contact, '')
    assert.equal(resource.url, '')
    assert.deepEqual(Object.keys(resource).sort(), ['contact', 'country', 'name', 'url', 'verified'])
    assert.equal(verifiedSupportResources(resource.country).length, 0)
  }
  assert.match(emergencyFallback, /immediate danger.*local emergency services/)
  assert.equal(new Set(supportResources.map((resource) => resource.country)).size, supportResources.length)
  assert.deepEqual(supportResources.map((resource) => resource.country).sort(), supportCountries.map((country) => country.code).sort())
})

test('timezone suggests a country without treating ambiguous or unknown zones as location', () => {
  assert.equal(suggestedSupportCountry('Africa/Lagos'), 'NG')
  assert.equal(suggestedSupportCountry('Europe/London'), 'GB')
  assert.equal(suggestedSupportCountry('America/New_York'), 'US')
  assert.equal(suggestedSupportCountry('America/Toronto'), 'CA')
  for (const zone of ['UTC', undefined, '', 'Invalid/Timezone', '__proto__', 'Europe/Unknown']) assert.equal(suggestedSupportCountry(zone), '')
})

test('only explicitly verified resources for the selected country are shown', () => {
  // Fixture words are intentionally not real organizations, phone numbers or links.
  const contact = { country: 'NG', name: 'Fixture resource', contact: 'Fixture contact', url: '', verified: true }
  const resources = [contact, { ...contact, verified: false }, { ...contact, verified: 'true' }, { ...contact, country: 'GB' }]
  assert.deepEqual(verifiedSupportResources('NG', resources), [contact])
  assert.equal(verifiedSupportResources('', resources).length, 0)
})

test('malformed and unsafe resource entries never turn into links or contacts', () => {
  const base = { country: 'NG', name: 'Fixture resource', contact: '', url: 'https://example.invalid/resource', verified: true }
  assert.deepEqual(verifiedSupportResources('NG', [base]), [base])
  const invalid = [null, { ...base, name: '' }, { ...base, contact: 123 },
    { ...base, url: 'javascript:alert(1)' }, { ...base, url: 'http://example.invalid' },
    { ...base, url: 'https://user:password@example.invalid' }, { ...base, url: 'invalid' },
    { ...base, url: '' }]
  assert.equal(verifiedSupportResources('NG', invalid).length, 0)
})

test('grounding cues follow six gentle ten-second cycles and finish at 60 seconds', () => {
  for (let cycle = 0; cycle < 6; cycle++) {
    assert.equal(groundingStep(cycle * 10).cue, 'Breathe in gently')
    assert.equal(groundingStep(cycle * 10 + 3).cue, 'Breathe in gently')
    assert.equal(groundingStep(cycle * 10 + 4).cue, 'Let your breath out gently')
    assert.equal(groundingStep(cycle * 10 + 9).cue, 'Let your breath out gently')
  }
  assert.equal(groundingStep(59).remaining, 1)
  assert.equal(groundingStep(60).complete, true)
  assert.equal(groundingStep(60).remaining, 0)
  assert.equal(groundingStep(600).remaining, 0)
  assert.equal(groundingStep(-3).remaining, 60)
  assert.equal(groundingStep(NaN).remaining, 60)
  assert.equal(groundingStep(4.9).cue, 'Let your breath out gently')
})

test('copy writes only the optional generic message after an explicit call', async () => {
  const copied = []
  const clipboard = { writeText: async (text) => copied.push(text) }
  assert.equal(copied.length, 0)
  assert.equal(await copySupportMessage(clipboard), true)
  assert.deepEqual(copied, [friendMessage])
  assert.equal(friendMessage, "Hey, I'm having a hard night. Can we talk?")
})

test('missing or denied clipboard access offers a manual-copy outcome', async () => {
  assert.equal(await copySupportMessage(undefined), false)
  assert.equal(await copySupportMessage({ writeText: async () => { throw new Error('Permission denied') } }), false)
})
