import { Link } from 'react-router'
import { Leaf } from 'lucide-react'

export default function JournalHeader() {
  return (
    <header className="journal-header">
      <Link to="/today" className="journal-brand" aria-label="Closure Today">
        <Leaf size={24} aria-hidden="true" />
        closure.
      </Link>

      <nav aria-label="Your space" className="journal-navigation">
        <Link to="/today">Today</Link>
        <Link to="/journal">Journal</Link>
        <Link to="/journal?type=unsent_letter">Unsent Letters</Link>
      </nav>
    </header>
  )
}
