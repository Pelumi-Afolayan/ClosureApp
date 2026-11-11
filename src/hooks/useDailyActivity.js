import { useCallback, useEffect, useRef, useState } from 'react'
import { getLocalDate } from '../utils/dates'
import { calculateStreaks } from '../utils/streaks'
import { confirmNoContact, getActivityDates, recordAppVisit } from '../services/activityService'

function readDate(timezone) {
  try {
    return getLocalDate(timezone)
  } catch {
    return null
  }
}

export default function useDailyActivity(kind, userId, timezone) {
  const [today, setToday] = useState(() => readDate(timezone))
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ dates: [], loading: true, error: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const busyRef = useRef(false)
  const confirmationRef = useRef(null)
  const requestVersionRef = useRef(0)
  const mountedRef = useRef(false)
  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      confirmationRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    function updateDate() {
      if (document.visibilityState === 'hidden') return
      setToday(readDate(timezone))
    }
    function refreshOnReturn() {
      if (document.visibilityState === 'hidden') return
      updateDate()
      retry()
    }
    const interval = window.setInterval(updateDate, 30000)
    window.addEventListener('focus', refreshOnReturn)
    window.addEventListener('online', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshOnReturn)
      window.removeEventListener('online', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [timezone, retry])

  useEffect(() => {
    if (!today) return
    let active = true
    const version = ++requestVersionRef.current
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setState((current) => ({ ...current, loading: true, error: '' }))
    setMessage('')

    async function load() {
      // Reading no-contact history must NEVER confirm a day automatically.
      if (kind === 'app' && document.visibilityState !== 'hidden') {
        await recordAppVisit(controller.signal)
      }
      const dates = await getActivityDates(kind, userId, controller.signal)
      if (active && version === requestVersionRef.current) setState({ dates, loading: false, error: '' })
    }

    load().catch(() => {
      if (active && version === requestVersionRef.current) setState((current) => ({
        ...current,
        loading: false,
        error: kind === 'app'
          ? 'We couldn’t verify today’s visit. It may already have been recorded. Retry to refresh your streak.'
          : 'We couldn’t load your no-contact history. Please try again. Nothing was confirmed automatically.',
      }))
    }).finally(() => window.clearTimeout(timeout))

    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [kind, userId, today, attempt])

  async function confirmToday() {
    if (kind !== 'noContact' || busyRef.current || state.loading || state.error || !today) return
    if (state.dates.includes(today)) return
    const currentDate = readDate(timezone)
    if (currentDate !== today) {
      setToday(currentDate)
      setMessage('It’s a new day. Please confirm again for today once the tracker has loaded.')
      return
    }

    busyRef.current = true
    setSaving(true)
    setMessage('')
    const controller = new AbortController()
    confirmationRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)

    try {
      const savedDate = await confirmNoContact(controller.signal)
      if (!mountedRef.current) return
      // A slower history response must not erase a just-confirmed day.
      requestVersionRef.current += 1
      setState((current) => ({
        ...current,
        dates: [...new Set([...current.dates, savedDate])],
        loading: false,
        error: '',
      }))
      setMessage('Today is confirmed. You’re giving yourself space, one day at a time.')
      if (savedDate !== today) setToday(savedDate)
    } catch {
      requestVersionRef.current += 1
      if (mountedRef.current) setState((current) => ({
        ...current,
        loading: false,
        error: 'We couldn’t verify that confirmation. It may have been saved. Retry to check before confirming again.',
      }))
    } finally {
      window.clearTimeout(timeout)
      busyRef.current = false
      if (mountedRef.current) setSaving(false)
    }
  }

  const counts = today ? calculateStreaks(state.dates, today) : null

  return {
    today,
    dates: state.dates,
    loading: state.loading,
    error: !today ? 'We couldn’t read your timezone. Please open Settings and save your profile again.' : state.error,
    current: counts?.currentStreak || 0,
    longest: counts?.longestStreak || 0,
    recordedToday: counts?.checkedInToday || false,
    saving,
    message,
    retry,
    confirmToday,
  }
}
