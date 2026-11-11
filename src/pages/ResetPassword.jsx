import Notice from '../components/ui/Notice'
import { useRef, useState } from 'react'
import Button from '../components/ui/Button'
import { authService } from '../services/authService'
import { getAuthErrorMessage } from '../utils/authActions'
import { validateNewPassword } from '../utils/passwordRecovery'
import '../styles/Login.css'
import '../styles/PasswordRecovery.css'

export default function ResetPassword({ session, linkFailed, onComplete, onCancel }) {
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const canReset = Boolean(session) && !linkFailed

  async function handleSubmit(event) {
    event.preventDefault()
    if (busyRef.current || !canReset || saved) return
    const fields = new FormData(event.currentTarget)
    const password = fields.get('password')
    const validationError = validateNewPassword(password, fields.get('confirmation'))
    setError(validationError)
    if (validationError) return

    busyRef.current = true
    setBusy(true)

    try {
      await authService.updatePassword(password)
      event.target.reset()
      setSaved(true)
    } catch (updateError) {
      setError(getAuthErrorMessage(updateError))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="reset-password-title">
        <h1 id="reset-password-title">Choose a new password</h1>

        {!canReset ? (
          <div className="password-recovery-result">
            <Notice variant="error">This reset link is unavailable or has expired. Please request a new email.</Notice>
            <Button onClick={onCancel}>{session ? 'Back to my space' : 'Request a new link'}</Button>
          </div>
        ) : saved ? (
          <div className="password-recovery-result">
            <p role="status">Your password has been updated.</p>
            <Button onClick={onComplete}>Continue to my space</Button>
          </div>
        ) : (
          <>
            <p className="login-description">Use at least 8 characters. Enter the same password in both boxes.</p>
            <form className="login-form" onSubmit={handleSubmit} aria-busy={busy}>
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                disabled={busy}
                required
              />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={8}
                disabled={busy}
                required
              />
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save new password'}
              </Button>
              <Notice variant="error">{error}</Notice>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
