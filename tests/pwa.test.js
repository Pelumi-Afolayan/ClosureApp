import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import sharp from 'sharp'
import { buildShell } from '../scripts/pwa-build.js'

const origin = 'https://closure.test'
async function worker() {
  const handlers = {}, writes = [], removed = [], network = [], skipped = []
  const entries = new Map([['/index.html', new Response('<html>Public shell</html>')], ['/assets/app.js', new Response('public code')]])
  const cache = { match: async key => entries.get(typeof key === 'string' ? key : key.url), addAll: async requests => { writes.push(...requests) } }
  const caches = { open: async () => cache, keys: async () => ['closure-shell-old','closure-shell-current','unrelated-cache'], delete: async name => { removed.push(name) } }
  const self = { __CLOSURE_SHELL__: { version: 'current', assets: ['/index.html','/assets/app.js','/icons/closure-192.png'] }, location: { origin },
    addEventListener: (event, handler) => { handlers[event] = handler }, clients: { claim: async () => {} }, skipWaiting: () => skipped.push(true) }
  const environment = { self, URL, Response, caches,
    Request: class extends Request { constructor(url, options) { super(new URL(url, origin), options) } },
    fetch: async request => { network.push(request); throw new Error('offline') },
  }
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), environment)
  return { handlers, writes, removed, network, skipped, environment }
}
async function runLifecycle(handler) { let pending; handler({ waitUntil: promise => { pending = promise } }); await pending }
function fetchEvent(url, { mode = 'cors', method = 'GET' } = {}) {
  let response
  return { request: { url, mode, method }, respondWith: promise => { response = promise }, response: () => response }
}
test('worker precaches only anonymous build assets and removes only its own obsolete versions', async () => {
  const { handlers, writes, removed, skipped } = await worker()
  await runLifecycle(handlers.install)
  assert.equal(writes.length, 3)
  assert.ok(writes.every(request => new URL(request.url).origin === origin && request.credentials === 'omit' && request.cache === 'reload'))
  assert.equal(skipped.length, 0, 'updates do not auto-activate')
  await runLifecycle(handlers.activate)
  assert.deepEqual(removed, ['closure-shell-old'])
  handlers.message({ data: { type: 'arbitrary' } }); assert.equal(skipped.length, 0)
  handlers.message({ data: { type: 'CLOSURE_ACTIVATE_UPDATE' } }); assert.equal(skipped.length, 1)
})
test('private/API/auth/cross-origin/non-GET/query requests never enter Cache Storage', async () => {
  const { handlers, writes, network } = await worker()
  for (const url of ['https://fixture.supabase.co/rest/v1/journal_entries','https://fixture.supabase.co/auth/v1/token',`${origin}/api/private`,`${origin}/assets/app.js?access_token=private`,`${origin}/index.html`,`${origin}/unknown.json`]) {
    const event = fetchEvent(url); handlers.fetch(event); assert.equal(event.response(), undefined)
  }
  const post = fetchEvent(`${origin}/assets/app.js`, { method: 'POST' }); handlers.fetch(post); assert.equal(post.response(), undefined)
  assert.equal(writes.length, 0); assert.equal(network.length, 0)
})
test('offline navigation returns a fixed public shell without storing its private route or parameters', async () => {
  const { handlers, writes } = await worker()
  const event = fetchEvent(`${origin}/journal/private-id?code=private`, { mode: 'navigate' })
  handlers.fetch(event)
  const response = await event.response()
  assert.equal(await response.text(), '<html>Public shell</html>')
  assert.equal(writes.length, 0)
})
test('build-generated worker versions change with public file contents and include fonts/icons/theme boot', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'closure-public-build-'))
  try {
    for (const folder of ['assets','icons','images']) await mkdir(path.join(directory, folder))
    for (const name of ['index.html','manifest.webmanifest','closure-icon.svg','theme-init.js','assets/app.js','assets/style.css','assets/font.woff2','icons/icon.png','images/photo.webp']) await writeFile(path.join(directory,name), 'public fixture')
    const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
    await writeFile(path.join(directory,'sw.js'),source)
    const first = await buildShell(directory)
    assert.ok(first.assets.includes('/assets/font.woff2') && first.assets.includes('/theme-init.js'))
    assert.ok(!first.assets.includes('/sw.js') && !first.assets.some(name => /api|supabase|journal/.test(name)))
    await writeFile(path.join(directory,'assets/app.js'),'changed public code')
    await writeFile(path.join(directory,'sw.js'),source)
    assert.notEqual((await buildShell(directory)).version, first.version)
    assert.match(await readFile(path.join(directory,'sw.js'),'utf8'), /^self\.__CLOSURE_SHELL__ = /)
  } finally { await rm(directory, { recursive: true, force: true }) }
})
test('manifest supplies real maskable icons with safe padding, shortcuts and a matching initial theme', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url),'utf8'))
  const html = await readFile(new URL('../index.html', import.meta.url),'utf8')
  assert.ok(html.includes(`name="theme-color" content="${manifest.theme_color}"`))
  assert.deepEqual(manifest.shortcuts.map(item => item.url), ['/journal/new','/no-contact'])
  for (const size of [192,512]) {
    const entry = manifest.icons.find(item => item.purpose === 'maskable' && item.sizes === `${size}x${size}`)
    assert.ok(entry)
    const { data, info } = await sharp(fileURLToPath(new URL(`../public${entry.src}`, import.meta.url))).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal(info.width,size); assert.equal(info.height,size)
    // All non-background foreground pixels fit inside the central safe circle.
    for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
      const offset=(y*size+x)*info.channels
      if (Math.hypot(x-size/2,y-size/2)>size*0.4) assert.ok(Math.abs(data[offset]-250)<3 && Math.abs(data[offset+1]-247)<3 && Math.abs(data[offset+2]-240)<3)
    }
  }
  assert.ok((await readdir(new URL('../public/images',import.meta.url))).includes('encouragement-landscape.webp'))
})
