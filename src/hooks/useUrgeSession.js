import { createContext, useContext } from 'react'

export const UrgeContext = createContext(null)

export function useUrgeSession() {
  const context = useContext(UrgeContext)
  if (!context) throw new Error('Urge session is unavailable outside the signed-in app.')
  return context
}
