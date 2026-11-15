import { useId, useState } from 'react'
import Button from './ui/Button'
import { normalizeConfirmationDates } from '../utils/noContactHistory'
import '../styles/NoContactHistory.css'

export default function PastNoContactDays({ tracker }) {
  const id = useId()
  const [date, setDate] = useState('')
  const [chosen, setChosen] = useState([])
  const [error, setError] = useState('')

  function addDate() {
    try {
      const dates = normalizeConfirmationDates([...chosen, date], tracker.today)
      if (tracker.dates.includes(date)) { setError('That day is already confirmed.'); return }
      setChosen(dates)
      setDate('')
      setError('')
    } catch { setError('Choose a valid date up to today.') }
  }

  return (
    <details className="past-no-contact">
      <summary>Add past no-contact days</summary>
      <div className="past-no-contact__content">
        <p>Being away from Closure doesn’t mean you made contact. Choose only the days you kept no contact. There’s no need to fill every gap.</p>
        <label htmlFor={id}>Choose a day</label>
        <div className="past-no-contact__picker">
          <input id={id} type="date" min="0001-01-01" max={tracker.today} value={date}
            disabled={tracker.saving} onChange={event => { setDate(event.target.value); setError('') }} />
          <Button type="button" secondary disabled={!date || tracker.saving || chosen.length >= 366} onClick={addDate}>Add day</Button>
        </div>
        {chosen.length > 0 && <ul className="past-no-contact__days" aria-label="Days to confirm">
          {chosen.map(day => <li key={day}>
            <time dateTime={day}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`))}</time>
            <button type="button" disabled={tracker.saving} onClick={() => setChosen(chosen.filter(item => item !== day))} aria-label={`Remove ${day}`}>Remove</button>
          </li>)}
        </ul>}
        <Button type="button" requiresConnection disabled={chosen.length === 0 || tracker.saving} onClick={async () => {
          if (await tracker.confirmDates(chosen)) { setChosen([]); setDate(''); setError('') }
        }}>{tracker.saving ? 'Confirming…' : `Confirm chosen days${chosen.length ? ` (${chosen.length})` : ''}`}</Button>
        {error && <p role="status">{error}</p>}
      </div>
    </details>
  )
}
