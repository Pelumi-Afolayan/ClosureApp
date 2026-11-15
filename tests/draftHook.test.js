import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { IDBFactory } from 'fake-indexeddb'
import { Window } from 'happy-dom'
import { build } from 'rolldown'
import { act, createElement, StrictMode, useState, useLayoutEffect } from 'react'

const windowValue = new Window({ url: 'https://closure.test' })
globalThis.window = windowValue
globalThis.document = windowValue.document
globalThis.indexedDB = new IDBFactory()
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = await import('react-dom/client')
const hookPath = fileURLToPath(new URL('../src/hooks/useLocalDraft.js',import.meta.url))
const storePath = fileURLToPath(new URL('../src/utils/draftStorage.js',import.meta.url))
const { output } = await build({ input: 'draft-hook-test', platform: 'node', external: ['react'], write: false,
  output: { format: 'cjs' }, plugins: [{ name: 'draft-hook-harness', resolveId(source) { if(source === 'draft-hook-test') return '\0draft-hook-test' },
    load(id) { if(id === '\0draft-hook-test') return `export { default as useLocalDraft } from ${JSON.stringify(hookPath)}; export { drafts } from ${JSON.stringify(storePath)};` } }],
})
const compiled = { exports: {} }
new Function('require','module','exports',output.find(item=>item.type==='chunk').code)(createRequire(import.meta.url),compiled,compiled.exports)
const { useLocalDraft, drafts } = compiled.exports
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
async function editor(userId, entryKey, initial = '') {
  let api
  function Harness() {
    const [content, setContent] = useState(initial)
    const draft = useLocalDraft({ userId, entryKey, values: { content }, dirty: content !== initial, onRestore: values => setContent(values.content) })
    useLayoutEffect(() => { api = { ...draft, content, setContent } }, [draft, content])
    return createElement('textarea', { value: content, onChange: event => setContent(event.target.value) })
  }
  const container = document.createElement('div'); document.body.appendChild(container)
  const root = createRoot(container)
  await act(async()=>root.render(createElement(StrictMode,null,createElement(Harness))))
  await act(async()=>{ await delay(25) })
  return { api: () => api, async change(content) { await act(async()=>api.setContent(content)) }, async close() { await act(async()=>root.unmount()); container.remove(); await delay(20) } }
}
test('real React draft hook debounces once, survives remount, and does not keep rewriting an unchanged draft', async()=>{
  const first = await editor('hook-a','journal:new:journal')
  try {
    await first.change('Words before refresh Ã°Å¸Å’Â¿')
    await act(async()=>{ await delay(1100) })
    const saved=await drafts.get('hook-a','journal:new:journal')
    assert.equal(saved.values.content,'Words before refresh Ã°Å¸Å’Â¿')
    await act(async()=>{ await delay(1100) })
    assert.equal((await drafts.get('hook-a','journal:new:journal')).updatedAt,saved.updatedAt)
  } finally { await first.close() }
  const reopened=await editor('hook-a','journal:new:journal')
  try {
    assert.equal(reopened.api().candidate.values.content,'Words before refresh Ã°Å¸Å’Â¿')
    assert.equal(reopened.api().content,'', 'restoration is an explicit choice')
    await act(async()=>reopened.api().restore())
    assert.equal(reopened.api().content,'Words before refresh Ã°Å¸Å’Â¿')
    await act(async()=>reopened.api().clear())
  } finally { await reopened.close() }
  assert.equal(await drafts.get('hook-a','journal:new:journal'),null, 'successful save cleanup is not undone by unmount')
})
test('explicit discard removes a candidate without an unmount restoring it', async()=>{
  await drafts.put('hook-b','story',{ content: 'Discard me' })
  const form=await editor('hook-b','story')
  assert.ok(form.api().candidate)
  await act(async()=>form.api().discard())
  await form.close()
  assert.equal(await drafts.get('hook-b','story'),null)
})
test('pagehide flushes a recent edit before the one-second debounce completes', async()=>{
  const form=await editor('hook-c','reflection:new:lesson')
  try {
    await form.change('A recent edit')
    await act(async()=>{ window.dispatchEvent(new window.Event('pagehide')); await delay(25) })
    assert.equal((await drafts.get('hook-c','reflection:new:lesson')).values.content,'A recent edit')
    await act(async()=>form.api().clear())
  } finally { await form.close() }
})
