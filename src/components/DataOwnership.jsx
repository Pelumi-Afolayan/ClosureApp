import { useEffect, useId, useRef, useState } from 'react'
import { useBlocker } from 'react-router'
import { Download, Trash2, FileText, Braces, Check } from 'lucide-react'
import Button from './ui/Button'
import Card from './ui/Card'
import Notice from './ui/Notice'
import { exportAccountData, deleteAccount } from '../services/accountDataService'
import { formatAccountExport } from '../utils/accountExport'
import { getLocalDate } from '../utils/dates'
import '../styles/DataOwnership.css'

export default function DataOwnership({ userId, timezone = 'UTC', exportOnly = false }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [format, setFormat] = useState('markdown')
  const formatId = useId()
  const [busy, setBusy] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [permanent, setPermanent] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const dialogRef = useRef(null)
  const activeRef = useRef(false)
  const requestRef = useRef(false)
  const controllerRef = useRef(null)
  const blocker = useBlocker(busy === 'delete')

  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false; controllerRef.current?.abort() }
  }, [])
  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset()
  }, [blocker])
  useEffect(() => {
    if (busy !== 'delete') return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  async function download() {
    if (requestRef.current) return
    requestRef.current = true
    setBusy('export'); setError(''); setMessage('')
    const controller = new AbortController()
    controllerRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 60000)
    try {
      const data = await exportAccountData(userId, controller.signal)
      if (!activeRef.current) return
      const file = formatAccountExport(data, getLocalDate(timezone), format)
      const url = URL.createObjectURL(new Blob([file.text], { type: file.type }))
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = file.filename; anchor.hidden = true
      document.body.appendChild(anchor); anchor.click(); anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('Your download is ready. Keep it somewhere private, if you choose to save it.')
    } catch {
      if (activeRef.current) setError('Your download could not be prepared. Please check your connection and try again. No partial file was created.')
    } finally {
      window.clearTimeout(timeout); requestRef.current = false
      if (activeRef.current) setBusy('')
    }
  }

  async function removeAccount(event) {
    event.preventDefault()
    if (requestRef.current || confirmation !== 'DELETE' || !permanent) return
    requestRef.current = true; setBusy('delete'); setError('')
    try {
      await deleteAccount({ userId, confirmation, permanent })
    } catch (failure) {
      if (activeRef.current) setError(failure.message || 'Account deletion was not confirmed. Please try again.')
    } finally {
      requestRef.current = false
      if (activeRef.current) setBusy('')
    }
  }

  return (
    <section className="data-ownership" aria-labelledby="data-ownership-title">
      <h2 id="data-ownership-title">Your data, your choice</h2>
      <Card className="data-export" aria-labelledby="data-export-title">
        <h3 id="data-export-title">Download my data</h3>
        <p>Take a copy of your profile, moods, writing, story, reflections and activity dates. Nothing is sent elsewhere to prepare it. Only saved account data is included; save any device drafts first if you want them in the download.</p>
        <fieldset className="export-format" disabled={Boolean(busy)}>
          <legend>Download format</legend>
          <div className="export-format__options">
            {[
              { value: 'markdown', label: 'Markdown', description: 'A readable text file', Icon: FileText },
              { value: 'json', label: 'JSON', description: 'Structured data', Icon: Braces },
            ].map(({ value, label, description, Icon }) => (
              <label className="export-format__option" key={value}>
                <input
                  type="radio"
                  name={`${formatId}-format`}
                  value={value}
                  checked={format === value}
                  onChange={() => setFormat(value)}
                />
                <span className="export-format__choice">
                  <Icon size={24} aria-hidden="true" />
                  <span className="export-format__text">
                    <span className="export-format__name">{label}</span>
                    <span className="export-format__description">{description}</span>
                  </span>
                  <Check className="export-format__check" size={20} aria-hidden="true" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="button" requiresConnection secondary disabled={Boolean(busy)} onClick={download}><Download size={18} aria-hidden="true" />{busy === 'export' ? 'Preparing your download...' : 'Download my data'}</Button>
        <Notice variant="success">{message}</Notice>
      </Card>
      {!exportOnly && <Card className="account-danger" aria-labelledby="account-danger-title">
        <h3 id="account-danger-title">Delete my account</h3>
        <p>This permanently removes your Closure account, its saved data and this device’s drafts. You can download a copy above before choosing to leave.</p>
        <Button type="button" variant="quiet" className="account-delete-action" disabled={Boolean(busy)} onClick={() => {
          setError(''); setConfirmation(''); setPermanent(false); setDeleteOpen(true); dialogRef.current?.showModal()
        }}><Trash2 size={18} aria-hidden="true" />Delete my account</Button>
      </Card>}
      {!deleteOpen && <Notice variant="error">{error}</Notice>}
      <dialog ref={dialogRef} className="account-delete-dialog" onClose={() => setDeleteOpen(false)} aria-labelledby="account-delete-title" onCancel={event => { if (requestRef.current) event.preventDefault() }}>
        <h2 id="account-delete-title">Delete your account?</h2>
        <p>Your account, writing, letters, moods, story, reflections, activity dates and reminder registrations will be deleted permanently.</p>
        <p>If you want a copy, choose Keep my account and use Download my data first.</p>
        <form onSubmit={removeAccount} className="account-delete-form" aria-busy={busy === 'delete'}>
          <fieldset disabled={busy === 'delete'}>
            <legend className="writing-accessible-label">Confirm permanent account deletion</legend>
            <label htmlFor="account-delete-word">Type DELETE to confirm</label>
            <input id="account-delete-word" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={confirmation} onChange={event => setConfirmation(event.target.value)} required />
            <label className="account-permanent"><input type="checkbox" checked={permanent} onChange={event => setPermanent(event.target.checked)} required />I understand this is permanent and my saved data cannot be recovered in Closure.</label>
            <div className="account-delete-actions">
              <Button type="button" secondary onClick={() => { dialogRef.current?.close(); setError('') }} autoFocus>Keep my account</Button>
              <Button type="submit" variant="danger" disabled={confirmation !== 'DELETE' || !permanent}>{busy === 'delete' ? 'Deleting your account...' : 'Permanently delete my account'}</Button>
            </div>
          </fieldset>
          {busy === 'delete' && <p role="status">Please keep this page open while deletion is in progress.</p>}
          <Notice variant="error">{error}</Notice>
        </form>
      </dialog>
    </section>
  )
}
