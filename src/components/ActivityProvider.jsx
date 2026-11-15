import { useState } from 'react'
import { ActivityContext } from '../hooks/useActivity'
import useDailyActivity from '../hooks/useDailyActivity'

export default function ActivityProvider({ userId, timezone, children }) {
  const [welcomeDismissedDay, dismissWelcomeDay] = useState('')
  const app = useDailyActivity('app', userId, timezone)
  const noContact = useDailyActivity('noContact', userId, timezone)

  return (
    <ActivityContext.Provider value={{ app, noContact, timezone, welcomeDismissedDay, dismissWelcomeDay }}>
      {children}
    </ActivityContext.Provider>
  )
}
