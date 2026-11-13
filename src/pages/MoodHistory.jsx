import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import LoadingPlaceholder from '../components/ui/LoadingPlaceholder'
import Notice from '../components/ui/Notice'
import { moods } from '../data/moods'
import { getCheckInsInRange } from '../services/checkInService'
import { getLocalDate } from '../utils/dates'
import { moodHistoryRange, moodHistorySummary, moodPeriods } from '../utils/moodHistory'
import '../styles/MoodHistory.css'

const groupLabels = {
  heavier: 'Sad, angry or numb',
  lighter: 'Relieved or hopeful',
  mixed: 'Feelings from both groups',
  neutral: 'Other or no moods recorded',
  blank: 'No check-in saved',
}

function readToday(timezone) {
  try { return getLocalDate(timezone) } catch { return null }
}

function dateLabel(date, short = false) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', day: 'numeric', month: short ? 'short' : 'long',
    ...(short ? {} : { weekday: 'long', year: 'numeric' }),
  }).format(new Date(`${date}T00:00:00Z`))
}

export default function MoodHistory({ user, profile }) {
  const [today, setToday] = useState(() => readToday(profile.timezone))
  const [days, setDays] = useState(7)
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const dialogRef = useRef(null)
  const requestKey = `${user.id}:${profile.timezone}:${today}`
  const loading = !result || result.key !== requestKey

  useEffect(() => {
    const refresh = () => {
      const nextDate = readToday(profile.timezone)
      if (nextDate !== today) setSelectedDate(null)
      setToday(nextDate)
    }
    const interval = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [profile.timezone, today])

  useEffect(() => {
    if (!today) return
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    const { start, end } = moodHistoryRange(today)
    getCheckInsInRange(user.id, start, end, controller.signal)
      .then(rows => { if (active) setResult({ key: requestKey, rows }) })
      .catch(() => { if (active) setResult({ key: requestKey, error: true }) })
      .finally(() => window.clearTimeout(timeout))
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [user.id, today, requestKey, attempt])

  useEffect(() => {
    if (selectedDate) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [selectedDate])

  const summary = today && !loading && !result.error ? moodHistorySummary(result.rows, today, days) : null
  const selected = summary?.cells.find(cell => cell.date === selectedDate)
  const selectedMoods = moods.filter(mood => selected?.entry?.moods?.includes(mood.id))

  return (
    <PageShell className="mood-history">
      <PageHeader title="Mood history" subtitle="A view of the feelings you've shared. Every feeling has a place here." />
      <div className="mood-periods" role="group" aria-label="Days to show">
        {moodPeriods.map(period => (
          <Button key={period} type="button" secondary={days !== period} aria-pressed={days === period}
            onClick={() => { setSelectedDate(null); setDays(period) }}>{period} days</Button>
        ))}
      </div>
      {!today ? (
        <Notice variant="error">We couldn't read your saved timezone. Please check it in Settings.</Notice>
      ) : loading ? (
        <LoadingPlaceholder label="Loading your check-ins..." lines={4} />
      ) : result.error ? (
        <Card className="mood-summary">
          <Notice variant="error">We couldn't load your check-ins. Your saved moods and notes haven't changed.</Notice>
          <Button type="button" secondary onClick={() => { setResult(null); setAttempt(value => value + 1) }}>Retry</Button>
        </Card>
      ) : (
        <>
          <Card className="mood-summary">
            <p className="mood-summary-text" role="status">{summary.summary}</p>
            {summary.savedDays === 0 ? (
              <p>Your saved check-ins will appear here whenever you choose to share them.</p>
            ) : <p>{summary.savedDays} check-in {summary.savedDays === 1 ? 'day is' : 'days are'} included. Blank days simply have no saved check-in.</p>}
            {summary.comparison && <p className="mood-comparison">{summary.comparison}</p>}
          </Card>
          <section className="mood-days" aria-labelledby="mood-days-title">
            <h2 id="mood-days-title">Your days</h2>
            <p className="mood-date-range">{dateLabel(summary.start, true)} – {dateLabel(summary.end, true)} · {profile.timezone}</p>
            <p className="mood-help">Choose a day to read its check-in. Colours describe groups of feelings, not scores.</p>
            <ul className="mood-strip">
              {summary.cells.map(cell => (
                <li key={cell.date}>
                  <button type="button" className={`mood-day mood-day--${cell.group}`} onClick={() => setSelectedDate(cell.date)}
                    aria-label={`${dateLabel(cell.date)}: ${groupLabels[cell.group]}`}>
                    <time dateTime={cell.date}>{dateLabel(cell.date, true)}</time>
                    <span className="mood-day-mark" aria-hidden="true">{cell.entry ? (cell.group === 'heavier' ? 'H' : cell.group === 'lighter' ? 'L' : 'M') : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
            <ul className="mood-legend" aria-label="Mood groups">
              <li><span className="mood-swatch mood-day--heavier">H</span>Sad / Angry / Numb</li>
              <li><span className="mood-swatch mood-day--lighter">L</span>Relieved / Hopeful</li>
              <li><span className="mood-swatch mood-day--mixed">M</span>Mixed / other</li>
              <li><span className="mood-swatch mood-day--blank" aria-hidden="true" />No check-in saved</li>
            </ul>
          </section>
        </>
      )}
      <dialog ref={dialogRef} className="mood-day-dialog" aria-labelledby="mood-day-title" onClose={() => setSelectedDate(null)}>
        <div className="mood-dialog-heading">
          <h2 id="mood-day-title">{selectedDate ? dateLabel(selectedDate) : 'Your check-in'}</h2>
          <button type="button" className="mood-dialog-close" aria-label="Close check-in" onClick={() => dialogRef.current?.close()} autoFocus><X size={20} aria-hidden="true" /></button>
        </div>
        {selected?.entry ? (
          <>
            <h3>Moods</h3>
            {selectedMoods.length ? <ul className="mood-read-moods">{selectedMoods.map(mood => <li key={mood.id}>{mood.label}</li>)}</ul> : <p>No moods were recorded.</p>}
            <h3>Your note</h3>
            <p className="mood-read-note">{selected.entry.note?.trim() ? selected.entry.note : 'No note was added.'}</p>
          </>
        ) : <p>No check-in was saved on this day. There is nothing to make up.</p>}
      </dialog>
    </PageShell>
  )
}
