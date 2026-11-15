const milestones = [3, 7, 10, 14, 21, 28, 30, 60, 90, 100, 120, 180, 200, 270, 365]
export function latestMilestone(days) {
  if (!Number.isInteger(days) || days < 3) return null
  return days >= 400 ? Math.floor(days / 100) * 100 : milestones.findLast((day) => day <= days)
}
export function milestoneLabel(days) {
  if (days === 120) return '120 days — about four months'
  if (days === 30) return '30 days — about a month'
  if (days % 7 === 0) return `${days} days — ${days / 7} weeks`
  return `${days} days`
}
export const milestoneMessages = [
  'You have kept choosing space for yourself, one day at a time. That effort deserves a moment of pride.',
  'These are days you chose to confirm. A number cannot capture everything you have been carrying.',
  'Take a breath and notice how far you have come. You are allowed to be proud of these small, steady steps.',
  'There is room for you here, on the steady days and the difficult ones. You can take your time.',
]

// Consume a confirmation even when popups are off, so enabling the preference
// later cannot replay an old confirmation. This never writes activity data.
export function getMilestoneAnnouncement(tracker, announcedKey, showCelebrations = true) {
  const { today, current: days, message, error, loading, saving, recordedToday } = tracker
  const key = `${today}:${days}`
  if (!message || error || loading || saving || !recordedToday
    || latestMilestone(days) !== days || announcedKey === key) return null
  return { key, open: showCelebrations !== false }
}
