import { useEffect, useState } from 'react'
import Button from './ui/Button'
import Card from './ui/Card'
import Notice from './ui/Notice'
import { disableReminder, enableReminder, getReminder, pushConfigured, supportsPush, testReminder } from '../services/notificationService'
import '../styles/NotificationSettings.css'

export default function NotificationSettings({ userId, timezone }) {
  const [time, setTime] = useState('19:00')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(() => supportsPush() && pushConfigured)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const supported = supportsPush()
  useEffect(() => {
    let active = true
    if (!supported || !pushConfigured) return
    getReminder(userId).then((saved) => {
      if (!active) return
      setEnabled(Boolean(saved))
      if (saved) setTime(saved.reminder_time.slice(0, 5))
    }).catch(() => { if (active) setError('Could not load reminders. Reload Settings to try again.') })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [userId, supported])

  async function update(action) {
    setBusy(true); setMessage(''); setError('')
    try {
      if (action === 'off') { await disableReminder(userId); setEnabled(false); setMessage('Reminders are off on this device.') }
      else if (action === 'test') { await testReminder(); setMessage('Test sent. This checks this device, not the scheduled server delivery.') }
      else { await enableReminder(userId, time); setEnabled(true); setMessage('Reminder saved for this device. We only remind you if you have not opened Closure today.') }
    } catch (cause) { setError(cause.message || 'Could not update reminders. Please try again.') }
    finally { setBusy(false) }
  }
  return (
    <Card as="section" className="notification-settings" aria-labelledby="reminders-title">
      <h2 id="reminders-title">A gentle reminder</h2>
      <p>Optional. A quiet invitation to return if you have not opened Closure that day. Your mood and no-contact confirmations do not affect this reminder.</p>
      {!supported ? <p>Push notifications are not available in this browser. On iPhone, add Closure to your Home Screen and open it there.</p>
        : !pushConfigured ? <p>Reminders are waiting for the server setup. No notification permission will be requested yet.</p>
        : <>
          <label htmlFor="reminder-time">Remind me at</label>
          <input id="reminder-time" type="time" value={time} disabled={busy} onChange={(event) => setTime(event.target.value)} />
          <p className="reminder-small">Time in {timezone || 'your saved profile timezone'}. This setting applies to this device. Delivery can be delayed by your browser or connection. Turn reminders off before logging out on a shared device.</p>
          <div className="reminder-actions">
            <Button type="button" disabled={busy || !time} onClick={() => update('save')}>{enabled ? 'Save reminder time' : 'Enable reminders'}</Button>
            {enabled && <><Button type="button" secondary disabled={busy} onClick={() => update('test')}>Send a test</Button><Button type="button" variant="quiet" disabled={busy} onClick={() => update('off')}>Turn off</Button></>}
          </div>
        </>}
      <Notice variant="success">{message}</Notice><Notice variant="error">{error}</Notice>
    </Card>
  )
}
