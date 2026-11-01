import { useState } from 'react'
import { Link } from 'react-router'
import { goals } from '../data/goals'
import {
  BookOpen,
  Heart,
  Leaf,
  LogOut,
  MessageCircle,
  Sun,
  Target,
} from 'lucide-react'

import Button from '../components/ui/Button'
import DailyCheckIn from '../components/DailyCheckIn'
import StreakCard from '../components/StreakCard'
import { supabase } from '../lib/supabase'
import '../styles/Today.css'


export default function Today({ user, profile }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [checkInRevision, setCheckInRevision] = useState(0)

  const preferredName = profile?.preferred_name || ''
  const selectedGoalLabels = goals.filter((goal) => profile?.goals?.includes(goal.id))

  async function handleSignOut() {
    if (loading) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' })

      if (error) {
        setMessage('Could not sign out. Please try again.')
      }
    } catch {
      setMessage('Could not reach the sign-out service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="today-shell">
      <a className="skip-link" href="#today-main">
        Skip to content
      </a>

      <aside className="today-sidebar" aria-label="Your space">
        <a href="#today-main" className="today-brand" aria-label="Closure home">
          <Leaf size={25} aria-hidden="true" />
          closure.
        </a>

        <p className="today-sidebar-label">YOUR SPACE</p>

        <nav className="today-navigation" aria-label="Home sections">
          <a href="#today-main" className="today-navigation-current">
            <Sun size={19} aria-hidden="true" />
            Today
          </a>

          <a href="#today-feelings">
            <Heart size={19} aria-hidden="true" />
            A moment to check in
          </a>

          <a href="#today-next">
            <Target size={19} aria-hidden="true" />
            What’s next
          </a>
          <Link to="/journal">
            <BookOpen size={19} aria-hidden="true" />
            Journal
          </Link>

          <Link to="/journal?type=unsent_letter">
            <MessageCircle size={19} aria-hidden="true" />
            Unsent Letters
          </Link>
        </nav>

        <div className="today-sidebar-note">
          <Leaf size={24} aria-hidden="true" />
          <p>There’s no deadline for finding your footing.</p>
        </div>

        <div className="today-account">
          <span className="today-account-label">Signed in as</span>
          <span className="today-account-email">{user.email}</span>

          <Button
            secondary
            disabled={loading}
            onClick={handleSignOut}
          >
            <LogOut size={16} aria-hidden="true" />
            {loading ? 'Signing out…' : 'Sign out of all devices'}
          </Button>

          <p role="alert" className="today-error">
            {message}
          </p>
        </div>
      </aside>

      <main id="today-main" className="today-main">
        <header className="today-heading">
          <p className="today-eyebrow">ONE DAY AT A TIME</p>

          <h1>
            {preferredName ? `Welcome, ${preferredName}.` : 'Welcome to your space.'}
          </h1>

          <p className="today-introduction">
            Take a breath. You don’t have to have it all figured out to be here.
          </p>
        </header>

        <section className="today-encouragement" aria-labelledby="encouragement-title">
          <div className="today-encouragement-copy">
            <p className="today-card-eyebrow">
              <Sun size={18} aria-hidden="true" />
              A LITTLE ENCOURAGEMENT
            </p>

            <h2 id="encouragement-title">
              An ending doesn’t take away everything you are.
            </h2>

            <p>
              There is still room for quiet mornings, new hopes, and a life
              that feels like yours. For now, one small step is enough.
            </p>
          </div>

          <div className="today-leaf-art" aria-hidden="true">
            <Leaf size={104} strokeWidth={1} />
          </div>
        </section>

        <StreakCard
          key={`${user.id}:${profile.timezone}`}
          userId={user.id}
          timezone={profile.timezone}
          revision={checkInRevision}
        />

        <div className="today-content-grid">
          <DailyCheckIn
            key={`${user.id}:${profile.timezone}`}
            userId={user.id}
            timezone={profile.timezone}
            onSaved={() => setCheckInRevision((current) => current + 1)}
          />

          <section
            id="today-next"
            className="today-card today-next"
            aria-labelledby="next-title"
          >
            <div className="today-card-heading">
              <Target size={21} aria-hidden="true" />
              <span className="today-preview-label">YOUR GOALS</span>
            </div>

            <h2 id="next-title">What matters to you.</h2>

            <p className="today-card-description">
              These are the goals you chose. There’s no deadline, and you can
              change them whenever you need to.
            </p>

            <ul className="today-saved-goals">
              {selectedGoalLabels.map((goal) => (
                <li key={goal.id}>{goal.label}</li>
              ))}
            </ul>

            <Link to="/onboarding" className="today-edit-goals">
              Edit my name and goals
            </Link>
          </section>
        </div>

        <section className="today-writing" aria-labelledby="writing-title">
          <div className="today-writing-heading">
            <h2 id="writing-title">A place for the things you carry.</h2>
            <Link to="/journal" className="today-edit-goals">Open your journal</Link>
          </div>

          <div className="today-writing-grid">
            <article className="today-writing-item">
              <BookOpen size={22} aria-hidden="true" />
              <h3><Link to="/journal">Your journal</Link></h3>
              <p>A place to write freely, without needing the perfect words.</p>
            </article>

            <article className="today-writing-item">
              <MessageCircle size={22} aria-hidden="true" />
              <h3><Link to="/journal?type=unsent_letter">Unsent letters</Link></h3>
              <p>Words you want to say, with no pressure to send them.</p>
            </article>

            <article className="today-writing-item">
              <Leaf size={22} aria-hidden="true" />
              <h3>Your story · Coming next</h3>
              <p>Reflect on what hurt and what you need, when you’re ready.</p>
            </article>
          </div>
        </section>

        <footer className="today-footer">
          Your account is ready. The rest of your space is growing, one step at a time.
        </footer>
      </main>
    </div>
  )
}
