function previousDate(date) {
  const value = new Date(`${date}T00:00:00Z`)

  value.setUTCDate(value.getUTCDate() - 1)

  return value.toISOString().slice(0, 10)
}

export function calculateStreaks(checkInDates, today) {
  const dates = [...new Set(checkInDates)]
    .filter((date) => date <= today)
    .sort()

  const savedDates = new Set(dates)

  let currentStreak = 0
  let longestStreak = 0
  let runningStreak = 0
  let previousSavedDate = null

  for (const date of dates) {
    if (previousSavedDate === previousDate(date)) {
      runningStreak += 1
    } else {
      runningStreak = 1
    }

    longestStreak = Math.max(longestStreak, runningStreak)
    previousSavedDate = date
  }

  let dateToCheck = savedDates.has(today)
    ? today
    : previousDate(today)

  while (savedDates.has(dateToCheck)) {
    currentStreak += 1
    dateToCheck = previousDate(dateToCheck)
  }

  return {
    currentStreak,
    longestStreak,
    checkedInToday: savedDates.has(today),
  }
}
