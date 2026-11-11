import { ActivityContext } from '../hooks/useActivity'
import useDailyActivity from '../hooks/useDailyActivity'

export default function ActivityProvider({ userId, timezone, children }) {
  const app = useDailyActivity('app', userId, timezone)
  const noContact = useDailyActivity('noContact', userId, timezone)

  return (
    <ActivityContext.Provider value={{ app, noContact, timezone }}>
      {children}
    </ActivityContext.Provider>
  )
}
