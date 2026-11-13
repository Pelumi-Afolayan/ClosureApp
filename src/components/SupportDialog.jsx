import { useEffect, useId, useRef, useState } from 'react'
import { Copy, X } from 'lucide-react'
import Button from './ui/Button'
import { emergencyFallback, supportCountries } from '../data/supportResources'
import { copySupportMessage, friendMessage, groundingDuration, groundingStep, suggestedSupportCountry, verifiedSupportResources } from '../utils/support'
import '../styles/Support.css'

function SupportContent({ timezone }) {
  const id = useId()
  const [country, setCountry] = useState(() => suggestedSupportCountry(timezone))
  const [startedAt, setStartedAt] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [copyState, setCopyState] = useState('')
  const step = groundingStep(elapsed)
  const running = startedAt !== null && !step.complete
  const resources = verifiedSupportResources(country)
  const messageRef = useRef(null)

  useEffect(() => {
    if (!running) return
    function tick() {
      // Measure elapsed time, rather than counting ticks in background tabs.
      setElapsed(Math.min(groundingDuration, Math.floor((performance.now() - startedAt) / 1000)))
    }
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [running, startedAt])

  function start() {
    setElapsed(0)
    setStartedAt(performance.now())
  }

  function stop() {
    setStartedAt(null)
    setElapsed(0)
  }

  async function copy() {
    const copied = await copySupportMessage(navigator.clipboard)
    setCopyState(copied ? 'Copied. You can choose who to share it with.' : 'You can select the message below and copy it yourself.')
    if (!copied) { messageRef.current?.focus(); messageRef.current?.select() }
  }

  return (
    <div className="support-sections">
      <section aria-labelledby={`${id}-grounding`}>
        <h3 id={`${id}-grounding`}>A quiet minute</h3>
        <p>You can follow a gentle breath, or simply notice your feet against the floor. Take it at your own pace; stop whenever you like.</p>
        <div className={`support-grounding${running ? ' support-grounding--running' : ''}`}>
          <div className="support-breath-circle" aria-hidden="true" />
          <div className="support-breath-copy">
            <p aria-live="polite" aria-atomic="true">{startedAt === null ? 'A little room to pause.' : step.cue}</p>
            <p className="support-small">{startedAt === null ? '60 seconds, only if you want.' : step.complete ? 'Your quiet minute is complete.' : `${step.remaining} seconds remaining`}</p>
          </div>
        </div>
        <p className="support-small">Static guide: breathe in gently for about 4 seconds, then let your breath out for about 6. Repeat at a comfortable pace for a minute, or name five things you can see.</p>
        <div className="support-actions">
          <Button type="button" onClick={start} disabled={running}>{step.complete ? 'Try another minute' : 'Start a quiet minute'}</Button>
          {running && <Button type="button" variant="quiet" onClick={stop}>Stop for now</Button>}
        </div>
      </section>

      <section aria-labelledby={`${id}-friend`}>
        <h3 id={`${id}-friend`}>Reach out to someone</h3>
        <p>Is there a friend or someone you trust you might like to text? You can use these words, change them, or leave them here.</p>
        <label className="support-small" htmlFor={`${id}-message`}>An optional message</label>
        <textarea id={`${id}-message`} ref={messageRef} className="support-message" readOnly rows={3} value={friendMessage} />
        <Button type="button" secondary onClick={copy}><Copy size={18} aria-hidden="true" />Copy message</Button>
        <p className="support-small" role="status">{copyState}</p>
      </section>

      <section aria-labelledby={`${id}-resources`}>
        <h3 id={`${id}-resources`}>Crisis resources</h3>
        <label htmlFor={`${id}-country`}>Country</label>
        <select id={`${id}-country`} value={country} onChange={(event) => setCountry(event.target.value)}>
          <option value="">Another country / choose a country</option>
          {supportCountries.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
        </select>
        <p className="support-small">The starting choice is suggested by your saved timezone, which may not match where you are. You can change it here.</p>
        {resources.length > 0 ? (
          <ul className="support-resources">
            {resources.map((resource) => (
              <li key={`${resource.country}:${resource.name}`}>
                <h4>{resource.name}</h4>
                {resource.contact && <p>{resource.contact}</p>}
                {resource.url && <a href={resource.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Visit the official website (opens a new tab)</a>}
              </li>
            ))}
          </ul>
        ) : <p>There are no verified local contacts listed here yet.</p>}
        <p className="support-emergency">{emergencyFallback}</p>
      </section>
      <p className="support-small">Nothing you choose here is saved or sent. Copying the optional message only places it on your clipboard. External websites, if listed, need an internet connection.</p>
    </div>
  )
}

export default function SupportDialog({ open, onClose, timezone }) {
  const id = useId()
  const dialogRef = useRef(null)
  const headingRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) {
      dialog.showModal()
      headingRef.current?.focus()
    } else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className="support-dialog" aria-labelledby={`${id}-title`} onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close() }}>
      <div className="support-panel">
        <div className="support-heading">
          <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1}>You don't have to carry this alone.</h2>
          <button type="button" className="support-close" aria-label="Close support" onClick={() => dialogRef.current?.close()} autoFocus><X size={22} aria-hidden="true" /></button>
        </div>
        {open && <SupportContent timezone={timezone} />}
      </div>
    </dialog>
  )
}
