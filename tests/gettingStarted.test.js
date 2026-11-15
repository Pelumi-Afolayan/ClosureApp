import test from 'node:test'
import assert from 'node:assert/strict'
import { firstUseSteps } from '../src/data/firstUseGuide.js'
import { destinationAfterOnboarding, withoutGuideParameter } from '../src/utils/firstUseGuide.js'
import { getFeedbackUrl } from '../src/utils/feedback.js'

test('only first onboarding completion requests the guide; skipping preserves unrelated navigation state', () => {
  assert.equal(destinationAfterOnboarding(false), '/today?guide=1')
  assert.equal(destinationAfterOnboarding(true), '/today')
  const original = new URLSearchParams('guide=1&other=keep&guide=1')
  assert.equal(withoutGuideParameter(original).toString(), 'other=keep')
  assert.equal(original.get('guide'), '1')
  assert.deepEqual(firstUseSteps.map(step => step.id), ['journal', 'no-contact', 'support'])
})

test('feedback is unavailable without a safe real configuration and never appends private context', () => {
  for (const value of [undefined, '', 'not a url', 'http://example.com', 'javascript:alert(1)', 'mailto:a@example.com', 'https://user:password@example.com']) {
    assert.equal(getFeedbackUrl(value), null)
  }
  const url = 'https://forms.example.com/feedback?form=closure'
  assert.equal(getFeedbackUrl(url), url)
  assert.equal(getFeedbackUrl(`  ${url}  `), url)
  assert.equal(new URL(getFeedbackUrl(url)).searchParams.size, 1)
})
