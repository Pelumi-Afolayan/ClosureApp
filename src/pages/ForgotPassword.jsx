import { useRef, useState } from 'react'
import { Link } from 'react-router'
import Button from '../components/ui/Button'
import { authService } from '../services/authService'
import { getAuthErrorMessage } from '../utils/authActions'
import '../styles/Login.css'
import '../styles/PasswordRecovery.css'

export default function ForgotPassword() {
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (busyRef.current) return
    const email = new FormData(event.currentTarget).get('email')
    busyRef.current = true
    setBusy(true)
    setSent(false)
    setError('')

    try {
      await authService.requestPasswordReset(email)
      setSent(true)
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="forgot-password-title">
        <Link to="/login" className="login-back">Back to Log in</Link>
        <h1 id="forgot-password-title">Forgot your password?</h1>
        <p className="login-description">Enter your email and we’ll help you get back to your space.</p>

        <form className="login-form" onSubmit={handleSubmit} aria-busy={busy}>
          <label htmlFor="recovery-email">Email address</label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            disabled={busy}
            required
          />
          <Button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
          <p role="status" className="auth-message">
            {sent && 'If an account exists for that email, you’ll receive a reset link. Check your inbox and spam folder.'}
          </p>
          <p role="alert" className="auth-message auth-message--error">{error}</p>
        </form>
      </section>
    </main>
  )
}
