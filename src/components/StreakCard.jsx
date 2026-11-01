import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'

import Button from './ui/Button'
import { getCheckInDates } from '../services/checkInService'
import { getLocalDate } from '../utils/dates'
import { calculateStreaks } from '../utils/streaks'

function readDate(timezone) {
  try {
    return getLocalDate(timezone)
  } catch {
    return null
  }
}

export default function StreakCard({ userId, timezone, revision }) {
  const [today, setToday] = useState(() => readDate(timezone))
  const [dates, setDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    function checkDate() {
      setToday(readDate(timezone))
    }

    function refreshOnReturn() {
      if (document.visibilityState === 'hidden') return
      checkDate()
      setAttempt((current) => current + 1)
    }

    const interval = window.setInterval(checkDate, 30000)
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [timezone])

  useEffect(() => {
    if (!today) return

    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 30000)

    setLoading(true)
    setFailed(false)

    getCheckInDates(userId, controller.signal)
      .then((savedDates) => {
        if (active) setDates(savedDates)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [userId, today, revision, attempt])

  const streaks = today ? calculateStreaks(dates, today) : null

  return (
    <section className="streak-card" aria-labelledby="streak-title">
      <div className="streak-heading">
        <CalendarDays size={23} aria-hidden="true" />
        <h2 id="streak-title">A little consistency, at your pace.</h2>
      </div>

      {!today ? (
        <p role="alert" className="check-in-error">
          We could not read your timezone. Please edit and save your profile again.
        </p>
      ) : loading ? (
        <p role="status">Loading your check-in streaks…</p>
      ) : failed ? (
        <div className="streak-error">
          <p role="alert">We could not load your streaks. Your saved check-ins are unchanged.</p>
          <Button secondary onClick={() => setAttempt((current) => current + 1)}>
            Retry streaks
          </Button>
        </div>
      ) : (
        <>
          <dl className="streak-stats">
            <div>
              <dt>Current streak</dt>
              <dd>
                {streaks.currentStreak}
                <span>{streaks.currentStreak === 1 ? 'day' : 'days'}</span>
              </dd>
            </div>

            <div>
              <dt>Longest streak</dt>
              <dd>
                {streaks.longestStreak}
                <span>{streaks.longestStreak === 1 ? 'day' : 'days'}</span>
              </dd>
            </div>
          </dl>

          <p className="streak-note" role="status">
            {streaks.checkedInToday
              ? 'You checked in today. Whatever the feeling, it counts.'
              : streaks.currentStreak > 0
                ? 'Your streak is still here. There’s time to check in today, when you’re ready.'
                : 'A new day is a chance to return. One saved check-in is a place to start.'}
          </p>

          <p className="streak-timezone">Days are counted in {timezone}.</p>
        </>
      )}
    </section>
  )
}
