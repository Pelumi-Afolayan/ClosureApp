import test from 'node:test'
import assert from 'node:assert/strict'
import { smallSteps } from '../src/data/smallSteps.js'
import { getSmallStep } from '../src/utils/smallSteps.js'
import { resolveTheme } from '../src/utils/theme.js'
import { validConfiguration } from '../src/utils/configuration.js'
import { isIosSafari } from '../src/utils/pwaRuntime.js'

test('30+ public small steps have unique IDs; goal order and duplicates do not change a daily choice', () => {
  const all = Object.values(smallSteps).flat()
  assert.ok(all.length >= 30)
  assert.equal(new Set(all.map(item => item.id)).size, all.length)
  const input = { userId: 'fixture', date: '2026-11-15', goals: ['find_peace','reduce_contact'] }
  assert.deepEqual(getSmallStep(input), getSmallStep({ ...input, goals: ['reduce_contact','find_peace','find_peace'] }))
  assert.ok([...smallSteps.find_peace, ...smallSteps.reduce_contact].some(item => item.id === getSmallStep(input).id))
  assert.notEqual(getSmallStep(input).id, getSmallStep({ ...input, date: '2026-11-16' }).id)
  assert.ok(smallSteps.general.includes(getSmallStep({ ...input, goals: ['unknown'] })))
  assert.throws(() => getSmallStep({ ...input, date: '2026-02-30' }), /valid local date/)
})
test('appearance follows the system unless explicitly overridden', () => {
  assert.equal(resolveTheme('system', true), 'dark')
  assert.equal(resolveTheme('system', false), 'light')
  assert.equal(resolveTheme('light', true), 'light')
  assert.equal(resolveTheme('dark', false), 'dark')
  assert.equal(resolveTheme('invalid', true), 'dark')
})
test('missing/malformed configuration is handled before creating a client', () => {
  for (const [url, key] of [[undefined, undefined], ['', 'key'], ['not-url','key'], ['https://example.test',''], ['javascript:alert(1)','key']]) assert.equal(validConfiguration(url, key), false)
  assert.equal(validConfiguration('https://fixture.supabase.co','public-fixture'), true)
  assert.equal(validConfiguration('http://localhost:54321','public-fixture'), true)
})
test('iOS install instructions show only for Safari outside standalone mode', () => {
  assert.equal(isIosSafari({ userAgent: 'iPhone AppleWebKit Safari' }), true)
  assert.equal(isIosSafari({ userAgent: 'iPhone AppleWebKit Safari' }, true), false)
  assert.equal(isIosSafari({ userAgent: 'iPhone CriOS Safari' }), false)
  assert.equal(isIosSafari({ userAgent: 'Android Chrome Safari' }), false)
})
