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

  return (
    <>
      <Card as="form" className={`journal-editor${entryType === 'unsent_letter' ? ' journal-editor--letter' : ''}`} onSubmit={handleSubmit} aria-busy={Boolean(busy)}>
        <fieldset disabled={Boolean(busy)}>
          <legend className="writing-accessible-label">{entryId ? 'Edit your writing' : 'Write a new entry'}</legend>
          <p className="writing-save-state" role="status">
            {busy === 'save' ? 'Saving…' : hasUnsavedChanges ? 'Unsaved changes' : entryId ? 'All changes saved' : 'Not saved yet'}
          </p>

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

          {entryType === 'unsent_letter' && (
            <p className="journal-editor-hint">
              This stays here. It isn’t sent to anyone.
            </p>
          )}

          <Field
            as="textarea"
            label="Your words"
            className="journal-body-field"
            controlClassName="journal-body-input"
            placeholder={entryType === 'unsent_letter' ? 'What would you like to say?' : 'Start wherever you are…'}
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
            <Button type="button" secondary onClick={onCancel}>Cancel</Button>

            {entryId && (
              <Button type="button" variant="danger" onClick={handleDelete}>
                {busy === 'delete' ? 'Deleting…' : 'Delete entry'}
              </Button>
            )}
          </div>
        </fieldset>

        <Notice variant="error" title="Couldn’t save">{errorMessage}</Notice>
        <Notice variant="success">{successMessage}</Notice>
      </Card>

      <LeaveDialog
        dialogRef={dialogRef}
        idPrefix="journal-leave"
        busy={Boolean(busy)}
        onStay={() => blocker.state === 'blocked' && blocker.reset()}
        onLeave={() => blocker.state === 'blocked' && blocker.proceed()}
      />
    </>
  )
}
