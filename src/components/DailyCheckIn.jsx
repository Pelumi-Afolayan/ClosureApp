import { useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'

import Button from './ui/Button'
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
      setMessage(`Your check-in for ${checkInDate} is saved.`)

      if (readDate(timezone) !== checkInDate) setDayChanged(true)
    } catch {
      if (!mountedRef.current) return

      setMessage('We could not save your check-in. Your answers are still here. Please try again.')
      setSaveError(true)
    } finally {
      savingRef.current = false
      if (mountedRef.current) setSaving(false)
    }
  }

  return (
    <section
      id="today-feelings"
      className="today-card today-feelings"
      aria-labelledby="feelings-title"
    >
      <div className="today-card-heading">
        <Heart size={21} aria-hidden="true" />
        <span className="today-preview-label">DAILY CHECK-IN</span>
      </div>

      <h2 id="feelings-title">How are you feeling?</h2>

      <p className="today-card-description">
        More than one feeling can be true. Every feeling counts.
      </p>

      {checkInDate && (
        <p className="check-in-date">
          <time dateTime={checkInDate}>{checkInDate}</time>
          {' · '}{timezone}
        </p>
      )}

      {!checkInDate ? (
        <p role="alert" className="check-in-error">
          We could not read your profile timezone. Open “Edit my name and goals”
          and save your profile again before checking in.
        </p>
      ) : (
        <>
          {loading && <p role="status" className="check-in-notice">Loading your check-in…</p>}

          {loadError && (
            <div className="check-in-notice">
              <p role="alert">
                We could not load your saved check-in. Saving is paused to protect your existing note.
              </p>
              <Button secondary onClick={() => setAttempt((current) => current + 1)}>
                Retry loading
              </Button>
            </div>
          )}

          {dayChanged && (
            <div className="check-in-notice" role="status">
              <p>
                A new day has started in your timezone. Your current draft has not
                been moved to the new day. Loading the new day discards unsaved changes here.
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
                  <button
                    key={mood.id}
                    type="button"
                    className="today-feeling"
                    aria-pressed={selectedMoods.includes(mood.id)}
                    onClick={() => toggleMood(mood.id)}
                  >
                    {mood.label}
                  </button>
                ))}
              </div>

              <label htmlFor="check-in-note" className="check-in-note-label">
                Anything you’d like to add? Optional.
              </label>

              <textarea
                id="check-in-note"
                name="note"
                className="check-in-note-input"
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

            <p
              role={saveError ? 'alert' : 'status'}
              className={saveError ? 'check-in-message check-in-error' : 'check-in-message'}
            >
              {message}
            </p>
          </form>

          <p className="today-preview-note">
            Saving again updates this day’s check-in. Notes are optional.
          </p>
        </>
      )}
    </section>
  )
}
