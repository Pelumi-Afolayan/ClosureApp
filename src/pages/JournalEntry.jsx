import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'

import Button from '../components/ui/Button'
import JournalHeader from '../components/JournalHeader'
import JournalEditor from '../components/JournalEditor'
import { getJournalEntry } from '../services/journalService'
import { formatJournalDate } from '../utils/journalDates'
import '../styles/Journal.css'

export default function JournalEntry({ user, profile }) {
  const { entryId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const initialType = search.get('type') === 'unsent_letter' ? 'unsent_letter' : 'journal'
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const key = `${user.id}:${entryId}`
  const loading = entryId && (!result || result.key !== key || result.loading)

  useEffect(() => {
    if (!entryId) return

    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setResult({ key, loading: true })

    getJournalEntry(user.id, entryId, controller.signal)
      .then((entry) => {
        if (active) setResult({ key, entry, loading: false })
      })
      .catch(() => {
        if (active) setResult({ key, error: true, loading: false })
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [user.id, entryId, key, attempt])

  const handleSaved = useCallback((savedEntry) => {
    if (!entryId) {
      navigate(`/journal/${savedEntry.id}`, { replace: true, state: { saved: true } })
    } else {
      setResult({ key, entry: savedEntry, loading: false })
    }
  }, [entryId, navigate, key])

  const returnToJournal = useCallback(() => navigate('/journal'), [navigate])

  const entry = entryId ? result?.entry : { entry_type: initialType }

  return (
    <div className="journal-page">
      <JournalHeader />

      <main className="journal-main journal-editor-page">
        <h1>{entryId ? 'Your words, in your own time.' : 'What’s on your mind?'}</h1>
        <p className="journal-description">No perfect words needed. Save whenever you’re ready.</p>

        {loading ? (
          <p role="status" className="journal-empty">Loading your entry…</p>
        ) : result?.error && entryId ? (
          <div className="journal-empty">
            <p role="alert">We could not load this entry. Your saved writing has not been changed.</p>
            <Button secondary onClick={() => setAttempt((current) => current + 1)}>Retry</Button>
            <Link to="/journal">Back to Journal</Link>
          </div>
        ) : entryId && !entry ? (
          <div className="journal-empty">
            <p>This entry is unavailable or has been deleted.</p>
            <Link to="/journal">Back to Journal</Link>
          </div>
        ) : (
          <>
            {entryId && location.state?.saved && <p role="status" className="journal-editor-status">Your writing is saved.</p>}
            {entryId && (
              <p className="journal-entry-dates">
                Created {formatJournalDate(entry.created_at, profile.timezone)}
                {' · '}Last edited {formatJournalDate(entry.updated_at, profile.timezone)}
              </p>
            )}
            <JournalEditor
              key={entryId || `new:${initialType}`}
              userId={user.id}
              entry={entry}
              onSaved={handleSaved}
              onCancel={returnToJournal}
              onDeleted={returnToJournal}
            />
          </>
        )}
      </main>
    </div>
  )
}
