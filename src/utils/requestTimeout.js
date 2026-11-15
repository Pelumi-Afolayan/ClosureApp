export async function withRequestTimeout(action, { signal, timeoutMs = 15000 } = {}) {
  const controller = new AbortController()
  let timer
  let abort
  try {
    return await Promise.race([
      new Promise((_, reject) => {
        abort = () => { controller.abort(); reject(new Error('The request was cancelled. Your saved data may need refreshing.')) }
        if (signal?.aborted) abort()
        else signal?.addEventListener('abort', abort, { once: true })
        timer = setTimeout(() => { controller.abort(); reject(new Error('The request took too long. Reconnect and check your saved writing before trying again.')) }, timeoutMs)
      }),
      Promise.resolve().then(() => { if (controller.signal.aborted) throw new Error('The request was cancelled.'); return action(controller.signal) }),
    ])
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
}
