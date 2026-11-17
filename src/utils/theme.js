export function resolveTheme(preference, systemDark) {
  return preference === 'dark' || (preference !== 'light' && systemDark) ? 'dark' : 'light'
}
let preference = 'system'
const listeners = new Set()
const notify = () => { for (const listener of listeners) listener() }
export const getThemePreference = () => preference
export const subscribeTheme = listener => { listeners.add(listener); return () => listeners.delete(listener) }
export function startTheme() {
  const media = matchMedia('(prefers-color-scheme: dark)')
  function apply() {
    const theme = resolveTheme(preference, media.matches)
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#141a17' : '#faf7f0'
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#141a17' : '#faf7f0'
    notify()
  }
  function read() { try { preference = localStorage.getItem('closure.theme') || 'system' } catch { preference = 'system' }; if (!['system','light','dark'].includes(preference)) preference = 'system'; apply() }
  read()
  media.addEventListener('change', apply)
  window.addEventListener('storage', event => { if (event.key === 'closure.theme') read() })
}
export function setThemePreference(value) {
  if (!['system','light','dark'].includes(value)) throw new Error('Choose System, Light or Dark.')
  localStorage.setItem('closure.theme', value)
  preference = value
  const theme = resolveTheme(value, matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.documentElement.style.backgroundColor = theme === 'dark' ? '#141a17' : '#faf7f0'
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#141a17' : '#faf7f0'
  notify()
}
