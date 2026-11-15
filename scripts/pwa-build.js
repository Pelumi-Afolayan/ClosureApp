import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

export async function buildShell(directory) {
  const assets = ['/index.html', '/manifest.webmanifest', '/closure-icon.svg', '/theme-init.js']
  async function walk(folder) {
    for (const item of await readdir(path.join(directory, folder), { withFileTypes: true })) {
      const name = `${folder}/${item.name}`
      if (item.isDirectory()) await walk(name)
      else if (/\.(?:js|css|woff2?|png|webp|svg)$/.test(name)) assets.push(`/${name}`)
    }
  }
  for (const folder of ['assets', 'icons', 'images']) await walk(folder)
  assets.sort()
  const hash = createHash('sha256')
  for (const name of assets) hash.update(name).update(await readFile(path.join(directory, name.slice(1))))
  const worker = await readFile(path.join(directory, 'sw.js'), 'utf8')
  hash.update(worker)
  const shell = { version: hash.digest('hex').slice(0, 16), assets }
  await writeFile(path.join(directory, 'sw.js'), `self.__CLOSURE_SHELL__ = ${JSON.stringify(shell)};\n${worker}`)
  return shell
}

export function shellPlugin() {
  let directory
  return {
    name: 'closure-public-shell', apply: 'build',
    configResolved(config) { directory = path.resolve(config.root, config.build.outDir) },
    async closeBundle() { await buildShell(directory) },
  }
}
