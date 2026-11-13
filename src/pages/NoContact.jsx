import { useEffect } from 'react'
import { Link } from 'react-router'
import { Pause } from 'lucide-react'
import { useUrgeSession } from '../hooks/useUrgeSession'
import Reflections from '../components/Reflections'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import Card from '../components/ui/Card'
import StreakDetails from '../components/StreakDetails'
import { useActivity } from '../hooks/useActivity'
import '../styles/NoContact.css'
import '../styles/UrgeFlow.css'
import '../styles/TodayDashboard.css'

export default function NoContact({ user }) {
  const { noContact, timezone } = useActivity()
  const { session, state } = useUrgeSession()

  useEffect(() => { session.load() }, [session])

  return (
    <PageShell width="narrow" className="no-contact-page">
      <PageHeader
        title="No contact"
        subtitle="A little space to come back to yourself. Confirm each day when you’re ready."
      />
      <Card className="no-contact-urge-entry">
        <h2>A little space before you decide</h2>
        <p>You can pause here, come back to your reasons, or put your words somewhere private.</p>
        <Link to="/no-contact/urge" className="button button--primary">
          <Pause size={20} aria-hidden="true" />
          I feel the urge to text
        </Link>
      </Card>
      <Card className="no-contact-progress">
        <StreakDetails tracker={noContact} kind="noContact" timezone={timezone} />
      </Card>
      <Reflections key={user.id} userId={user.id} reasonsOnly source={state.reflections} onRetry={session.load} />
      <details className="no-contact-guidance">
        <summary>How this works</summary>
        <p>
          Each confirmed date counts once. Consecutive confirmed dates build your streak.
          A date without a confirmation leaves a gap; it doesn’t tell us whether contact happened.
          You can start again without making up missed days.
        </p>
        <p>This tracker follows your confirmations. It does not read your messages or monitor contact.</p>
      </details>
    </PageShell>
  )
}
