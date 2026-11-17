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

// Inclusive calendar dates, calculated in UTC so daylight-saving changes do not
// add or remove a day. These can predate the person's Closure account.
export function confirmationDateRange(start, end, today) {
  if (!validActivityDate(start) || !validActivityDate(end) || !validActivityDate(today)
    || start > end || end > today) {
    throw new Error('Choose a start date and an end date up to today. The end must be on or after the start.')
  }
  const first = new Date(`${start}T12:00:00Z`)
  const count = Math.round((new Date(`${end}T12:00:00Z`) - first) / 86400000) + 1
  if (count > 366) throw new Error('Choose up to 366 days at a time. You can add another range for a longer history.')
  return Array.from({ length: count }, (_, index) => new Date(first.getTime() + index * 86400000).toISOString().slice(0, 10))
}

export function confirmationDaysEndingOn(count, end, today) {
  if (!/^\d+$/.test(String(count)) || !Number.isSafeInteger(Number(count)) || Number(count) < 1 || Number(count) > 366) {
    throw new Error('Enter a whole number from 1 to 366. You can add another range for a longer history.')
  }
  if (!validActivityDate(end) || !validActivityDate(today) || end > today) throw new Error('Choose an end date up to today.')
  const start = new Date(new Date(`${end}T12:00:00Z`).getTime() - (Number(count) - 1) * 86400000).toISOString().slice(0, 10)
  return confirmationDateRange(start, end, today)
}
