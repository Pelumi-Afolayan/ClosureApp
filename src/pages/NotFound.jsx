import { Link } from 'react-router'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
export default function NotFound({ destination = '/' }) {
  return <PageShell width="narrow"><PageHeader title="This page isn’t here" subtitle="You can return to your space whenever you’re ready." />
    <Link className="button button--secondary" to={destination}>Go back</Link>
  </PageShell>
}
