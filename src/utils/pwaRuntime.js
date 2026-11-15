let state = { online: typeof navigator === 'undefined' || navigator.onLine !== false, waiting: null, install: null, error: '' }
const listeners = new Set()
let started = false
let registration
const publish = patch => { state = { ...state, ...patch }; for (const notify of listeners) notify() }
export const getPwaState = () => state
export const subscribePwa = notify => { listeners.add(notify); return () => listeners.delete(notify) }
export function startPwa({ production = false } = {}) {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('online', () => publish({ online: true }))
  window.addEventListener('offline', () => publish({ online: false }))
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); publish({ install: event }) })
  window.addEventListener('appinstalled', () => publish({ install: null }))
  if (!production || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(worker => {
    registration = worker
    if (worker.waiting) publish({ waiting: worker.waiting })
    worker.addEventListener('updatefound', () => {
      const installing = worker.installing
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) publish({ waiting: worker.waiting })
      })
    })
  }).catch(() => publish({ error: 'Offline setup could not finish. You can try again when connected.' }))
}
export async function installClosure() {
  const prompt = state.install
  if (!prompt) return
  publish({ install: null })
  await prompt.prompt()
  await prompt.userChoice
}
export function refreshForUpdate() {
  const waiting = registration?.waiting || state.waiting
  if (!waiting || !window.confirm('Save your writing first. Refresh Closure now?')) return
  // No automatic reload: this handler runs only after an explicit user choice.
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  waiting.postMessage({ type: 'CLOSURE_ACTIVATE_UPDATE' })
}
export function isIosSafari(navigatorValue, standalone = false) {
  return !standalone && (/iPad|iPhone|iPod/.test(navigatorValue.userAgent) || (navigatorValue.platform === 'MacIntel' && navigatorValue.maxTouchPoints > 1))
    && /Safari/.test(navigatorValue.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigatorValue.userAgent)
}
