import MoodHistory from '../pages/MoodHistory'
import UrgeSessionProvider from './UrgeSessionProvider'
import UrgeFlow from '../pages/UrgeFlow'
import SupportButton from './SupportButton'
import SupportDialog from './SupportDialog'
import LoadingPlaceholder from './ui/LoadingPlaceholder'
import Notice from './ui/Notice'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import AppLayout from './AppLayout'
import ActivityProvider from './ActivityProvider'
import NoContact from '../pages/NoContact'
import SignOut from '../pages/SignOut'
import Button from './ui/Button'
import { getProfile } from '../services/profileService'
import { signOutWithReminderCleanup } from '../services/notificationService'
import Onboarding from '../pages/Onboarding'
import Today from '../pages/Today'
import MyStory from '../pages/MyStory'
import Journal from '../pages/Journal'
import JournalEntry from '../pages/JournalEntry'

export default function SignedInApp({ user }) {
  const [supportOpen, setSupportOpen] = useState(false)
  const openSupport = () => setSupportOpen(true)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [signingOut, setSigningOut] = useState(false)
  const supportDialog = (
    <SupportDialog
      open={supportOpen}
      onClose={() => setSupportOpen(false)}
      timezone={profile?.timezone}
    />
  )

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
      const { error } = await signOutWithReminderCleanup(user.id, { scope: 'local' })
      if (error) throw error
    } catch {
      setErrorMessage('Could not sign out. Please check your connection and try again.')
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <>
        <main className="auth-state">
          <SupportButton onClick={openSupport} />
          <LoadingPlaceholder label="Getting your space ready…" />
        </main>
        {supportDialog}
      </>
    )
  }

  if (errorMessage) {
    return (
      <>
        <main className="auth-state">
          <SupportButton onClick={openSupport} />
          <Notice variant="error">{errorMessage}</Notice>

          <Button onClick={() => setAttempt((current) => current + 1)}>
            Retry
          </Button>

          <Button secondary disabled={signingOut} onClick={handleSignOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </main>
        {supportDialog}
      </>
    )
  }

  const destination = profile?.onboarding_complete ? '/today' : '/onboarding'

  return (
    <UrgeSessionProvider key={user.id} userId={user.id}>
      <Routes>
        <Route element={profile?.onboarding_complete ? (
          <ActivityProvider key={`${user.id}:${profile.timezone}`} userId={user.id} timezone={profile.timezone}>
            <AppLayout user={user} onSupport={openSupport} />
          </ActivityProvider>
        ) : undefined}>
          <Route
            path="/onboarding"
            element={(
              <Onboarding
                user={user}
                profile={profile}
                onSupport={openSupport}
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
            path="/mood"
            element={profile?.onboarding_complete
              ? <MoodHistory key={`${user.id}:${profile.timezone}`} user={user} profile={profile} />
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

          <Route
            path="/my-story"
            element={profile?.onboarding_complete
              ? <MyStory user={user} profile={profile} />
              : <Navigate to="/onboarding" replace />}
          />

          <Route
            path="/no-contact"
            element={profile?.onboarding_complete ? <NoContact user={user} /> : <Navigate to="/onboarding" replace />}
          />

          <Route
            path="/no-contact/urge"
            element={profile?.onboarding_complete ? <UrgeFlow user={user} /> : <Navigate to="/onboarding" replace />}
          />

          <Route path="/sign-out" element={<SignOut userId={user.id} />} />
        </Route>

        <Route path="*" element={<Navigate to={destination} replace />} />
      </Routes>
      {supportDialog}
    </UrgeSessionProvider>
  )
}
