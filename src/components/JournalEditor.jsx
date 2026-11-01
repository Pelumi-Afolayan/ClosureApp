import { useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'

import Button from './ui/Button'
import { deleteJournalEntry, saveJournalEntry } from '../services/journalService'
import { validateJournalEntry } from '../utils/journalRequests'
import '../styles/JournalEditor.css'

export default function JournalEditor({ userId, entry, onSaved, onCancel, onDeleted }) {
  const initialValues = {
    title: entry?.title || '',
    content: entry?.content || '',
    entryType: entry?.entry_type || 'journal',
  }

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

  const currentValues = JSON.stringify({ title, content, entryType })
  const hasUnsavedChanges = currentValues !== savedValues
  const blocker = useBlocker(hasUnsavedChanges || Boolean(busy))

  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false }
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

    if (blocker.state === 'blocked') {
      if (!hasUnsavedChanges && !busy) {
        blocker.reset()
      } else if (dialog && !dialog.open) {
        dialog.showModal()
      }
    } else if (dialog?.open) {
      dialog.close()
    }
  }, [blocker, hasUnsavedChanges, busy])

  // Navigate only after React has recorded the clean saved version.
  useEffect(() => {
    if (!completed || hasUnsavedChanges || busy) return

    setCompleted(null)
    if (completed.deleted) onDeleted()
    else onSaved(completed.entry)
  }, [completed, hasUnsavedChanges, busy, onSaved, onDeleted])

  async function handleSubmit(event) {
    event.preventDefault()
    if (requestRef.current) return

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
      setSuccessMessage('Your writing is saved.')
      setCompleted({ entry: savedEntry })
    } catch {
      if (activeRef.current) {
        setErrorMessage('We could not save your writing. Your draft is still here. Please try again.')
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

  return (
    <>
      <form className="journal-editor" onSubmit={handleSubmit} aria-busy={Boolean(busy)}>
        <fieldset disabled={Boolean(busy)}>
          <legend>{entryId ? 'Edit your writing' : 'A little room for your words'}</legend>

          <label htmlFor="entry-title">Title — optional</label>
          <input
            id="entry-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setSuccessMessage('')
            }}
          />

          <label htmlFor="entry-type">Type of writing</label>
          <select
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
          </select>

          {entryType === 'unsent_letter' && (
            <p className="journal-editor-hint">
              This letter stays in your journal. It will not be sent to anyone.
            </p>
          )}

          <label htmlFor="entry-content">Your words</label>
          <textarea
            id="entry-content"
            name="content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
              setSuccessMessage('')
            }}
            rows={12}
            required
          />

          <div className="journal-editor-actions">
            <Button type="submit">{busy === 'save' ? 'Saving…' : 'Save writing'}</Button>
            <Button type="button" secondary onClick={onCancel}>Back to Journal</Button>

            {entryId && (
              <button type="button" className="journal-delete" onClick={handleDelete}>
                {busy === 'delete' ? 'Deleting…' : 'Delete entry'}
              </button>
            )}
          </div>
        </fieldset>

        <p role="alert" className="journal-editor-error">{errorMessage}</p>
        <p role="status" className="journal-editor-status">{successMessage}</p>
        <p className="journal-editor-hint">
          {hasUnsavedChanges ? 'You have unsaved changes.' : 'Changes are saved only when you choose Save writing.'}
        </p>
      </form>

      <dialog
        ref={dialogRef}
        className="journal-leave-dialog"
        aria-labelledby="leave-title"
        aria-describedby="leave-description"
        onCancel={(event) => {
          event.preventDefault()
          if (blocker.state === 'blocked') blocker.reset()
        }}
      >
        <h2 id="leave-title">Keep your words?</h2>
        <p id="leave-description">
          {busy
            ? 'Please wait for the current request to finish before leaving.'
            : 'Your changes have not been saved. Stay to keep writing, or discard the changes and leave.'}
        </p>
        <div className="journal-editor-actions">
          <Button type="button" onClick={() => blocker.state === 'blocked' && blocker.reset()}>
            Stay here
          </Button>
          <Button
            type="button"
            secondary
            disabled={Boolean(busy)}
            onClick={() => blocker.state === 'blocked' && blocker.proceed()}
          >
            Discard and leave
          </Button>
        </div>
      </dialog>
    </>
  )
}
