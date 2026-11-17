import { useId, useState } from 'react'
import { CalendarRange, Hash } from 'lucide-react'
import Button from './ui/Button'
import { confirmationDateRange, confirmationDaysEndingOn } from '../utils/noContactHistory'
import '../styles/NoContactHistory.css'

function displayDate(value) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

export default function PastNoContactDays({ tracker }) {
  const id = useId()
  const [mode, setMode] = useState('range')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState(tracker.today)
  const [count, setCount] = useState('')
  let selected = []
  let error = ''
  const hasInput = mode === 'range' ? Boolean(start && end) : Boolean(count && end)
  if (hasInput) {
    try {
      selected = mode === 'range'
        ? confirmationDateRange(start, end, tracker.today)
        : confirmationDaysEndingOn(count, end, tracker.today)
    } catch (failure) { error = failure.message }
  }
  const recorded = new Set(tracker.dates)
  const newDates = selected.filter(date => !recorded.has(date))
  const alreadyRecorded = selected.length - newDates.length

  return (
    <details className="past-no-contact">
      <summary>Add no-contact days</summary>
      <div className="past-no-contact__content">
        <p>Your time before Closure counts too. Add a date range, or enter how many consecutive days you kept no contact. Choose only days you want to confirm.</p>
        <fieldset className="past-no-contact__modes" disabled={tracker.saving}>
          <legend className="writing-accessible-label">How would you like to add days?</legend>
          {[
            { value: 'range', label: 'Date range', Icon: CalendarRange },
            { value: 'count', label: 'Number of days', Icon: Hash },
          ].map(({ value, label, Icon }) => (
            <label key={value} className="past-no-contact__mode">
              <input type="radio" name={`${id}-mode`} value={value} checked={mode === value} onChange={() => setMode(value)} />
              <span><Icon size={18} aria-hidden="true" />{label}</span>
            </label>
          ))}
        </fieldset>
        <div className="past-no-contact__range">
          <div className="past-no-contact__field">
            {mode === 'range' ? <>
              <label htmlFor={`${id}-start`}>From</label>
              <input id={`${id}-start`} type="date" min="0001-01-01" max={end || tracker.today} value={start}
                disabled={tracker.saving} onChange={event => setStart(event.target.value)} aria-describedby={`${id}-hint`} />
            </> : <>
              <label htmlFor={`${id}-count`}>Consecutive days</label>
              <input id={`${id}-count`} type="number" inputMode="numeric" min="1" max="366" step="1" placeholder="For example, 30" value={count}
                disabled={tracker.saving} onChange={event => setCount(event.target.value)} aria-describedby={`${id}-hint`} />
            </>}
          </div>
          <div className="past-no-contact__field">
            <label htmlFor={`${id}-end`}>{mode === 'range' ? 'To (included)' : 'Ending on (included)'}</label>
            <input id={`${id}-end`} type="date" min="0001-01-01" max={tracker.today} value={end}
              disabled={tracker.saving} onChange={event => setEnd(event.target.value)} aria-describedby={`${id}-hint`} />
          </div>
        </div>
        <p id={`${id}-hint`} className="past-no-contact__hint">Both dates are included. Up to 366 days per confirmation; you can add another range for a longer history. No days are added until you confirm.</p>
        <div aria-live="polite" aria-atomic="true">
          {selected.length > 0 && <div className="past-no-contact__preview">
            <strong>{selected.length} {selected.length === 1 ? 'day' : 'days'} selected</strong>
            <p>{displayDate(selected[0])} to {displayDate(selected.at(-1))}</p>
            {alreadyRecorded > 0 && <p>{alreadyRecorded} already confirmed. These won’t be counted twice.</p>}
            {newDates.length === 0 && <p>All of these days are already recorded.</p>}
          </div>}
          {error && <p>{error}</p>}
        </div>
        <Button type="button" requiresConnection disabled={newDates.length === 0 || tracker.saving} onClick={async () => {
          if (await tracker.confirmDates(newDates)) { setStart(''); setCount('') }
        }}>{tracker.saving ? 'Confirming…' : `Confirm${newDates.length ? ` ${newDates.length}` : ''} ${newDates.length === 1 ? 'day' : 'days'} of no contact`}</Button>
      </div>
    </details>
  )
}
