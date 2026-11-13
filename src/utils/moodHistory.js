const heavier = new Set(['sad', 'angry', 'numb'])
const lighter = new Set(['relieved', 'hopeful'])
export const moodPeriods = [7, 30, 90]

export function moodGroup(moods = []) {
  const hasHeavier = moods.some(mood => heavier.has(mood))
  const hasLighter = moods.some(mood => lighter.has(mood))
  if (hasHeavier && hasLighter) return 'mixed'
  if (hasHeavier) return 'heavier'
  if (hasLighter) return 'lighter'
  return 'neutral'
}

// Calendar-day arithmetic is UTC-only after deriving today's date in the
// profile timezone. DST does not add/drop days from an already-local date.
export function shiftMoodDate(date, offset) {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Invalid calendar date.')
  }
  parsed.setUTCDate(parsed.getUTCDate() + offset)
  return parsed.toISOString().slice(0, 10)
}

export function moodHistoryRange(today) {
  return { start: shiftMoodDate(today, -179), end: today }
}

export function moodPeriod(rows, today, days) {
  if (!moodPeriods.includes(days)) throw new Error('Choose 7, 30 or 90 days.')
  const start = shiftMoodDate(today, 1 - days)
  const indexed = new Map(rows.map(row => [row.check_in_date, row]))
  const cells = Array.from({ length: days }, (_, index) => {
    const date = shiftMoodDate(start, index)
    const entry = indexed.get(date) || null
    return { date, entry, group: entry ? moodGroup(entry.moods) : 'blank' }
  })
  const savedDays = cells.filter(cell => cell.entry).length
  // A mixed day still includes a hopeful/relieved feeling; each date counts once.
  const lighterDays = cells.filter(cell => cell.entry?.moods?.some(mood => lighter.has(mood))).length
  return { start, end: today, days, cells, savedDays, lighterDays }
}

export function moodHistorySummary(rows, today, days) {
  const current = moodPeriod(rows, today, days)
  const previous = moodPeriod(rows, shiftMoodDate(current.start, -1), days)
  const enoughData = current.savedDays >= Math.ceil(days / 2) && previous.savedDays >= Math.ceil(days / 2)
  return {
    ...current,
    summary: current.savedDays === 0 ? 'No check-ins saved in this period.'
      : `Hopeful or relieved on ${current.lighterDays} of the last ${days} days.`,
    comparison: enoughData ? `Previous ${days} days: hopeful or relieved on ${previous.lighterDays} days, with ${previous.savedDays} check-in days saved.` : null,
  }
}
