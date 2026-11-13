import SupportButton from '../components/SupportButton'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import { Link, useOutletContext } from 'react-router'
import { BookHeart, BookOpen, CalendarDays, ChevronRight, PenLine } from 'lucide-react'

import { goals } from '../data/goals'
import DailyCheckIn from '../components/DailyCheckIn'
import DailyEncouragement from '../components/DailyEncouragement'
import StreakCard from '../components/StreakCard'
import '../styles/Today.css'
import '../styles/TodayDashboard.css'
import '../styles/NoContact.css'

const writingLinks = [
  { to: '/journal', title: 'Journal', description: 'Make room for what’s on your mind.', icon: BookOpen },
  { to: '/journal?type=unsent_letter', title: 'Unsent letters', description: 'Say it here. These words stay with you.', icon: PenLine },
  { to: '/my-story', title: 'My Story', description: 'Your experience, in your own words.', icon: BookHeart },
]

export default function Today({ user, profile }) {
  const { openSupport } = useOutletContext()
  const preferredName = profile?.preferred_name || ''
  const selectedGoalLabels = goals.filter((goal) => profile?.goals?.includes(goal.id))

  return (
    <PageShell id="today-main" className="today-main">
      <PageHeader
        title={preferredName ? `Welcome, ${preferredName}.` : 'Welcome to your space.'}
        subtitle="A little space for you, one day at a time."
        actions={(
          <div className="today-streak-actions">
            <StreakCard kind="app" />
            <StreakCard kind="noContact" />
          </div>
        )}
      />

      <DailyEncouragement
        userId={user.id}
        selectedGoals={profile.goals}
        timezone={profile.timezone}
      />

      <section id="today-next" className="today-goals-row" aria-labelledby="next-title">
        <div className="today-goals-heading">
          <h2 id="next-title">Your goals</h2>
          <Link to="/onboarding" className="today-edit-goals">Edit</Link>
        </div>
        <ul className="today-saved-goals">
          {selectedGoalLabels.map((goal) => <li key={goal.id}>{goal.label}</li>)}
        </ul>
      </section>

      <DailyCheckIn
        key={`${user.id}:${profile.timezone}`}
        userId={user.id}
        timezone={profile.timezone}
      />

      <Link to="/mood" className="today-mood-history-link">
        <CalendarDays size={20} aria-hidden="true" />
        <span>Mood history<span className="today-mood-history-hint">Read your past check-ins, in your own time.</span></span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>

      <section className="today-writing" aria-labelledby="writing-title">
        <h2 id="writing-title">A place to put it into words</h2>
        <div className="today-writing-grid">
          {writingLinks.map(({ to, title, description, icon: Icon }) => (
            <div key={to} className="today-writing-tile">
              <Link to={to} className="today-writing-item">
                <Icon size={23} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
              {to === '/my-story' && (
                <Link to="/my-story?section=learning" className="today-learning-link">
                  What I'm learning
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
      <SupportButton className="support-today-float" onClick={openSupport} />
    </PageShell>
  )
}
