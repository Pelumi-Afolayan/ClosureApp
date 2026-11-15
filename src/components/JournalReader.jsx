import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import Button from './ui/Button'
import Card from './ui/Card'
import { formatJournalDate } from '../utils/journalDates'

export default function JournalReader({ entry, timezone, onEdit }) {
  const titleRef = useRef(null)
  const letter = entry.entry_type === 'unsent_letter'
  const title = entry.title?.trim() ? entry.title : letter ? 'Untitled letter' : 'Untitled entry'

  useEffect(() => { titleRef.current?.focus() }, [])

  return (
    <Card as="article" className={`journal-reader${letter ? ' journal-reader--letter' : ''}`} aria-labelledby="journal-reader-title">
      <div className="journal-reader-toolbar">
        <div className="journal-reader-heading">
          <p className="journal-reader-type">{letter ? 'Unsent letter' : 'Journal entry'}</p>
          <h2 id="journal-reader-title" ref={titleRef} tabIndex={-1}>{title}</h2>
          <p className="journal-reader-dates">
            Created {formatJournalDate(entry.created_at, timezone)}
            {' · '}Last edited {formatJournalDate(entry.updated_at, timezone)}
          </p>
        </div>
        <Button type="button" secondary onClick={onEdit}>Edit</Button>
      </div>
      <p className="journal-reader-content">{entry.content}</p>
      <Link to={letter ? '/journal?type=unsent_letter' : '/journal'} className="journal-reader-back">
        {letter ? 'Back to Unsent letters' : 'Back to Journal'}
      </Link>
    </Card>
  )
}
