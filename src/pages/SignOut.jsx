import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import Notice from '../components/ui/Notice'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'

export default function SignOut() {
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSignOut() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')

    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })
      if (signOutError) throw signOutError
    } catch {
      setError('Could not sign out. Please check your connection and try again.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <PageShell width="narrow" className="sign-out-page">
      <PageHeader
        title="Ready to sign out?"
        subtitle="Your saved writing will be here when you return."
      />
      <div className="sign-out-actions">
        <Button disabled={busy} onClick={handleSignOut}>
          {busy ? 'Signing out…' : 'Sign out of all devices'}
        </Button>
        <Link to="/today">Stay in my space</Link>
        {error && <Notice variant="error">{error}</Notice>}
      </div>
    </PageShell>
  )
}
