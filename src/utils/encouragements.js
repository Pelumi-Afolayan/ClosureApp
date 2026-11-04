import { encouragements } from '../data/encouragements.js'

function getAccountOffset(userId) {
  let value = 0

  for (const character of userId) {
    value = (Math.imul(value, 31) + character.charCodeAt(0)) >>> 0
  }

  return value
}

export function getDailyEncouragement({ selectedGoals = [], localDate, userId }) {
  const matchingGoals = Object.keys(encouragements)
    .filter((goalId) => goalId !== 'general' && selectedGoals.includes(goalId))

  const matchingMessages = matchingGoals.flatMap(
    (goalId) => encouragements[goalId]
  )

  const messages = matchingMessages.length > 0
    ? matchingMessages
    : encouragements.general

  if (!messages?.length) {
    throw new Error('No encouragement messages are available.')
  }

  const timestamp = Date.parse(`${localDate}T00:00:00Z`)

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(localDate)
    || !Number.isFinite(timestamp)
    || new Date(timestamp).toISOString().slice(0, 10) !== localDate
  ) {
    throw new Error('A valid local date is required.')
  }

  const dayNumber = Math.floor(timestamp / 86400000)
  const accountOffset = getAccountOffset(userId)
  const messageIndex = (
    (dayNumber + accountOffset) % messages.length + messages.length
  ) % messages.length

  return messages[messageIndex]
}
