import { useRef } from 'react'
import { Flame, ShieldCheck, X } from 'lucide-react'
import Card from './ui/Card'
import StreakDetails from './StreakDetails'
import { useActivity } from '../hooks/useActivity'

export default function StreakCard({ kind = 'app' }) {
  const dialogRef = useRef(null)
  const activity = useActivity()
  const tracker = activity[kind]
  const noContact = kind === 'noContact'
  const Icon = noContact ? ShieldCheck : Flame
  const title = noContact ? 'No contact' : 'App streak'
  const dialogId = `${kind}-streak-dialog`
  const count = `${tracker.current} ${tracker.current === 1 ? 'day' : 'days'}`

  return (
    <>
      <button
        type="button"
        className={`streak-trigger${noContact ? ' streak-trigger--no-contact' : ''}`}
        aria-label={`View ${title.toLowerCase()} details`}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={() => dialogRef.current?.showModal()}
      >
        <Icon size={20} aria-hidden="true" />
        <span>{noContact ? 'No contact' : 'App'}{!tracker.loading && !tracker.error && tracker.current > 0 ? ` · ${count}` : ''}</span>
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        className="streak-dialog"
        aria-labelledby={`${dialogId}-title`}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close()
        }}
      >
        <Card variant="tinted" className="streak-panel">
          <div className="streak-heading">
            <Icon size={22} aria-hidden="true" />
            <h2 id={`${dialogId}-title`}>{title}</h2>
            <button
              type="button"
              className="streak-close"
              aria-label={`Close ${title.toLowerCase()} details`}
              onClick={() => dialogRef.current?.close()}
              autoFocus
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <StreakDetails tracker={tracker} kind={kind} timezone={activity.timezone} />
        </Card>
      </dialog>
    </>
  )
}
