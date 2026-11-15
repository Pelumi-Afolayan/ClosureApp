import NoContactMilestone from './NoContactMilestone'
import { Check } from 'lucide-react'
import Button from './ui/Button'
import LoadingPlaceholder from './ui/LoadingPlaceholder'
import Notice from './ui/Notice'
import { getActivityWeek } from '../utils/activityDisplay'

export default function StreakDetails({ tracker, kind, timezone, showCelebrations = true }) {
  const noContact = kind === 'noContact'

  if (tracker.error) {
    return (
      <div className="streak-error">
        <Notice variant="error">{tracker.error}</Notice>
        <Button secondary disabled={tracker.saving} onClick={tracker.retry}>Retry tracker</Button>
      </div>
    )
  }
  if (tracker.loading) return <LoadingPlaceholder label="Loading your progress…" />

  const days = tracker.current
  const countLabel = days === 1 ? '1 day' : `${days} days`
  const weeks = days > 0 && days % 7 === 0 ? `${days / 7} ${days === 7 ? 'week' : 'weeks'}` : null

  return (
    <>
      <p className="streak-summary">
        {days > 0 ? `${countLabel} ${noContact ? 'of no contact' : 'in a row'}` : noContact ? 'One day at a time' : 'Welcome back'}
      </p>
      <p className="streak-note">
        {noContact
          ? days > 0
            ? `${weeks ? `That’s ${weeks} of confirmed days. ` : ''}There’s no pace you need to keep. You can return when it feels useful.`
            : 'You can confirm a no-contact day if you choose. The tracker follows only the days you tell us about.'
          : 'Opening Closure while signed in counts once each day. Recording a mood is always optional.'}
      </p>

      <ol className="streak-week" aria-label={noContact ? 'Confirmed no-contact days this week' : 'App visits this week'}>
        {getActivityWeek(tracker.today, tracker.dates).map(({ date, weekday, day, recorded }) => (
          <li key={date} aria-current={date === tracker.today ? 'date' : undefined}>
            <span>{weekday}</span>
            <span className={`streak-day${recorded ? ' streak-day-saved' : ''}`}>
              {recorded ? <Check size={18} aria-hidden="true" /> : day}
            </span>
            <span className="streak-day-description">
              {date}: {recorded ? (noContact ? 'confirmed' : 'app opened') : date > tracker.today ? 'upcoming' : 'not recorded'}
            </span>
          </li>
        ))}
      </ol>

      {tracker.longest > days && <p className="streak-longest">Longest: {tracker.longest} {tracker.longest === 1 ? 'day' : 'days'}</p>}
      {noContact && (
        <div className="no-contact-confirmation">
          <Button
            requiresConnection
            disabled={tracker.loading || tracker.saving || tracker.recordedToday}
            onClick={tracker.confirmToday}
          >
            {tracker.saving ? 'Confirming…' : tracker.recordedToday ? 'Today is confirmed' : 'I kept no contact today'}
          </Button>
          <p className="streak-note">If you kept no contact today, you can record it here. Confirmations are optional and never added automatically.</p>
          <Notice variant="success">{tracker.message}</Notice>
        </div>
      )}
      {noContact && <NoContactMilestone tracker={tracker} showCelebrations={showCelebrations} />}
      <p className="streak-timezone">Days are counted in {timezone}.</p>
    </>
  )
}
