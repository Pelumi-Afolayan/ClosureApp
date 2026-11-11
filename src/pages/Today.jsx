import { Link } from 'react-router'
import { BookHeart, BookOpen, ChevronRight, PenLine, Target } from 'lucide-react'

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
  const preferredName = profile?.preferred_name || ''
  const selectedGoalLabels = goals.filter((goal) => profile?.goals?.includes(goal.id))

  return (
    <main id="today-main" className="today-main">
      <div className="today-topbar">
        <p className="today-page-label">Today</p>
        <div className="today-streak-actions">
          <StreakCard kind="app" />
          <StreakCard kind="noContact" />
        </div>
      </div>

      <header className="today-heading">
        <h1>
          {preferredName ? `Welcome, ${preferredName}.` : 'Welcome to your space.'}
        </h1>
        <p className="today-introduction">A little space for you, one day at a time.</p>
      </header>

      <DailyEncouragement
        userId={user.id}
        selectedGoals={profile.goals}
        timezone={profile.timezone}
      />

      <div className="today-content-grid">
        <DailyCheckIn
          key={`${user.id}:${profile.timezone}`}
          userId={user.id}
          timezone={profile.timezone}
        />

        <section id="today-next" className="today-goals" aria-labelledby="next-title">
          <div className="today-goals-heading">
            <h2 id="next-title"><Target size={19} aria-hidden="true" /> Your goals</h2>
            <Link to="/onboarding" className="today-edit-goals">Edit</Link>
          </div>
          <p>A reminder of what matters to you.</p>
          <ul className="today-saved-goals">
            {selectedGoalLabels.map((goal) => <li key={goal.id}>{goal.label}</li>)}
          </ul>
        </section>
      </div>

      <section className="today-writing" aria-labelledby="writing-title">
        <h2 id="writing-title">A place to put it into words</h2>
        <div className="today-writing-grid">
          {writingLinks.map(({ to, title, description, icon: Icon }) => (
            <Link key={to} to={to} className="today-writing-item">
              <Icon size={23} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
