export function validActivityDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function normalizeConfirmationDates(dates, today) {
  if (!validActivityDate(today) || !Array.isArray(dates) || dates.length < 1 || dates.length > 366
    || dates.some(date => !validActivityDate(date) || date > today)) {
    throw new Error('Choose valid dates up to today, with at most 366 dates at a time.')
  }
  return [...new Set(dates)].sort()
}

// A gap in app visits says nothing about contact or how someone felt.
export function hasVisitGap(dates, today) {
  if (!validActivityDate(today)) return false
  const previous = dates.filter(date => validActivityDate(date) && date < today).sort().at(-1)
  if (!previous) return false
  return (new Date(`${today}T12:00:00Z`) - new Date(`${previous}T12:00:00Z`)) / 86400000 > 1
}
