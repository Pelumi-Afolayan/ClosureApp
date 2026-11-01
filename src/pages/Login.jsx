import { useState } from 'react'
import { Link } from 'react-router'

import Button from '../components/ui/Button'
import GoogleButton from '../components/auth/GoogleButton'
import { authService } from '../services/authService'
import { getAuthErrorMessage } from '../utils/authActions'
import '../styles/Login.css'

export default function Login() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState('')

  async function handleGoogleSignIn() {
    if (loading) return

    setLoading('google')
    setMessage('')

    try {
      await authService.continueWithGoogle()
    } catch (error) {
      setMessage(getAuthErrorMessage(error))
      setLoading('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return

    const fields = new FormData(event.currentTarget)

    setLoading('email')
    setMessage('')

    try {
      await authService.logIn(
        fields.get('email'),
        fields.get('password')
      )
      // App's session listener opens Today after successful login.
    } catch (error) {
      setMessage(getAuthErrorMessage(error))
    } finally {
      setLoading('')
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <Link to="/" className="login-back">
          Back to Welcome
        </Link>

        <h1 id="login-title">Welcome back</h1>

        <p className="login-description">
          Take a moment for yourself.
        </p>

        <GoogleButton
          loading={loading === 'google'}
          disabled={Boolean(loading)}
          onClick={handleGoogleSignIn}
        />

        <p className="auth-divider">or use your email</p>

        <form
          onSubmit={handleSubmit}
          className="login-form"
          aria-busy={Boolean(loading)}
        >
          <label htmlFor="login-email">Email address</label>

          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            disabled={Boolean(loading)}
            required
          />

          <label htmlFor="login-password">Password</label>

          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            disabled={Boolean(loading)}
            required
          />

          <Button type="submit" disabled={Boolean(loading)}>
            {loading === 'email' ? 'Logging in…' : 'Log in'}
          </Button>

          <p role="alert" className="auth-message auth-message--error">
            {message}
          </p>
        </form>

        <p className="login-signup">
          New to Closure?{' '}
          <Link to="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  )
}
