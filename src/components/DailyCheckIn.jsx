import LoadingPlaceholder from './ui/LoadingPlaceholder'
import { useEffect, useRef, useState } from 'react'

import Button from './ui/Button'
import Card from './ui/Card'
import Chip from './ui/Chip'
import Field from './ui/Field'
import Notice from './ui/Notice'
import { moods } from '../data/moods'
import { getLocalDate } from '../utils/dates'
import { getCheckIn, saveCheckIn } from '../services/checkInService'

function readDate(timezone) {
  try {
    return getLocalDate(timezone)
  } catch {
    return null
  }
}

export default function DailyCheckIn({ userId, timezone, onSaved }) {
  const [checkInDate, setCheckInDate] = useState(() => readDate(timezone))
  const [selectedMoods, setSelectedMoods] = useState([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasSavedCheckIn, setHasSavedCheckIn] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [dayChanged, setDayChanged] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const savingRef = useRef(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!checkInDate) return

    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)

    setLoading(true)
    setLoadError(false)
    setMessage('')

    getCheckIn(userId, checkInDate, controller.signal)
      .then((saved) => {
        if (!active) return

        setSelectedMoods(saved?.moods || [])
        setNote(saved?.note || '')
        setHasSavedCheckIn(Boolean(saved))
        setSaveError(false)
      })
      .catch(() => {
        if (active) setLoadError(true)
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
  }, [userId, checkInDate, attempt])

  useEffect(() => {
    function checkDate() {
      // Keep the current draft until the user explicitly loads the new day.
      if (readDate(timezone) !== checkInDate) setDayChanged(true)
    }

    checkDate()
    const interval = window.setInterval(checkDate, 30000)
    window.addEventListener('focus', checkDate)
    document.addEventListener('visibilitychange', checkDate)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', checkDate)
      document.removeEventListener('visibilitychange', checkDate)
    }
  }, [timezone, checkInDate])

  function toggleMood(id) {
    setSelectedMoods((current) => (
      current.includes(id)
        ? current.filter((mood) => mood !== id)
        : [...current, id]
    ))
    setMessage('')
  }

  function loadNewDay() {
    const nextDate = readDate(timezone)
    if (!nextDate || savingRef.current) return

    setLoading(true)
    setDayChanged(false)
    setSelectedMoods([])
    setNote('')
    setMessage('')
    setCheckInDate(nextDate)
    setAttempt((current) => current + 1)
  }

  async function handleSaveCheckIn(event) {
    event.preventDefault()

    if (savingRef.current || loading || loadError || dayChanged) return

    if (readDate(timezone) !== checkInDate) {
      setDayChanged(true)
      return
    }

    if (selectedMoods.length === 0) {
      setMessage('Please choose at least one feeling.')
      setSaveError(true)
      return
    }

    savingRef.current = true
    setSaving(true)
    setMessage('')
    setSaveError(false)

    try {
      await saveCheckIn({
        userId,
        date: checkInDate,
        moods: selectedMoods,
        note,
      })

      if (!mountedRef.current) return

      onSaved?.()
      setHasSavedCheckIn(true)
      setMessage('Thank you for checking in.')

      if (readDate(timezone) !== checkInDate) setDayChanged(true)
    } catch {
      if (!mountedRef.current) return

      setMessage('That didn’t save. What you wrote is still here, so try again.')
      setSaveError(true)
    } finally {
      savingRef.current = false
      if (mountedRef.current) setSaving(false)
    }
  }

  return (
    <Card
      as="section"
      id="today-feelings"
      className="today-card today-feelings"
      aria-labelledby="feelings-title"
    >
      <h2 id="feelings-title">How are you feeling?</h2>

      <p className="today-card-description">
        Optional. Share how you’re feeling, if you’d like. Your mood does not affect either streak.
      </p>

      {checkInDate && (
        <p className="check-in-date">
          <time dateTime={checkInDate}>{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${checkInDate}T12:00:00Z`))}</time>
          <span className="check-in-timezone">{timezone}</span>
        </p>
      )}

      {!checkInDate ? (
        <Notice variant="error">
          We could not read your profile timezone. Open Settings
          and save your profile again before checking in.
        </Notice>
      ) : (
        <>
          {loading && <LoadingPlaceholder label="Loading your check-in…" />}

          {loadError && (
            <div className="check-in-notice">
              <Notice variant="error">
                We could not load your saved check-in. Saving is paused to protect your existing note.
              </Notice>
              <Button secondary onClick={() => setAttempt((current) => current + 1)}>
                Retry loading
              </Button>
            </div>
          )}

          {dayChanged && (
            <div className="check-in-notice" role="status">
              <p>
                It’s a new day. Start today’s check-in? The draft from yesterday won’t carry over.
              </p>
              <Button secondary disabled={saving} onClick={loadNewDay}>
                Discard draft and load the new day
              </Button>
            </div>
          )}

          <form onSubmit={handleSaveCheckIn} className="check-in-form" aria-busy={loading || saving}>
            <fieldset disabled={loading || saving || loadError || dayChanged}>
              <legend className="check-in-legend">Select every feeling that fits.</legend>

              <div className="today-feeling-options">
                {moods.map((mood) => (
                  <Chip
                    key={mood.id}
                    type="button"
                    selected={selectedMoods.includes(mood.id)}
                    onClick={() => toggleMood(mood.id)}
                  >
                    {mood.label}
                  </Chip>
                ))}
              </div>

              <Field
                as="textarea"
                label="Anything you’d like to add? Optional."
                id="check-in-note"
                name="note"
                controlClassName="check-in-note-input"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value)
                  setMessage('')
                }}
                rows={4}
              />

              <Button type="submit" className="check-in-save">
                {saving ? 'Saving…' : hasSavedCheckIn ? 'Update check-in' : 'Save check-in'}
              </Button>
            </fieldset>

            <Notice variant={saveError ? 'error' : 'success'}>{message}</Notice>
          </form>

          <p className="today-preview-note">
            Saving again updates this day’s check-in. Notes are optional.
          </p>
        </>
      )}
    </Card>
  )
}
