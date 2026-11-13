import { useState, useSyncExternalStore } from 'react'
import { UrgeContext } from '../hooks/useUrgeSession'
import { getReflections } from '../services/reflectionService'
import { createUrgeSession } from '../utils/urge'

export default function UrgeSessionProvider({ userId, children }) {
  const [session] = useState(() => createUrgeSession({
    async loadReflections() {
      if (navigator.onLine === false) throw new Error('Connection unavailable')
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 15000)
      try {
        return await getReflections(userId, ['reason', 'reality_check'], controller.signal)
      } finally {
        window.clearTimeout(timeout)
      }
    },
  }))
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)

  return <UrgeContext.Provider value={{ session, state }}>{children}</UrgeContext.Provider>
}
