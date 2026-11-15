import { useState } from 'react'
import { Link } from 'react-router'
import { useActivity } from '../hooks/useActivity'
import { hasVisitGap } from '../utils/noContactHistory'
import '../styles/NoContactHistory.css'

export default function WelcomeBack() {
  const { app, welcomeDismissedDay, dismissWelcomeDay } = useActivity()
  const [answer, setAnswer] = useState('')
  if (app.loading || app.error || welcomeDismissedDay === app.today || !hasVisitGap(app.dates, app.today)) return null

  return (
    <section className="welcome-back" aria-labelledby="welcome-back-title">
      <h2 id="welcome-back-title">Welcome back</h2>
      <p>It’s good to have you here. Would you like to add any no-contact days from your time away?</p>
      <Link to="/no-contact">Add past no-contact days</Link>
      <details>
        <summary>What kept you away? Only if you’d like to share.</summary>
        <p>You don’t owe an explanation. Your choice stays on this screen and isn’t saved.</p>
        <div className="welcome-back__choices" role="group" aria-label="What kept you away">
          {['Life got busy', 'I needed some space', 'Something else', 'I’d rather not say'].map(option => (
            <button type="button" key={option} aria-pressed={answer === option} onClick={() => setAnswer(option)}>{option}</button>
          ))}
        </div>
        {answer && <p role="status">That’s okay. You’re welcome here at your own pace.</p>}
      </details>
      <button type="button" className="welcome-back__dismiss" onClick={() => { dismissWelcomeDay(app.today); setAnswer('') }}>Not now</button>
    </section>
  )
}
