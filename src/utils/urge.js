export const pauseDurationMs = 10 * 60 * 1000
export const optionalSkipAfterMs = 2 * 60 * 1000

export function pauseState(deadline, now = Date.now()) {
  const started = Number.isFinite(deadline) && deadline > 0
  const remainingMs = started ? Math.max(0, Math.min(pauseDurationMs, deadline - now)) : pauseDurationMs
  const elapsedMs = pauseDurationMs - remainingMs
  const remainingSeconds = Math.ceil(remainingMs / 1000)
  return {
    started,
    complete: started && remainingMs === 0,
    canSkip: started && elapsedMs >= optionalSkipAfterMs,
    remainingSeconds,
    display: `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`,
    cue: Math.floor(elapsedMs / 1000) % 10 < 4 ? 'Breathe in gently' : 'Let your breath out gently',
  }
}

export function selectRealityChecks(items, limit = 3, random = Math.random) {
  const seen = new Set()
  const candidates = items.filter(item => {
    if (item.kind !== 'reality_check' || !item.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
  for (let index = candidates.length - 1; index > 0; index--) {
    const value = random()
    const other = Math.floor((Number.isFinite(value) && value >= 0 && value < 1 ? value : 0) * (index + 1))
    ;[candidates[index], candidates[other]] = [candidates[other], candidates[index]]
  }
  return candidates.slice(0, Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 0))
}

// One current deadline and one loaded snapshot. Nothing is persisted or logged.
// Each signed-in account gets its own instance, discarded on sign-out/switch.
export function createUrgeSession({ loadReflections, now = Date.now }) {
  let state = { deadline: null, reflections: { rows: null, loading: false, error: false } }
  let pending = null
  const listeners = new Set()
  function publish(next) {
    state = next
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    beginPause() {
      if (state.deadline === null) publish({ ...state, deadline: now() + pauseDurationMs })
    },
    finishPause() {
      publish({ ...state, deadline: null })
    },
    load() {
      if (pending) return pending
      if (state.reflections.rows !== null) return Promise.resolve()
      publish({ ...state, reflections: { rows: null, loading: true, error: false } })
      pending = Promise.resolve().then(loadReflections)
        .then(rows => publish({ ...state, reflections: { rows, loading: false, error: false } }))
        .catch(() => publish({ ...state, reflections: { rows: null, loading: false, error: true } }))
        .finally(() => { pending = null })
      return pending
    },
    applyChange(row) {
      if (state.reflections.rows === null) return
      const others = state.reflections.rows.filter(item => item.id !== row.id)
      const relevant = ['reason', 'reality_check'].includes(row.kind)
      publish({ ...state, reflections: { rows: row.deleted || !relevant ? others : [row, ...others], loading: false, error: false } })
    },
  }
}
