import LoadingPlaceholder from '../components/ui/LoadingPlaceholder'
import Notice from '../components/ui/Notice'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BookOpen, PenLine, Plus } from 'lucide-react'

import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
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
    <div className={`journal-page${entryType === 'unsent_letter' ? ' journal-page--letters' : ''}`}>
      <main className="journal-main" id="journal-main">
        <div className="journal-title-row">
          <div>
            <h1 className="journal-page-title">{entryType === 'unsent_letter' ? 'Unsent Letters' : 'Journal'}</h1>
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
          <Chip as={Link} to="/journal" selected={entryType === 'all'}>All writing</Chip>
          <Chip as={Link} to="/journal?type=journal" selected={entryType === 'journal'}>Journal entries</Chip>
          <Chip as={Link} to="/journal?type=unsent_letter" selected={entryType === 'unsent_letter'}>Unsent letters</Chip>
        </nav>

        {loading ? (
          <LoadingPlaceholder label="Loading your writing…" lines={4} />
        ) : result.error ? (
          <div className="journal-empty">
            <Notice variant="error">We couldn’t load this right now. Your saved writing hasn’t changed.</Notice>
            <Button secondary onClick={() => setAttempt((current) => current + 1)}>Retry</Button>
          </div>
        ) : result.entries.length === 0 ? (
          <section className="journal-empty" aria-label="No entries">
            {entryType === 'unsent_letter'
              ? <PenLine size={32} aria-hidden="true" />
              : <BookOpen size={32} aria-hidden="true" />}
            <h2>{page === 1 ? (entryType === 'unsent_letter' ? 'Write your first letter' : 'Start wherever you are.') : 'No more writing on this page.'}</h2>
            <p>{page === 1 ? (entryType === 'unsent_letter' ? 'This stays here. It isn’t sent to anyone.' : 'A sentence is enough. There’s no right way to begin.') : 'Use Previous to return to your writing.'}</p>
            {page === 1 && <Link to={newEntryUrl} className="button button--primary">{entryType === 'unsent_letter' ? 'Write a letter' : 'Write your first entry'}</Link>}
          </section>
        ) : (
          <ul className="journal-list">
            {result.entries.map((entry) => (
              <li key={entry.id}>
                <Card as={Link} to={`/journal/${entry.id}`} className={`journal-entry-card${entry.entry_type === 'unsent_letter' ? ' journal-entry-card--letter' : ''}`}>
                  <p className="journal-entry-date">{formatJournalDate(entry.created_at, profile.timezone)}</p>
                  <h2>{entry.title || (entry.entry_type === 'unsent_letter' ? 'Untitled letter' : 'Untitled entry')}</h2>
                  <span className="journal-entry-type">
                    {entry.entry_type === 'unsent_letter' ? 'Unsent letter' : 'Journal entry'}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {!loading && !result.error && (page > 1 || result.hasMore) && (
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
