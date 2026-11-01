import { useState } from 'react'
import { Link } from 'react-router'

import Button from '../components/ui/Button'
import GoogleButton from '../components/auth/GoogleButton'
import { authService } from '../services/authService'
import { getAuthErrorMessage } from '../utils/authActions'
import '../styles/Signup.css'

export default function Signup() {
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState('')

  async function handleGoogleSignIn() {
    if (loading) return

    setLoading('google')
    setMessage('')
    setIsError(false)

    try {
      await authService.continueWithGoogle()
    } catch (error) {
      setMessage(getAuthErrorMessage(error))
      setIsError(true)
      setLoading('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return

    const form = event.currentTarget
    const fields = new FormData(form)

    setLoading('email')
    setMessage('')
    setIsError(false)

    try {
      const data = await authService.signUp(
        fields.get('email'),
        fields.get('password')
      )

      // The session listener opens Today when signup also signs the user in.
      if (!data.session) {
        form.reset()
        setMessage(
          'Check your email for a confirmation link, including your spam folder. If you already have an account, log in instead.'
        )
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error))
      setIsError(true)
    } finally {
      setLoading('')
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-panel" aria-labelledby="signup-title">
        <Link to="/" className="signup-back">
          Back to Welcome
        </Link>

        <h1 id="signup-title">Create your Closure account</h1>

        <p className="signup-description">
          A little space for you, at your own pace.
        </p>

        <GoogleButton
          loading={loading === 'google'}
          disabled={Boolean(loading)}
          onClick={handleGoogleSignIn}
        />

        <p className="auth-divider">or use your email</p>

        <form
          onSubmit={handleSubmit}
          className="signup-form"
          aria-busy={Boolean(loading)}
        >
          <label htmlFor="signup-email">Email address</label>

          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            disabled={Boolean(loading)}
            required
          />

          <label htmlFor="signup-password">Password</label>

          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            aria-describedby="password-hint"
            disabled={Boolean(loading)}
            required
          />

          <p id="password-hint" className="signup-hint">
            Use at least 8 characters.
          </p>

          <Button type="submit" disabled={Boolean(loading)}>
            {loading === 'email' ? 'Creating account…' : 'Create account'}
          </Button>

          <p
            role={isError ? 'alert' : 'status'}
            className={isError ? 'auth-message auth-message--error' : 'auth-message'}
          >
            {message}
          </p>
        </form>

        <p className="signup-login">
          Already have an account?{' '}
          <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  )
}
