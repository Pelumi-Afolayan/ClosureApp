import JournalReader from '../components/JournalReader'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import LoadingPlaceholder from '../components/ui/LoadingPlaceholder'
import Notice from '../components/ui/Notice'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'

import Button from '../components/ui/Button'
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
  const [editingKey, setEditingKey] = useState(null)
  const editing = Boolean(entryId && editingKey === location.key)
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const key = `${user.id}:${entryId}:${attempt}`
  const loading = entryId && (!result || result.key !== key || result.loading)

  useEffect(() => {
    if (!entryId) return

    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)

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
      setEditingKey(null)
    }
  }, [entryId, navigate, key])

  const handleDeleted = useCallback((result) => {
    if (result?.released) {
      navigate('/journal?type=unsent_letter', { replace: true, state: { letterReleased: true } })
    } else {
      navigate('/journal')
    }
  }, [navigate])

  // A same-page navigation changes location.key and returns to reading. The
  // existing editor blocker can intercept it before any draft is discarded.
  const cancelEditing = useCallback(() => {
    navigate(entryId ? `/journal/${entryId}` : '/journal', { replace: Boolean(entryId) })
  }, [entryId, navigate])

  const entry = entryId ? (result?.key === key ? result.entry : null) : { entry_type: initialType }

  return (
    <div className="journal-page">
      <PageShell width="narrow" className={`journal-main ${!entryId || editing ? 'journal-editor-page' : 'journal-reader-page'}`}>
        <PageHeader
          title={entry?.entry_type === 'unsent_letter' ? 'Unsent letter' : entryId ? 'Journal entry' : 'New entry'}
        />

        {loading ? (
          <LoadingPlaceholder label="Loading your entry…" lines={5} />
        ) : result?.error && entryId ? (
          <div className="journal-empty">
            <Notice variant="error">We couldn’t load this right now. Your saved writing hasn’t changed.</Notice>
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
            {entryId && location.state?.saved && <p role="status" className="writing-accessible-label">Saved. You can come back to this any time.</p>}
            {entryId && !editing ? (
              <JournalReader key={key} entry={entry} timezone={profile.timezone} onEdit={() => setEditingKey(location.key)} />
            ) : (
              <JournalEditor
                key={entryId || `new:${initialType}`}
                userId={user.id}
                selectedGoals={profile.goals}
                entry={entry}
                metadata={entryId ? (
                  <>Created {formatJournalDate(entry.created_at, profile.timezone)}
                    {' · '}Last edited {formatJournalDate(entry.updated_at, profile.timezone)}</>
                ) : null}
                onSaved={handleSaved}
                onCancel={cancelEditing}
                onDeleted={handleDeleted}
              />
            )}
          </>
        )}
      </PageShell>
    </div>
  )
}
