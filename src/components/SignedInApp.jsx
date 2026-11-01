import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import Button from './ui/Button'
import { getProfile } from '../services/profileService'
import { supabase } from '../lib/supabase'
import Onboarding from '../pages/Onboarding'
import Today from '../pages/Today'
import Journal from '../pages/Journal'
import JournalEntry from '../pages/JournalEntry'

export default function SignedInApp({ user }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)

    setLoading(true)
    setErrorMessage('')

    getProfile(user.id, controller.signal)
      .then((savedProfile) => {
        if (active) setProfile(savedProfile)
      })
      .catch(() => {
        if (!active) return

        setErrorMessage(
          'We could not load your profile. Please check your connection and try again.'
        )
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (active) setLoading(false)
      })

    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [user.id, attempt])

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch {
      setErrorMessage('Could not sign out. Please check your connection and try again.')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <main className="auth-state" role="status">
        Getting your space ready…
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="auth-state">
        <p role="alert">{errorMessage}</p>

        <Button onClick={() => setAttempt((current) => current + 1)}>
          Retry
        </Button>

        <Button secondary disabled={signingOut} onClick={handleSignOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </main>
    )
  }

  const destination = profile?.onboarding_complete ? '/today' : '/onboarding'

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={(
          <Onboarding
            user={user}
            profile={profile}
            onComplete={setProfile}
          />
        )}
      />

      <Route
        path="/today"
        element={profile?.onboarding_complete
          ? <Today user={user} profile={profile} />
          : <Navigate to="/onboarding" replace />}
      />

      <Route
        path="/journal"
        element={profile?.onboarding_complete
          ? <Journal user={user} profile={profile} />
          : <Navigate to="/onboarding" replace />}
      />

      <Route
        path="/journal/new"
        element={profile?.onboarding_complete
          ? <JournalEntry user={user} profile={profile} />
          : <Navigate to="/onboarding" replace />}
      />

      <Route
        path="/journal/:entryId"
        element={profile?.onboarding_complete
          ? <JournalEntry user={user} profile={profile} />
          : <Navigate to="/onboarding" replace />}
      />

      <Route path="*" element={<Navigate to={destination} replace />} />
    </Routes>
  )
}
