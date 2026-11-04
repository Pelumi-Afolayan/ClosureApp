import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useBlocker } from 'react-router'

import Button from '../components/ui/Button'
import { getStory, saveStory } from '../services/storyService'
import { storyAnswers } from '../utils/storyRequests'
import { formatJournalDate } from '../utils/journalDates'
import '../styles/Journal.css'
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
      setMessage('Your story is saved.')
      setCompletedStory(savedStory)
    } catch {
      if (activeRef.current) {
        setErrorMessage('We could not save your story. Your answers are still here. Please try again.')
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

      <form className="story-form" onSubmit={handleSave} aria-busy={saving}>
        <fieldset disabled={saving}>
          <legend>Your story, in your own time</legend>

          <label htmlFor="what-happened">What happened?</label>
          <p id="happened-hint" className="story-hint">
            Start wherever feels right. A few words are enough.
          </p>
          <textarea
            id="what-happened"
            name="whatHappened"
            value={answers.whatHappened}
            onChange={(event) => changeAnswer('whatHappened', event.target.value)}
            aria-describedby="happened-hint"
            rows={5}
          />

          <label htmlFor="what-hurt">What hurt you?</label>
          <p id="hurt-hint" className="story-hint">
            Only share what you feel ready to put into words.
          </p>
          <textarea
            id="what-hurt"
            name="whatHurt"
            value={answers.whatHurt}
            onChange={(event) => changeAnswer('whatHurt', event.target.value)}
            aria-describedby="hurt-hint"
            rows={5}
          />

          <label htmlFor="what-i-need">What do you need now?</label>
          <p id="need-hint" className="story-hint">
            It’s okay if you’re still figuring that out.
          </p>
          <textarea
            id="what-i-need"
            name="whatINeed"
            value={answers.whatINeed}
            onChange={(event) => changeAnswer('whatINeed', event.target.value)}
            aria-describedby="need-hint"
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

        <p role="alert" className="story-error">{errorMessage}</p>
        <p role="status" className="story-status">{message}</p>
        <p className="story-hint">
          {hasUnsavedChanges
            ? 'You have unsaved changes.'
            : 'Answers save only when you click Save my story. You can clear an answer and save it blank.'}
        </p>
      </form>

      <dialog
        ref={dialogRef}
        className="story-leave-dialog"
        aria-labelledby="story-leave-title"
        aria-describedby="story-leave-description"
        onCancel={(event) => {
          event.preventDefault()
          if (blocker.state === 'blocked') blocker.reset()
        }}
      >
        <h2 id="story-leave-title">Keep your changes?</h2>
        <p id="story-leave-description">
          {saving
            ? 'Please wait for saving to finish before leaving.'
            : 'Your changes haven’t been saved. Stay to keep writing, or discard the changes and leave.'}
        </p>
        <div className="story-actions">
          <Button type="button" onClick={() => blocker.state === 'blocked' && blocker.reset()}>
            Stay here
          </Button>
          <Button
            type="button"
            secondary
            disabled={saving}
            onClick={() => blocker.state === 'blocked' && blocker.proceed()}
          >
            Discard and leave
          </Button>
        </div>
      </dialog>
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
    <article className="story-reader" aria-label="Your saved story">
      <div className="story-reader-toolbar">
        <p className="story-last-saved">
          Last saved {formatJournalDate(story.updated_at, timezone)}
        </p>
        <Button type="button" onClick={onEdit}>Edit my story</Button>
      </div>

      {sections.map((section, index) => (
        <section key={section.title} className="story-reader-section">
          <h2 ref={index === 0 ? firstHeadingRef : undefined} tabIndex={-1}>
            {section.title}
          </h2>
          {section.answer?.trim() ? (
            <p className="story-reader-answer">{section.answer}</p>
          ) : (
            <p className="story-reader-empty">You haven’t answered this yet. That’s okay.</p>
          )}
        </section>
      ))}

      <Link to="/today" className="button button--secondary">Back to Today</Link>
    </article>
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
    setSavedMessage('Your story is saved.')
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
    <div className="journal-page">
      <main className="story-main">
        <p className="journal-eyebrow">NO NEED TO TELL IT ALL AT ONCE</p>
        <h1>My Story</h1>
        <p className="story-introduction">
          A place to reflect on what happened and what you need now.
          Every question is optional. You can leave anything blank and return whenever you’re ready.
        </p>

        {loading ? (
          <p role="status" className="story-notice">Loading your story…</p>
        ) : result.error ? (
          <div className="story-notice">
            <p role="alert">
              We could not load your story. Saving is paused so existing answers aren’t accidentally overwritten.
            </p>
            <Button secondary onClick={() => setAttempt((current) => current + 1)}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <p role="status" className="story-status">{savedMessage}</p>
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
