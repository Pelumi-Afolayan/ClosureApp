import { Link, useSearchParams } from 'react-router'
import { Leaf } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import '../styles/DataOwnership.css'

export default function Goodbye() {
  const [search] = useSearchParams()
  return (
    <PageShell width="narrow" className="goodbye-page">
      <Leaf size={32} aria-hidden="true" />
      <PageHeader title="Take care of yourself." />
      <p>Your Closure account and saved app data have been deleted.</p>
      <p>There is no right pace for what comes next. We wish you well.</p>
      {search.get('clear') === 'needed' && <p>This browser couldn't clear all of its saved sign-in or device drafts. Clear Closure's site data in your browser settings to finish signing out on this device.</p>}
      <Link to="/" className="button button--secondary">Return to Welcome</Link>
    </PageShell>
  )
}
