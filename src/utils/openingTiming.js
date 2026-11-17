export const MINIMUM_OPENING_MS = 2000

export function remainingOpeningTime(startedAt, now) {
  return Math.min(MINIMUM_OPENING_MS, Math.max(0, MINIMUM_OPENING_MS - (now - startedAt)))
}
