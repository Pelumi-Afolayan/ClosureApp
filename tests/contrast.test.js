import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
function luminance(hex) {
  let value = hex.replace('#','')
  if (value.length === 3) value = [...value].map(letter => letter + letter).join('')
  const rgb = value.match(/../g).map(value => { const channel=parseInt(value,16)/255; return channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4 })
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722
}
function contrast(a,b) { const values=[luminance(a),luminance(b)].sort((a,b)=>b-a); return (values[0]+0.05)/(values[1]+0.05) }
test('light/dark token text pairs and photo text meet AA normal-text contrast', async () => {
  const css=await readFile(new URL('../src/styles/tokens.css',import.meta.url),'utf8')
  const [light,dark] = css.split(':root[data-theme="dark"]')
  function tokens(source) { return Object.fromEntries([...source.matchAll(/--([a-z0-9-]+):\s*(#[a-f0-9]{3,6});/g)].map(match=>[match[1],match[2]])) }
  for (const palette of [tokens(light),tokens(dark)]) {
    for (const [text,background] of [['ink','paper'],['ink','surface'],['text-muted','paper'],['text-muted','surface'],['sage-800','sage-100'],['clay-600','clay-100'],['danger','danger-surface'],['on-primary','sage-600']]) {
      assert.ok(contrast(palette[text],palette[background])>=4.5, `${text} on ${background}`)
    }
  }
  assert.ok(contrast('#ffffff','#595959')>=4.5, '65% black overlay over a worst-case white photo')
})
