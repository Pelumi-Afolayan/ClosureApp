import JournalStartingPoint from './JournalStartingPoint'
import { useUrgeSession } from '../hooks/useUrgeSession'
import { canReleaseLetter, releaseLetter } from '../utils/letterRelease'
import { saveReflection } from '../services/reflectionService'
import { journalReflectionDraft, journalReflectionOptions, validateReflection } from '../utils/reflectionRequests'
import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'

import Button from './ui/Button'
import Card from './ui/Card'
import Field from './ui/Field'
import LeaveDialog from './ui/LeaveDialog'
import Notice from './ui/Notice'
import { deleteJournalEntry, saveJournalEntry } from '../services/journalService'
import { validateJournalEntry } from '../utils/journalRequests'
import '../styles/JournalEditor.css'
import '../styles/Reflections.css'

export default function JournalEditor({ userId, entry, metadata, selectedGoals = [], onSaved, onCancel, onDeleted }) {
  const { session: reflectionSession } = useUrgeSession()
  const selectionRef = useRef({ start: 0, end: 0 })
  const reflectionMenuRef = useRef(null)
  const [lessonKind, setLessonKind] = useState('lesson')
  const reflectionOption = journalReflectionOptions.find(option => option.kind === lessonKind)
  const initialValues = {
    title: entry?.title || '',
    content: entry?.content || '',
    entryType: entry?.entry_type || 'journal',
  }

  const [releasePhase, setReleasePhase] = useState('confirm')
  const [releaseError, setReleaseError] = useState('')
  const releaseDialogRef = useRef(null)
  const releaseAnimationRef = useRef(null)
  const releaseTimeoutRef = useRef(null)
  const [discardLesson, setDiscardLesson] = useState(false)
  const [lesson, setLesson] = useState(null)
  const [entryId, setEntryId] = useState(entry?.id)
  const [title, setTitle] = useState(initialValues.title)
  const [content, setContent] = useState(initialValues.content)
  const [entryType, setEntryType] = useState(initialValues.entryType)
  const [savedValues, setSavedValues] = useState(JSON.stringify(initialValues))
  const [busy, setBusy] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [completed, setCompleted] = useState(null)
  const requestRef = useRef(false)
  const dialogRef = useRef(null)
  const activeRef = useRef(false)

  const savedEntryType = JSON.parse(savedValues).entryType
  const releaseAvailable = canReleaseLetter({ entryId, entryType, savedEntryType })
  const currentValues = JSON.stringify({ title, content, entryType })
  const hasUnsavedChanges = currentValues !== savedValues || Boolean(lesson?.length)
  const blocker = useBlocker(hasUnsavedChanges || Boolean(busy))

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
      window.clearTimeout(releaseTimeoutRef.current)
      releaseAnimationRef.current?.(false)
      releaseAnimationRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!hasUnsavedChanges && !busy) return

    function warnBeforeClosing(event) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeClosing)
    return () => window.removeEventListener('beforeunload', warnBeforeClosing)
  }, [hasUnsavedChanges, busy])

  useEffect(() => {
    const dialog = dialogRef.current

    if (discardLesson || blocker.state === 'blocked') {
      if (!hasUnsavedChanges && !busy) {
        blocker.reset()
      } else if (dialog && !dialog.open) {
        dialog.showModal()
      }
    } else if (dialog?.open) {
      dialog.close()
    }
  }, [blocker, hasUnsavedChanges, busy, discardLesson])

  // Navigate only after React has recorded the clean saved version.
  useEffect(() => {
    if (!completed || hasUnsavedChanges || busy) return

    setCompleted(null)
    if (completed.deleted) onDeleted(completed)
    else onSaved(completed.entry)
  }, [completed, hasUnsavedChanges, busy, onSaved, onDeleted])

  async function handleSubmit(event) {
    event.preventDefault()
    if (requestRef.current || lesson !== null) return

    const validationError = validateJournalEntry({ content, entryType })
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    requestRef.current = true
    setBusy('save')
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const savedEntry = await saveJournalEntry({ userId, entryId, title, content, entryType })
      if (!activeRef.current) return

      setEntryId(savedEntry.id)
      setTitle(savedEntry.title)
      setContent(savedEntry.content)
      setEntryType(savedEntry.entry_type)
      setSavedValues(JSON.stringify({
        title: savedEntry.title,
        content: savedEntry.content,
        entryType: savedEntry.entry_type,
      }))
      setSuccessMessage('Saved. You can come back to this any time.')
      setCompleted({ entry: savedEntry })
    } catch {
      if (activeRef.current) {
        setErrorMessage('That didn’t save. What you wrote is still here, so try again.')
      }
    } finally {
      requestRef.current = false
      if (activeRef.current) setBusy('')
    }
  }

  async function handleDelete() {
    if (!entryId || requestRef.current) return

    const confirmed = window.confirm(
      'Permanently delete this entry? This cannot be undone. Any unsaved changes to it will also be discarded.'
    )
    if (!confirmed) return

    requestRef.current = true
    setBusy('delete')
    setErrorMessage('')

    try {
      await deleteJournalEntry(userId, entryId)
      if (!activeRef.current) return

      setSavedValues(currentValues)
      setCompleted({ deleted: true })
    } catch {
      if (activeRef.current) setErrorMessage('Could not delete this entry. Please try again.')
    } finally {
      requestRef.current = false
      if (activeRef.current) setBusy('')
    }
  }

  function openReflectionDraft(kind) {
    if (requestRef.current || lesson !== null) return
    const { start, end } = selectionRef.current
    const draft = journalReflectionDraft(kind, content, start, end)
    setLessonKind(draft.kind)
    setLesson(draft.content)
    setErrorMessage('')
    setSuccessMessage('')
    if (reflectionMenuRef.current) reflectionMenuRef.current.open = false
  }

  function openRelease() {
    if (!releaseAvailable || requestRef.current || lesson !== null) return
    setReleaseError('')
    setReleasePhase('confirm')
    releaseDialogRef.current?.showModal()
  }

  function finishReleaseAnimation() {
    window.clearTimeout(releaseTimeoutRef.current)
    const resolve = releaseAnimationRef.current
    releaseAnimationRef.current = null
    resolve?.(activeRef.current)
  }

  async function handleRelease() {
    if (!releaseAvailable || requestRef.current || lesson !== null) return
    requestRef.current = true
    setBusy('release')
    setReleaseError('')
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await releaseLetter({
        userId, entryId, entryType, savedEntryType,
        animate: () => new Promise(resolve => {
          releaseAnimationRef.current = resolve
          setReleasePhase('animating')
          // Fallback if an animation event is unavailable (for example, a hidden tab).
          releaseTimeoutRef.current = window.setTimeout(finishReleaseAnimation, 3000)
        }),
        deleteEntry: async (...args) => {
          if (activeRef.current) setReleasePhase('deleting')
          return deleteJournalEntry(...args)
        },
      })
      if (!activeRef.current || result.cancelled) return
      setSavedValues(currentValues)
      setCompleted(result)
      releaseDialogRef.current?.close()
    } catch {
      if (activeRef.current) {
        setReleasePhase('error')
        setReleaseError("We couldn't confirm the release. Your words are still here. Check your connection and try again when you're ready.")
      }
    } finally {
      window.clearTimeout(releaseTimeoutRef.current)
      releaseAnimationRef.current = null
      requestRef.current = false
      if (activeRef.current) setBusy('')
    }
  }

  return (
    <>
      <Card as="form" className={`journal-editor${entryType === 'unsent_letter' ? ' journal-editor--letter' : ''}`} onSubmit={handleSubmit} aria-busy={Boolean(busy)}>
        <fieldset disabled={Boolean(busy)}>
          <legend className="writing-accessible-label">{entryId ? 'Edit your writing' : 'Write a new entry'}</legend>


          {entryType === 'unsent_letter' && (
            <p className="journal-editor-hint">
              This stays here. It isn’t sent to anyone.
            </p>
          )}

          {!entryId && entryType === 'journal' && (
            <JournalStartingPoint selectedGoals={selectedGoals} title={title} onTitleChange={value => {
              setTitle(value)
              setSuccessMessage('')
            }} />
          )}

          <div className="journal-editor-title-row">
            <Field
              label="Title — optional"
              className="journal-title-field"
              controlClassName="journal-title-input"
              placeholder="Untitled"
              id="entry-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setSuccessMessage('')
              }}
            />

            <Field
              as="select"
              className="journal-type-field"
              label="Type of writing"
              id="entry-type"
              name="entryType"
              value={entryType}
              onChange={(event) => {
                setEntryType(event.target.value)
                setSuccessMessage('')
              }}
            >
              <option value="journal">Journal entry</option>
              <option value="unsent_letter">Unsent letter</option>
            </Field>
          </div>

          <Field
            as="textarea"
            label="Your words"
            className="journal-body-field"
            controlClassName="journal-body-input"
            placeholder={entryType === 'unsent_letter' ? 'What would you like to say?' : 'Start wherever you are…'}
            id="entry-content"
            name="content"
            onSelect={event => {
              selectionRef.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }
            }}
            value={content}
            onChange={(event) => {
              selectionRef.current = { start: event.target.selectionStart, end: event.target.selectionEnd }
              setContent(event.target.value)
              setSuccessMessage('')
            }}
            rows={12}
            required
          />

          {lesson === null && (
            <details className="journal-reflection-menu" ref={reflectionMenuRef}>
              <summary>Save as...</summary>
              <div className="journal-reflection-options">
                {journalReflectionOptions.map(option => (
                  <Button key={option.kind} type="button" variant="quiet" onClick={() => openReflectionDraft(option.kind)}>
                    Save as {option.label.toLowerCase()}
                  </Button>
                ))}
              </div>
            </details>
          )}
          {lesson !== null && (
            <div className="reflection-form journal-reflection-draft">
              <label htmlFor="journal-lesson">{reflectionOption.title}</label>
              <p className="journal-editor-hint">This copies your selected words, or the whole entry if nothing was selected. Edit this copy before saving; your journal stays as it is.</p>
              <textarea id="journal-lesson" autoFocus rows={4} value={lesson} onChange={event => setLesson(event.target.value)} />
              <p className="journal-editor-hint">{[...lesson].length} / 1,000 characters</p>
              <div className="journal-prompt-actions">
                <Button type="button" onClick={async () => {
                  const validation = validateReflection({ kind: lessonKind, content: lesson })
                  if (validation) { setErrorMessage(validation); return }
                  if (requestRef.current) return
                  if (navigator.onLine === false) {
                    setErrorMessage("You're offline. Your reflection draft is still here. Reconnect when you want to save.")
                    return
                  }
                  requestRef.current = true
                  setBusy('lesson')
                  setErrorMessage('')
                  try {
                    const savedReflection = await saveReflection({ userId, kind: lessonKind, content: lesson })
                    if (activeRef.current) {
                      reflectionSession.applyChange(savedReflection)
                      setLesson(null)
                      setSuccessMessage("Saved to What I'm learning. Your journal entry is unchanged.")
                    }
                  } catch {
                    if (activeRef.current) setErrorMessage('The reflection did not save. Your words are still here. Please try again.')
                  } finally {
                    requestRef.current = false
                    if (activeRef.current) setBusy('')
                  }
                }}>{busy === 'lesson' ? 'Saving...' : 'Save reflection'}</Button>
                <Button type="button" variant="quiet" onClick={() => {
                  if (lesson.length) setDiscardLesson(true)
                  else setLesson(null)
                }}>Cancel reflection</Button>
              </div>
            </div>
          )}
          <div className="journal-editor-actions">
            <Button type="submit" disabled={lesson !== null}>{busy === 'save' ? 'Saving…' : 'Save'}</Button>
            <Button type="button" variant="quiet" onClick={onCancel}>Cancel</Button>

            <div className="journal-save-details">
              {metadata && <p className="journal-entry-dates">{metadata}</p>}
              <p className="writing-save-state" role="status">
                {busy === 'save' ? 'Saving…' : hasUnsavedChanges ? 'Unsaved changes' : entryId ? 'All changes saved' : 'Not saved yet'}
              </p>
            </div>

            {releaseAvailable && (
              <Button type="button" secondary className="journal-release-action" disabled={lesson !== null} onClick={openRelease}>
                Release this letter
              </Button>
            )}

            {entryId && (
              <Button type="button" variant="quiet" className="journal-delete-text" disabled={lesson !== null} onClick={handleDelete}>
                {busy === 'delete' ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </div>
        </fieldset>

        <Notice variant="error" title="Couldn’t save">{errorMessage}</Notice>
        <Notice variant="success">{successMessage}</Notice>
      </Card>

      <dialog
        ref={releaseDialogRef}
        className="letter-release-dialog"
        aria-labelledby="letter-release-title"
        aria-describedby="letter-release-description"
        aria-busy={busy === 'release'}
        onCancel={event => { if (requestRef.current) event.preventDefault() }}
      >
        <h2 id="letter-release-title">A little room to let go</h2>
        <p id="letter-release-description">Releasing means this letter is deleted for good. You can also keep it.</p>
        {hasUnsavedChanges && <p className="letter-release-note">Any unsaved edits to this letter will also be discarded.</p>}
        {['animating', 'deleting', 'error'].includes(releasePhase) && (
          <div className="letter-release-window">
            <article className={`letter-release-text${releasePhase === 'error' ? '' : ' letter-release-text--leaving'}`} onAnimationEnd={event => {
              if (event.target === event.currentTarget) finishReleaseAnimation()
            }}>
              <h3>{title || 'Unsent letter'}</h3>
              <p>{content}</p>
            </article>
          </div>
        )}
        <p className="letter-release-note" role="status">
          {releasePhase === 'animating' ? 'Take a breath. Let these words settle.' : releasePhase === 'deleting' ? 'Finishing the release...' : ''}
        </p>
        <Notice variant="error" title="The release wasn't confirmed">{releaseError}</Notice>
        <div className="letter-release-actions">
          <Button type="button" disabled={busy === 'release'} onClick={handleRelease}>Release it</Button>
          <Button type="button" secondary disabled={busy === 'release'} onClick={() => releaseDialogRef.current?.close()} autoFocus>Keep it for now</Button>
        </div>
      </dialog>

      <LeaveDialog
        dialogRef={dialogRef}
        idPrefix="journal-leave"
        busy={Boolean(busy)}
        onStay={() => { setDiscardLesson(false); if (blocker.state === 'blocked') blocker.reset() }}
        onLeave={() => { if (busy) return; setDiscardLesson(false); setLesson(null); if (blocker.state === 'blocked') blocker.proceed() }}
      />
    </>
  )
}
