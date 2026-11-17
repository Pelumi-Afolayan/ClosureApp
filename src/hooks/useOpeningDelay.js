import { useEffect, useState } from 'react'
import { remainingOpeningTime } from '../utils/openingTiming'

// One minimum per app mount, not another delay for every auth/profile request.
export default function useOpeningDelay() {
  const [startedAt] = useState(() => performance.now())
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), remainingOpeningTime(startedAt, performance.now()))
    return () => window.clearTimeout(timer)
  }, [startedAt])
  return ready
}
