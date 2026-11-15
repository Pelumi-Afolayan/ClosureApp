import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
const icon = Buffer.from((await readFile('public/closure-icon.svg', 'utf8')).replaceAll('#f8f6ef', '#faf7f0'))
for (const size of [192, 512]) {
  const inner = Math.round(size * 0.75)
  const foreground = await sharp(icon).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: '#faf7f0' } })
    .composite([{ input: foreground, gravity: 'centre' }]).png().toFile(`public/icons/closure-maskable-${size}.png`)
}
const source = await readFile('public/images/encouragement-landscape.png')
await sharp(source).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 }).toFile('public/images/encouragement-landscape.webp')
const fallback = await sharp(source).resize({ width: 960, withoutEnlargement: true }).png({ palette: true, colours: 128, compressionLevel: 9 }).toBuffer()
await writeFile('public/images/encouragement-landscape.png', fallback)
