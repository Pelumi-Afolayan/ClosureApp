import { createContext, useContext } from 'react'

export const ActivityContext = createContext(null)

export function useActivity() {
  const value = useContext(ActivityContext)
  if (!value) throw new Error('Activity tracking needs its signed-in provider.')
  return value
}
