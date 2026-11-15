import { smallSteps } from '../data/smallSteps.js'
export function getSmallStep({ userId, date, goals = [] }) {
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) throw new Error('A valid local date is required.')
  const selected = Object.keys(smallSteps).filter(kind => kind !== 'general' && goals.includes(kind))
  const options = selected.length ? selected.flatMap(kind => smallSteps[kind]) : smallSteps.general
  let hash = 0
  for (const letter of String(userId)) hash = (Math.imul(hash, 31) + letter.charCodeAt(0)) >>> 0
  return options[(hash + Math.floor(timestamp / 86400000)) % options.length]
}
