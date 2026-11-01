import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BookOpen, Plus } from 'lucide-react'

import Button from '../components/ui/Button'
import JournalHeader from '../components/JournalHeader'
import { getJournalEntries } from '../services/journalService'
import { formatJournalDate } from '../utils/journalDates'
import '../styles/Journal.css'

export default function Journal({ user, profile }) {
  const [search] = useSearchParams()
  const requestedType = search.get('type')
  const entryType = ['journal', 'unsent_letter'].includes(requestedType) ? requestedType : 'all'
  const requestedPage = Number(search.get('page') || 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const requestKey = `${user.id}:${entryType}:${page}`

  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const loading = !result || result.key !== requestKey || result.loading

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setResult({ key: requestKey, loading: true })

    getJournalEntries(user.id, { page, entryType, signal: controller.signal })
      .then((data) => {
        if (active) setResult({ key: requestKey, ...data, loading: false })
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, error: true, loading: false })
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [user.id, entryType, page, requestKey, attempt])

  function pageUrl(nextPage) {
    return `/journal?type=${entryType}&page=${nextPage}`
  }

  const newEntryUrl = entryType === 'unsent_letter'
    ? '/journal/new?type=unsent_letter'
    : '/journal/new'

  return (
    <div className="journal-page">
      <JournalHeader />

      <main className="journal-main" id="journal-main">
        <div className="journal-title-row">
          <div>
            <p className="journal-eyebrow">ROOM FOR YOUR WORDS</p>
            <h1>{entryType === 'unsent_letter' ? 'Unsent Letters' : 'Your journal'}</h1>
            <p className="journal-description">
              {entryType === 'unsent_letter'
                ? 'Say what you need to say. These letters are saved here, never sent.'
                : 'Write freely. Come back to your words whenever you need to.'}
            </p>
          </div>

          <Link to={newEntryUrl} className="button button--primary">
            <Plus size={18} aria-hidden="true" />
            {entryType === 'unsent_letter' ? 'Write a letter' : 'New entry'}
          </Link>
        </div>

        <nav className="journal-filters" aria-label="Filter writing">
          <Link to="/journal" aria-current={entryType === 'all' ? 'page' : undefined}>All writing</Link>
          <Link to="/journal?type=journal" aria-current={entryType === 'journal' ? 'page' : undefined}>Journal entries</Link>
          <Link to="/journal?type=unsent_letter" aria-current={entryType === 'unsent_letter' ? 'page' : undefined}>Unsent letters</Link>
        </nav>

        {loading ? (
          <p role="status" className="journal-empty">Loading your writing…</p>
        ) : result.error ? (
          <div className="journal-empty">
            <p role="alert">We could not load your entries. Please try again.</p>
            <Button secondary onClick={() => setAttempt((current) => current + 1)}>Retry</Button>
          </div>
        ) : result.entries.length === 0 ? (
          <section className="journal-empty" aria-label="No entries">
            <BookOpen size={32} aria-hidden="true" />
            <h2>{page === 1 ? 'Start wherever you are.' : 'No more entries on this page.'}</h2>
            <p>{page === 1 ? 'A sentence is enough. There’s no right way to begin.' : 'Use Previous to return to your writing.'}</p>
            {page === 1 && <Link to={newEntryUrl} className="button button--primary">Write your first entry</Link>}
          </section>
        ) : (
          <ul className="journal-list">
            {result.entries.map((entry) => (
              <li key={entry.id}>
                <Link to={`/journal/${entry.id}`} className="journal-entry-card">
                  <span className="journal-entry-type">
                    {entry.entry_type === 'unsent_letter' ? 'Unsent letter' : 'Journal entry'}
                  </span>
                  <h2>{entry.title || 'Untitled entry'}</h2>
                  <p>
                    Created {formatJournalDate(entry.created_at, profile.timezone)}
                    {' · '}Open to read or edit
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && !result.error && (
          <nav className="journal-pagination" aria-label="Entry pages">
            {page > 1 && <Link to={pageUrl(page - 1)} className="button button--secondary">Previous</Link>}
            <span>Page {page}</span>
            {result.hasMore && <Link to={pageUrl(page + 1)} className="button button--secondary">Next</Link>}
          </nav>
        )}
      </main>
    </div>
  )
}
