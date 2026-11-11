import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, BookOpen, Heart, Leaf, Sun } from 'lucide-react'

import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import '../styles/Welcome.css'

const moods = ['Sad', 'Angry', 'Relieved', 'Hopeful', 'Numb']
const features = [
  {
    icon: BookOpen,
    title: 'Let the words out',
    text: 'A private journal, your story, and letters you don’t have to send.',
  },
  {
    icon: Heart,
    title: 'Meet yourself where you are',
    text: 'Daily encouragement and mood check-ins, even on the difficult days.',
  },
  {
    icon: Leaf,
    title: 'Make it your journey',
    text: 'Choose every goal that matters to you, and build a gentle check-in habit.',
  },
]

export default function Welcome() {
  const navigate = useNavigate()
  const [mood, setMood] = useState('')

  return (
    <div className="welcome-page">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="welcome-header">
        <Link to="/" aria-label="Closure home" className="welcome-brand">
          <Leaf className="welcome-icon" aria-hidden="true" />
          closure.
        </Link>
        <Link to="/login" className="button button--secondary">
          Log in
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      <main id="main" className="welcome-main">
        <section aria-labelledby="welcome-title" className="welcome-hero">
          <div>
            <p className="welcome-eyebrow">A little space for you</p>
            <h1 id="welcome-title" className="welcome-title">
              After the ending,<br />
              there’s still <em className="welcome-title-emphasis">you.</em>
            </h1>
            <p className="welcome-description">
              A gentle space to process a breakup, put your feelings into words,
              and take the next day at your own pace.
            </p>
            <div className="welcome-actions">
              <Button onClick={() => navigate('/signup')}>
                Begin your journey
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
              <a href="#preview" className="welcome-preview-link">Take a look inside</a>
            </div>
            <p className="welcome-reassurance">No perfect words. No pressure to feel okay.</p>
          </div>

          <div id="preview" className="welcome-preview">
            <div className="welcome-preview-header">
              <span>A glimpse of Today</span>
              <span className="welcome-sample-label">Sample</span>
            </div>
            <Card className="welcome-encouragement">
              <Sun size={25} className="welcome-sun" aria-hidden="true" />
              <p className="welcome-card-label">A moment of encouragement</p>
              <p className="welcome-quote">You don’t have to figure everything out today.</p>
              <p className="welcome-card-description">
                Give yourself room to feel what you feel. One small moment is enough to begin.
              </p>
            </Card>
            <Card className="welcome-mood-card">
              <fieldset>
                <legend className="welcome-subheading">What’s here for you today?</legend>
                <p className="welcome-mood-hint">Try a feeling in this preview.</p>
                <div className="welcome-moods">
                  {moods.map((item) => (
                    <Chip
                      key={item}
                      selected={mood === item}
                      onClick={() => setMood(mood === item ? '' : item)}
                    >
                      {item}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <p aria-live="polite" className="welcome-mood-status">
                {mood
                  ? `${mood} selected. All feelings are welcome. This sample isn’t saved.`
                  : 'Preview only · No check-in is saved.'}
              </p>
            </Card>
          </div>
        </section>

        <section aria-labelledby="space-title" className="welcome-features">
          <h2 id="space-title" className="welcome-section-title">Room for your own kind of progress.</h2>
          <p className="welcome-section-description">A little support, one day at a time.</p>
          <div className="welcome-feature-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <Icon size={22} className="welcome-feature-icon" aria-hidden="true" />
                <h3 className="welcome-subheading">{title}</h3>
                <p className="welcome-feature-description">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="welcome-footer">
        <span>Closure · A little more room to be you.</span>
        <span>Your words, at your own pace.</span>
      </footer>
    </div>
  )
}
