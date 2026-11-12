import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import Card from '../components/ui/Card'
import StreakDetails from '../components/StreakDetails'
import { useActivity } from '../hooks/useActivity'
import '../styles/NoContact.css'
import '../styles/TodayDashboard.css'

export default function NoContact() {
  const { noContact, timezone } = useActivity()

  return (
    <PageShell width="narrow" className="no-contact-page">
      <PageHeader
        title="No contact"
        subtitle="A little space to come back to yourself. Confirm each day when you’re ready."
      />
      <Card className="no-contact-progress">
        <StreakDetails tracker={noContact} kind="noContact" timezone={timezone} />
      </Card>
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
