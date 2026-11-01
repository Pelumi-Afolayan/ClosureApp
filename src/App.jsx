import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { supabase } from './lib/supabase'
import Welcome from './pages/Welcome'
import Signup from './pages/Signup'
import Login from './pages/Login'
import SignedInApp from './components/SignedInApp'
import './styles/Auth.css'

// Read only the error flag. Never display or log credentials from the URL.
const redirectParameters = new URLSearchParams(window.location.hash.slice(1))
const redirectFailed = redirectParameters.has('error')
  || new URLSearchParams(window.location.search).has('error')

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    let active = true
    let receivedAuthEvent = false

    const timeout = window.setTimeout(() => {
      if (!active) return
      setSessionError('The sign-in service is taking too long. Please reload and try again.')
      setLoading(false)
    }, 15000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return

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
  }, [])

  if (loading) {
    return (
      <main className="auth-state" role="status">
        Checking your sign-in…
      </main>
    )
  }

  if (sessionError) {
    return (
      <main className="auth-state">
        <p role="alert">{sessionError}</p>
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

  if (session) {
    return <SignedInApp key={session.user.id} user={session.user} />
  }

  return (
    <>
      {redirectFailed && (
        <p role="alert" className="auth-redirect-error">
          Google sign-in or email confirmation was not completed.
          Please open Log in and try again.
        </p>
      )}

      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}