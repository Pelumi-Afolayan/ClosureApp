import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
export default function StartupScreen() {
  return <PageShell width="narrow"><PageHeader title="Closure needs a little setup" />
    <p>The sign-in connection is not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the project environment, then rebuild or restart your local app.</p>
    <p>No account request has been sent. Please keep secret service keys out of the frontend.</p>
  </PageShell>
}
