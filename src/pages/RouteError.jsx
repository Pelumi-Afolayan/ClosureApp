import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
export default function RouteError() {
  return <PageShell width="narrow"><PageHeader title="Something didn’t open as expected" />
    <p>Your saved account data has not been changed by this screen. If you were writing, a device draft may be available after reopening.</p>
    <button className="button button--secondary" type="button" onClick={() => window.location.assign('/')}>Open Closure again</button>
  </PageShell>
}
