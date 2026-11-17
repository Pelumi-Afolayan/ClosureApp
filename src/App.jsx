import useOpeningDelay from './hooks/useOpeningDelay'
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'
import OfflineWorkspace from './pages/OfflineWorkspace'
import { usePwa } from './hooks/usePwa'
import { drafts } from './utils/draftStorage'
import { authStorageKey } from './lib/supabase'
import Goodbye from './pages/Goodbye'
import OpeningScreen from './components/OpeningScreen'
import Notice from './components/ui/Notice'
import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'

import { supabase } from './lib/supabase'
import Welcome from './pages/Welcome'
import Signup from './pages/Signup'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SignedInApp from './components/SignedInApp'
import './styles/Auth.css'

// Read only the error flag. Never display or log credentials from the URL.
const redirectParameters = new URLSearchParams(window.location.hash.slice(1))
const redirectFailed = redirectParameters.has('error')
  || new URLSearchParams(window.location.search).has('error')

export default function App() {
  const { online } = usePwa()
  const openingReady = useOpeningDelay()
  const [offlineStart] = useState(() => navigator.onLine === false)
  const previousUser = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [recoveringPassword, setRecoveringPassword] = useState(false)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    if (offlineStart && !online) return
    let active = true
    let receivedAuthEvent = false

    const timeout = window.setTimeout(() => {
      if (!active) return
      setSessionError('The sign-in service is taking too long. Please reload and try again.')
      setLoading(false)
    }, 15000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!active) return

        if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true)
        if (event === 'SIGNED_OUT') { setRecoveringPassword(false); if (previousUser.current) drafts.clearUser(previousUser.current).catch(() => {}) }
        previousUser.current = nextSession?.user?.id || null

        receivedAuthEvent = true
        window.clearTimeout(timeout)
        setSession(nextSession)
        setSessionError('')
        setLoading(false)
      }
    )

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active || receivedAuthEvent) return

        window.clearTimeout(timeout)
        setSessionError(error ? 'Could not restore your session. Please reload and try again.' : '')
        previousUser.current = data.session?.user?.id || null
        setSession(data.session)
        setLoading(false)
      })
      .catch(() => {
        if (!active || receivedAuthEvent) return

        window.clearTimeout(timeout)
        setSessionError('Could not check your session. Please reload and try again.')
        setLoading(false)
      })

    return () => {
      active = false
      window.clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [offlineStart, online])

  if (!openingReady && !['/privacy', '/goodbye'].includes(location.pathname)) return <OpeningScreen />

  if (offlineStart && !online && location.pathname !== '/privacy') {
    let userId = session?.user?.id
    if (!userId) { try { userId = JSON.parse(localStorage.getItem(authStorageKey))?.user?.id } catch { /* No cached identity. */ } }
    return <OfflineWorkspace userId={userId} />
  }

  if (location.pathname === '/privacy') return <Privacy signedIn={Boolean(session)} />

  if (location.pathname === '/goodbye') return <Goodbye />

  if (loading) {
    return <OpeningScreen />
  }

  if (sessionError) {
    return (
      <main className="auth-state">
        <Notice variant="error">{sessionError}</Notice>
        <button
          type="button"
          className="button button--primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    )
  }

  // Recovery must take priority: an email reset link also signs the user in.
  if (location.pathname === '/reset-password' || recoveringPassword) {
    if (location.pathname !== '/reset-password') {
      return <Navigate to="/reset-password" replace />
    }

    return (
      <ResetPassword
        session={session}
        linkFailed={redirectFailed}
        onComplete={() => {
          setRecoveringPassword(false)
          navigate('/today', { replace: true })
        }}
        onCancel={() => {
          setRecoveringPassword(false)
          navigate(session ? '/today' : '/forgot-password', { replace: true })
        }}
      />
    )
  }

  if (session) {
    return <SignedInApp key={session.user.id} user={session.user} />
  }

  return (
    <>
      {redirectFailed && (
        <Notice variant="error">
          Google sign-in or email confirmation was not completed.
          Please open Log in and try again.
        </Notice>
      )}

      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}