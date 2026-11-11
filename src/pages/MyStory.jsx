import LoadingPlaceholder from '../components/ui/LoadingPlaceholder'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker } from 'react-router'

import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Field from '../components/ui/Field'
import LeaveDialog from '../components/ui/LeaveDialog'
import Notice from '../components/ui/Notice'
import { getStory, saveStory } from '../services/storyService'
import { storyAnswers } from '../utils/storyRequests'
import { formatJournalDate } from '../utils/journalDates'
import '../styles/MyStory.css'

function StoryForm({ userId, story, timezone, onSaved, onCancel }) {
  const [answers, setAnswers] = useState(() => storyAnswers(story))
  const [savedAnswers, setSavedAnswers] = useState(() => JSON.stringify(storyAnswers(story)))
  const [updatedAt, setUpdatedAt] = useState(story?.updated_at)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')
  const [completedStory, setCompletedStory] = useState(null)
  const savingRef = useRef(false)
  const activeRef = useRef(false)
  const dialogRef = useRef(null)

  const hasUnsavedChanges = JSON.stringify(answers) !== savedAnswers
  const blocker = useBlocker(hasUnsavedChanges || saving)

  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false }
  }, [])

  useEffect(() => {
    if (!hasUnsavedChanges && !saving) return

    function warnBeforeClosing(event) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeClosing)
    return () => window.removeEventListener('beforeunload', warnBeforeClosing)
  }, [hasUnsavedChanges, saving])

  useEffect(() => {
    const dialog = dialogRef.current

    if (blocker.state === 'blocked') {
      if (!hasUnsavedChanges && !saving) {
        blocker.reset()
      } else if (dialog && !dialog.open) {
        dialog.showModal()
      }
    } else if (dialog?.open) {
      dialog.close()
    }
  }, [blocker, hasUnsavedChanges, saving])

  useEffect(() => {
    if (!completedStory || hasUnsavedChanges || saving) return
    onSaved(completedStory)
  }, [completedStory, hasUnsavedChanges, saving, onSaved])

  function cancelEditing() {
    if (savingRef.current) return

    if (hasUnsavedChanges && !window.confirm('Discard your unsaved changes and return to reading your saved story?')) {
      return
    }

    onCancel()
  }

  function changeAnswer(field, value) {
    setAnswers((current) => ({ ...current, [field]: value }))
    setMessage('')
    setErrorMessage('')
  }

  async function handleSave(event) {
    event.preventDefault()
    if (savingRef.current) return

    savingRef.current = true
    setSaving(true)
    setErrorMessage('')
    setMessage('')

    try {
      const savedStory = await saveStory({ userId, ...answers })
      if (!activeRef.current) return

      const saved = storyAnswers(savedStory)
      setAnswers(saved)
      setSavedAnswers(JSON.stringify(saved))
      setUpdatedAt(savedStory.updated_at)
      setMessage('Saved. You can come back to this any time.')
      setCompletedStory(savedStory)
    } catch {
      if (activeRef.current) {
        setErrorMessage('That didn’t save. What you wrote is still here, so try again.')
      }
    } finally {
      savingRef.current = false
      if (activeRef.current) setSaving(false)
    }
  }

  return (
    <>
      {updatedAt && (
        <p className="story-last-saved">
          Last saved {formatJournalDate(updatedAt, timezone)}
        </p>
      )}

      <Card as="form" variant="tinted" className="story-form" onSubmit={handleSave} aria-busy={saving}>
        <fieldset disabled={saving}>
          <legend>Your story, in your own time</legend>
          <div className="story-edit-state">
            <span className="story-editing-badge">You’re editing</span>
            <span role="status">{saving ? 'Saving…' : hasUnsavedChanges ? 'Unsaved changes' : story ? 'All changes saved' : 'Not saved yet'}</span>
          </div>

          <Field
            as="textarea"
            label={<><span className="story-question-number" aria-hidden="true">1 of 3</span>What happened?</>}
            hint="Start wherever feels right. A few words are enough."
            autoFocus
            id="what-happened"
            name="whatHappened"
            value={answers.whatHappened}
            onChange={(event) => changeAnswer('whatHappened', event.target.value)}
            rows={5}
          />

          <Field
            as="textarea"
            label={<><span className="story-question-number" aria-hidden="true">2 of 3</span>What hurt you?</>}
            hint="Only share what you feel ready to put into words."
            id="what-hurt"
            name="whatHurt"
            value={answers.whatHurt}
            onChange={(event) => changeAnswer('whatHurt', event.target.value)}
            rows={5}
          />

          <Field
            as="textarea"
            label={<><span className="story-question-number" aria-hidden="true">3 of 3</span>What do you need now?</>}
            hint="It’s okay if you’re still figuring that out."
            id="what-i-need"
            name="whatINeed"
            value={answers.whatINeed}
            onChange={(event) => changeAnswer('whatINeed', event.target.value)}
            rows={5}
          />

          <div className="story-actions">
            <Button type="submit">{saving ? 'Saving…' : 'Save my story'}</Button>
            {story ? (
              <Button type="button" secondary onClick={cancelEditing}>
                Cancel editing
              </Button>
            ) : (
              <Link to="/today" className="button button--secondary">Back to Today</Link>
            )}
          </div>
        </fieldset>

        <Notice variant="error" title="Couldn’t save">{errorMessage}</Notice>
        <Notice variant="success">{message}</Notice>
        <p className="story-hint">
          {hasUnsavedChanges
            ? 'You have unsaved changes.'
            : 'Answers save only when you click Save my story. You can clear an answer and save it blank.'}
        </p>
      </Card>

      <LeaveDialog
        dialogRef={dialogRef}
        idPrefix="story-leave"
        busy={saving}
        onStay={() => blocker.state === 'blocked' && blocker.reset()}
        onLeave={() => blocker.state === 'blocked' && blocker.proceed()}
      />
    </>
  )
}

function StoryReader({ story, timezone, onEdit }) {
  const firstHeadingRef = useRef(null)

  useEffect(() => {
    firstHeadingRef.current?.focus()
  }, [])

  const sections = [
    { title: 'What happened?', answer: story.what_happened },
    { title: 'What hurt you?', answer: story.what_hurt },
    { title: 'What do you need now?', answer: story.what_i_need },
  ]

  return (
    <Card as="article" className="story-reader" aria-label="Your saved story">
      <div className="story-reader-toolbar">
        <div>
          <h2 className="story-reader-title" ref={firstHeadingRef} tabIndex={-1}>Your story</h2>
          <p className="story-last-saved">Last saved {formatJournalDate(story.updated_at, timezone)}</p>
        </div>
        <Button type="button" variant="secondary" onClick={onEdit}>Edit</Button>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="story-reader-section">
          <h2>
            {section.title}
          </h2>
          {section.answer?.trim() ? (
            <p className="story-reader-answer">{section.answer}</p>
          ) : (
            <p className="story-reader-empty">Not written yet. That’s okay.</p>
          )}
        </section>
      ))}

    </Card>
  )
}

export default function MyStory({ user, profile }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const loading = !result || result.owner !== user.id || result.loading

  const handleSaved = useCallback((savedStory) => {
    setResult({ owner: user.id, story: savedStory, loading: false })
    setEditing(false)
    setSavedMessage('Saved. You can come back to this any time.')
  }, [user.id])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setResult({ owner: user.id, loading: true })

    getStory(user.id, controller.signal)
      .then((story) => {
        if (active) setResult({ owner: user.id, story, loading: false })
      })
      .catch(() => {
        if (active) setResult({ owner: user.id, error: true, loading: false })
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [user.id, attempt])

  function handleEdit() {
    setSavedMessage('')
    setEditing(true)
  }

  function handleCancel() {
    setSavedMessage('')
    setEditing(false)
  }

  return (
    <div className="story-page">
      <main className="story-main">
        <h1>My Story</h1>
        <p className="story-introduction">
          A place to reflect on what happened and what you need now.
          Every question is optional. You can leave anything blank and return whenever you’re ready.
        </p>

        {loading ? (
          <LoadingPlaceholder label="Loading your story…" lines={5} />
        ) : result.error ? (
          <div className="story-notice">
            <Notice variant="error">
              We couldn’t load this right now. Your saved writing hasn’t changed. Saving is paused until we can load it.
            </Notice>
            <Button secondary onClick={() => setAttempt((current) => current + 1)}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <Notice variant="success">{savedMessage}</Notice>
            {result.story && !editing ? (
              <StoryReader
                story={result.story}
                timezone={profile.timezone}
                onEdit={handleEdit}
              />
            ) : (
              <StoryForm
                key={user.id}
                userId={user.id}
                story={result.story}
                timezone={profile.timezone}
                onSaved={handleSaved}
                onCancel={handleCancel}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
