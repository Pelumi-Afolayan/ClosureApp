import { useState } from 'react'
import { Link } from 'react-router'
import { goals } from '../data/goals'
import {
  BookOpen,
  Leaf,
  MessageCircle,
  Target,
} from 'lucide-react'

import DailyCheckIn from '../components/DailyCheckIn'
import DailyEncouragement from '../components/DailyEncouragement'
import StreakCard from '../components/StreakCard'
import '../styles/Today.css'


export default function Today({ user, profile }) {
  const [checkInRevision, setCheckInRevision] = useState(0)

  const preferredName = profile?.preferred_name || ''
  const selectedGoalLabels = goals.filter((goal) => profile?.goals?.includes(goal.id))

  return (
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

      <DailyEncouragement
        userId={user.id}
        selectedGoals={profile.goals}
        timezone={profile.timezone}
      />

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
            <h3><Link to="/my-story">My Story</Link></h3>
            <p>Reflect on what hurt and what you need, when you’re ready.</p>
          </article>
        </div>
      </section>

      <footer className="today-footer">
        Your account is ready. The rest of your space is growing, one step at a time.
      </footer>
    </main>
  )
}
