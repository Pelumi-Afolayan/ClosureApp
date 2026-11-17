import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import { MINIMUM_OPENING_MS, remainingOpeningTime } from '../src/utils/openingTiming.js'

test('opening has one two-second minimum without adding extra delay after a slow load', () => {
  assert.equal(MINIMUM_OPENING_MS, 2000)
  assert.equal(remainingOpeningTime(100, 100), 2000)
  assert.equal(remainingOpeningTime(100, 1100), 1000)
  assert.equal(remainingOpeningTime(100, 2100), 0)
  assert.equal(remainingOpeningTime(100, 5100), 0)
  assert.equal(remainingOpeningTime(100, 0), 2000)
})

test('pre-CSS startup paints the stored or system theme, including when storage is unavailable', async () => {
  const source = await readFile(new URL('../public/theme-init.js', import.meta.url), 'utf8')
  for (const [preference, systemDark, expected] of [['dark', false, 'dark'], ['light', true, 'light'], ['system', true, 'dark'], ['system', false, 'light'], ['invalid', true, 'dark'], [null, true, 'dark'], ['denied', true, 'dark']]) {
    const root = { dataset: {}, style: {} }
    const meta = { content: '' }
    vm.runInNewContext(source, {
      localStorage: { getItem() { if (preference === 'denied') throw new Error('Denied'); return preference } },
      matchMedia: () => ({ matches: systemDark }),
      document: { documentElement: root, querySelector: () => meta },
    })
    assert.equal(root.dataset.theme, expected)
    assert.equal(root.style.colorScheme, expected)
    assert.equal(root.style.backgroundColor, expected === 'dark' ? '#141a17' : '#faf7f0')
    assert.equal(meta.content, root.style.backgroundColor)
  }
})
