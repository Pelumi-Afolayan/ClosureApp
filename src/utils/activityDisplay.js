export function getActivityWeek(today, dates) {
  if (!today) return []
  const current = new Date(`${today}T12:00:00Z`)
  if (Number.isNaN(current.getTime())) return []
  current.setUTCDate(current.getUTCDate() - (current.getUTCDay() + 6) % 7)
  const recorded = new Set(dates)

  return Array.from({ length: 7 }, () => {
    const date = current.toISOString().slice(0, 10)
    const item = {
      date,
      weekday: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(current),
      day: current.getUTCDate(),
      recorded: date <= today && recorded.has(date),
    }
    current.setUTCDate(current.getUTCDate() + 1)
    return item
  })
}
