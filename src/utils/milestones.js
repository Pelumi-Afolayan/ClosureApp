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
  'Some days take more courage than others. Every confirmed day here represents a choice you made for yourself.',
  'Take a breath and notice how far you have come. You are allowed to be proud of these small, steady steps.',
  'You are making room for your own life again. Keep going gently, at a pace that feels right for you.',
]
