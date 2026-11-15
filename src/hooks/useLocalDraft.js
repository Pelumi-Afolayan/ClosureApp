import { useCallback, useEffect, useRef, useState } from 'react'
import { drafts, isNewerDraft } from '../utils/draftStorage'

export default function useLocalDraft({ userId, entryKey, values, savedAt, dirty, onRestore }) {
  const serialized = JSON.stringify(values)
  const [status, setStatus] = useState({ loading: true, candidate: null, error: '', saved: false })
  const latest = useRef(null)
  const token = useRef(drafts.epoch(userId))
  const revision = useRef(drafts.revision(userId, entryKey))
  const timer = useRef(null)
  const paused = useRef(true)
  const pending = useRef(Promise.resolve())
  const persist = useCallback(() => {
    const item = latest.current
    if (!item?.dirty || paused.current) return pending.current
    pending.current = pending.current.catch(() => {}).then(() => drafts.put(userId, entryKey, item.values, token.current, item.savedAt, Date.now(), revision.current))
    return pending.current
  }, [userId, entryKey])
  useEffect(() => {
    let live = true
    drafts.get(userId, entryKey).then(draft => {
      if (!live) return
      const candidate = isNewerDraft(draft, savedAt, values) ? draft : null
      paused.current = Boolean(candidate)
      setStatus({ loading: false, candidate, error: '', saved: false })
    }).catch(() => { paused.current = false; if (live) setStatus({ loading: false, candidate: null, saved: false, error: 'Device drafts are unavailable here. Keep this page open until you save to your account.' }) })
    return () => { live = false }
    // This hook is mounted with an editor identity key; server updates remount it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, entryKey])
  useEffect(() => {
    latest.current = { values: JSON.parse(serialized), savedAt, dirty }
    if (status.loading || status.candidate) return
    clearTimeout(timer.current)
    if (dirty && !paused.current) timer.current = setTimeout(() => {
      persist().then(saved => { if (saved) setStatus(current => ({ ...current, saved: true, error: '' })) })
        .catch(() => setStatus(current => ({ ...current, error: 'Your device draft could not be kept. Your words are still here; please keep this page open.' })))
    }, 1000)
    return () => clearTimeout(timer.current)
  }, [serialized, savedAt, dirty, status.loading, status.candidate, persist])
  useEffect(() => {
    const flush = () => { persist().catch(() => {}) }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flush)
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); clearTimeout(timer.current); flush() }
  }, [persist])
  async function clear() {
    paused.current = true
    clearTimeout(timer.current)
    await pending.current.catch(() => {})
    await drafts.remove(userId, entryKey)
    latest.current = null
    setStatus(current => ({ ...current, candidate: null, saved: false }))
  }
  return {
    ...status,
    async restore() { const candidate = status.candidate; if (!candidate) return; paused.current = false; onRestore(candidate.values); setStatus(current => ({ ...current, candidate: null, saved: true })) },
    async discard() { await clear(); revision.current = drafts.revision(userId, entryKey); paused.current = false },
    clear,
  }
}
