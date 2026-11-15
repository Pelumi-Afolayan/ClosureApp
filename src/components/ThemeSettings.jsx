import { useState, useSyncExternalStore } from 'react'
import { getThemePreference, setThemePreference, subscribeTheme } from '../utils/theme'
import Card from './ui/Card'
export default function ThemeSettings() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference, getThemePreference)
  const [error, setError] = useState('')
  return <Card className="device-settings"><h2>Appearance</h2><label htmlFor="theme-choice">Colour theme</label>
    <select id="theme-choice" value={preference} onChange={event => { try { setThemePreference(event.target.value); setError('') } catch { setError('Your browser could not save that device setting.') } }}>
      <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
    </select><p>Saved on this device. System follows your device’s colour preference.</p>{error && <p role="status">{error}</p>}
  </Card>
}
