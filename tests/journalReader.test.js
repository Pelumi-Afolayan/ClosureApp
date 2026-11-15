import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, MemoryRouter } from 'react-router'
import { build } from 'rolldown'

// Use Vite's existing JSX bundler in memory. No browser, server, credentials,
// network requests or generated files are needed to inspect the real reader.
const { output } = await build({
  input: fileURLToPath(new URL('../src/components/JournalReader.jsx', import.meta.url)),
  platform: 'node',
  external: ['react', 'react/jsx-runtime', 'react-router'],
  transform: { jsx: 'react-jsx' },
  write: false,
  output: { format: 'cjs' },
  plugins: [{
    name: 'reader-test-styles',
    resolveId(source) { if (source.endsWith('.css')) return `\0reader-style:${source}.js` },
    load(id) { if (id.startsWith('\0reader-style:')) return '' },
  }],
})
const compiled = { exports: {} }
new Function('require', 'module', 'exports', output.find(item => item.type === 'chunk').code)(
  createRequire(import.meta.url), compiled, compiled.exports,
)
const JournalReader = typeof compiled.exports === 'function' ? compiled.exports : compiled.exports.default
const entry = {
  id: 'fixture', title: 'My words', content: 'First line\n\nSecond line', entry_type: 'journal',
  created_at: '2026-11-13T12:00:00Z', updated_at: '2026-11-14T12:00:00Z',
}
function render(overrides = {}) {
  return renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(JournalReader, { entry: { ...entry, ...overrides }, timezone: 'Africa/Lagos', onEdit() {} }),
  ))
}

test('saved writing renders as an article with an explicit Edit button and no editable controls', () => {
  const html = render()
  assert.match(html, /<article/)
  assert.match(html, /<h2[^>]*>My words<\/h2>/)
  assert.match(html, /<button[^>]*type="button"[^>]*>Edit<\/button>/)
  assert.match(html, /Journal entry/)
  assert.match(html, /Created/)
  assert.match(html, /Last edited/)
  assert.doesNotMatch(html, /<(form|input|textarea|select)\b|contenteditable/i)
  assert.match(html, /First line\n\nSecond line/)
})

test('reader escapes writing and title markup instead of interpreting it as HTML', () => {
  const html = render({ title: '<script>fixture</script>', content: '<img src=x onerror=fixture>\n& words' })
  assert.match(html, /&lt;script&gt;fixture&lt;\/script&gt;/)
  assert.match(html, /&lt;img src=x onerror=fixture&gt;/)
  assert.doesNotMatch(html, /<script>|<img/)
})

test('untitled letters keep their type and return to the letters list without destructive reader controls', () => {
  const html = render({ title: ' ', entry_type: 'unsent_letter' })
  assert.match(html, /Untitled letter/)
  assert.match(html, /Unsent letter/)
  assert.match(html, /href="\/journal\?type=unsent_letter"/)
  assert.doesNotMatch(html, />Delete<|>Release this letter</)
  assert.match(render({ title: '' }), /Untitled entry/)
})

test('existing router blocker can intercept same-page Cancel before returning to read mode', async () => {
  const router = createMemoryRouter([{ path: '/journal/:entryId', element: null }], {
    initialEntries: ['/journal/fixture'],
  })
  try {
    const initialKey = router.state.location.key
    router.getBlocker('writing', () => true)
    await router.navigate('/journal/fixture', { replace: true })
    assert.equal(router.state.blockers.get('writing').state, 'blocked')
    assert.equal(router.state.location.key, initialKey)
    router.state.blockers.get('writing').proceed()
    assert.notEqual(router.state.location.key, initialKey)
    assert.equal(router.state.location.pathname, '/journal/fixture')
  } finally { router.dispose() }
})
