import { useId, useState, useSyncExternalStore } from 'react'
import { Monitor, Sun, Moon, Check } from 'lucide-react'
import { getThemePreference, setThemePreference, subscribeTheme } from '../utils/theme'
import Card from './ui/Card'
import '../styles/ThemeSettings.css'

const themes = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

export default function ThemeSettings() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference, getThemePreference)
  const [error, setError] = useState('')
  const id = useId()

  function chooseTheme(value) {
    try {
      setThemePreference(value)
      setError('')
    } catch {
      setError('Your browser could not save that device setting.')
    }
  }

  return (
    <Card className="device-settings theme-settings">
      <h2>Appearance</h2>
      <fieldset className="theme-settings__group" aria-describedby={`${id}-hint`}>
        <legend>Colour theme</legend>
        <div className="theme-settings__choices">
          {themes.map(({ value, label, Icon }) => (
            <label className="theme-settings__option" key={value}>
              <input
                type="radio"
                name={`${id}-theme`}
                value={value}
                checked={preference === value}
                onChange={() => chooseTheme(value)}
              />
              <span className="theme-settings__choice">
                <Icon size={20} aria-hidden="true" />
                <span>{label}</span>
                <Check className="theme-settings__check" size={16} aria-hidden="true" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p id={`${id}-hint`} className="theme-settings__hint">Saved on this device. System follows your device’s colour preference.</p>
      {error && <p role="status">{error}</p>}
    </Card>
  )
}
