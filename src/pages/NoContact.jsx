import { ShieldCheck } from 'lucide-react'
import Card from '../components/ui/Card'
import StreakDetails from '../components/StreakDetails'
import { useActivity } from '../hooks/useActivity'
import '../styles/NoContact.css'
import '../styles/TodayDashboard.css'

export default function NoContact() {
  const { noContact, timezone } = useActivity()

  return (
    <main className="no-contact-page">
      <header className="no-contact-heading">
        <ShieldCheck size={26} aria-hidden="true" />
        <h1>No contact</h1>
      </header>
      <p className="no-contact-introduction">
        A little space to come back to yourself. Confirm each day you keep no contact, when you’re ready.
      </p>
      <Card className="no-contact-progress">
        <StreakDetails tracker={noContact} kind="noContact" timezone={timezone} />
      </Card>
      <section className="no-contact-guidance" aria-labelledby="no-contact-guidance-title">
        <h2 id="no-contact-guidance-title">Your pace, your boundaries</h2>
        <p>
          Each confirmed date counts once. Consecutive confirmed dates build your streak.
          A date without a confirmation leaves a gap; it doesn’t tell us whether contact happened.
          You can start again without making up missed days.
        </p>
        <p>This tracker follows your confirmations. It does not read your messages or monitor contact.</p>
      </section>
    </main>
  )
}
