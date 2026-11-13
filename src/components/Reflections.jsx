import { useUrgeSession } from '../hooks/useUrgeSession'
import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import Button from './ui/Button'
import Card from './ui/Card'
import LeaveDialog from './ui/LeaveDialog'
import Notice from './ui/Notice'
import { getReflections, saveReflection, deleteReflection } from '../services/reflectionService'
import { validateReflection } from '../utils/reflectionRequests'
import '../styles/Reflections.css'

const sections = [
  ['lesson', "What I've learned", 'A thought you want to carry with you.'],
  ['my_part', "What I'd do differently", "Something I want to handle differently next time. This isn't about blame."],
  ['next_time', 'What I want next time', 'Needs, boundaries, or deal-breakers that matter to you.'],
  ['reality_check', 'The real picture', 'Problems that were actually there, written when things feel clear.'],
]
const reasonSections = [['reason', "My reasons", 'Your own reasons for making space. You can return to these when you need them.']]

export default function Reflections({ userId, reasonsOnly = false, source, onRetry }) {
  const { session } = useUrgeSession()
  const groups = reasonsOnly ? reasonSections : sections
  const [ownResult, setResult] = useState(null)
  const managed = Boolean(source)
  const result = source ? { owner: userId, ...source } : ownResult
  const [attempt, setAttempt] = useState(0)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [discard, setDiscard] = useState(false)
  const active = useRef(false)
  const request = useRef(false)
  const dialogRef = useRef(null)
  const dirty = Boolean(draft && draft.content !== draft.original)
  const blocker = useBlocker(dirty || busy)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => {
    if (managed) return
    let live = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    getReflections(userId, (reasonsOnly ? reasonSections : sections).map(([kind]) => kind), controller.signal)
      .then(rows => { if (live) setResult({ owner: userId, rows }) })
      .catch(() => { if (live) setResult({ owner: userId, error: true }) })
      .finally(() => clearTimeout(timeout))
    return () => { live = false; controller.abort(); clearTimeout(timeout) }
  }, [userId, reasonsOnly, attempt, managed])
  useEffect(() => {
    if (!dirty && !busy) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])
  useEffect(() => {
    const dialog = dialogRef.current
    if (blocker.state === 'blocked' || discard) {
      if (dialog && !dialog.open) dialog.showModal()
    } else if (dialog?.open) dialog.close()
  }, [blocker.state, discard])
  async function mutate(operation) {
    if (request.current) return
    if (navigator.onLine === false) {
      setError("You're offline. Your words are still here. Reconnect when you want to save.")
      return
    }
    request.current = true; setBusy(true); setError('')
    try {
      const row = await operation()
      if (!active.current) return
      session.applyChange(row)
      if (!source) setResult(current => ({ ...current, rows: row.deleted
        ? current.rows.filter(item => item.id !== row.id)
        : [row, ...current.rows.filter(item => item.id !== row.id)] }))
      setDraft(null)
    } catch {
      if (active.current) setError('That did not save. Your words are still here. Please try again.')
    } finally { request.current = false; if (active.current) setBusy(false) }
  }
  if (!result || result.owner !== userId || result.loading || (!result.rows && !result.error)) return <p role="status">Loading your reflections…</p>
  if (result.error) return <Card><p>We couldn't load your reflections. Your saved words haven't changed.</p><Button onClick={() => { if (source) onRetry?.(); else { setResult(null); setAttempt(value => value + 1) } }}>Retry</Button></Card>
  return <div className="reflections">
    <Notice variant="error">{error}</Notice>
    {groups.map(([kind, title, helper]) => <Card as="section" className="reflection-section" key={kind}>
      <h2>{title}</h2><p className="reflection-helper">{helper}</p>
      {result.rows.filter(row => row.kind === kind).length === 0 && <p>{reasonsOnly ? 'Writing two or three reasons when you feel calm can give you something steady to return to. Add one whenever you feel ready.' : 'Nothing written here yet. There is no need to rush.'}</p>}
      <ul className="reflection-list">{result.rows.filter(row => row.kind === kind).map(row => <li key={row.id}>
        <p className="reflection-content">{row.content}</p>
        <div className="reflection-actions"><Button variant="quiet" disabled={Boolean(draft) || busy} onClick={() => { setError(''); setDraft({ ...row, original: row.content }) }}>Edit</Button>
        <Button variant="quiet" disabled={Boolean(draft) || busy} onClick={() => {
          if (window.confirm('Delete this reflection? This cannot be undone.')) mutate(async () => { await deleteReflection(userId, row.id); return { id: row.id, deleted: true } })
        }}>Delete</Button></div>
      </li>)}</ul>
      {draft?.kind === kind ? <form className="reflection-form" onSubmit={event => {
        event.preventDefault()
        const validation = validateReflection(draft)
        if (validation) { setError(validation); return }
        mutate(() => saveReflection({ userId, ...draft }))
      }}>
        <label htmlFor={`reflection-${kind}`}>{draft.id ? 'Edit reflection' : 'Add a reflection'}</label>
        <textarea id={`reflection-${kind}`} rows={4} value={draft.content} disabled={busy} onChange={event => setDraft(current => ({ ...current, content: event.target.value }))} autoFocus />
        <p className="reflection-helper">{[...draft.content].length} / 1,000 characters</p>
        <div className="reflection-actions"><Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save reflection'}</Button><Button disabled={busy} type="button" variant="quiet" onClick={() => dirty ? setDiscard(true) : setDraft(null)}>Cancel</Button></div>
      </form> : <Button secondary disabled={Boolean(draft) || busy} onClick={() => { setError(''); setDraft({ kind, content: '', original: '' }) }}>Add reflection</Button>}
    </Card>)}
    <LeaveDialog dialogRef={dialogRef} idPrefix="reflection-leave" busy={busy}
      onStay={() => { setDiscard(false); if (blocker.state === 'blocked') blocker.reset() }}
      onLeave={() => { if (busy) return; setDiscard(false); setDraft(null); if (blocker.state === 'blocked') blocker.proceed() }} />
  </div>
}
