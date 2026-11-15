// Private device-only drafts. Never use Cache Storage, network requests or logs.
export function createDraftStorage(getFactory = () => globalThis.indexedDB) {
  let opened
  const epochs = new Map()
  const blocked = new Set()
  const revisions = new Map()
  function epoch(userId) { return epochs.get(userId) || 0 }
  function begin(userId) {
    if (blocked.delete(userId)) epochs.set(userId, epoch(userId) + 1)
    return epoch(userId)
  }
  async function open() {
    if (!opened) opened = new Promise((resolve, reject) => {
      const factory = getFactory()
      if (!factory) { reject(new Error('Device draft storage is unavailable.')); return }
      const request = factory.open('closure-private-drafts', 1)
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('drafts', { keyPath: 'key' })
        store.createIndex('userId', 'userId')
      }
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); opened = null }; resolve(request.result) }
      request.onerror = () => reject(new Error('Device draft storage is unavailable.'))
      request.onblocked = () => reject(new Error('Close another Closure tab to use device drafts.'))
    }).catch(error => { opened = null; throw error })
    return opened
  }
  function key(userId, entryKey) { return JSON.stringify([userId, entryKey]) }
  async function transact(mode, action) {
    const db = await open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', mode)
      let result
      try { result = action(transaction.objectStore('drafts')) } catch (error) { transaction.abort(); reject(error); return }
      transaction.oncomplete = () => resolve(result?.result)
      transaction.onerror = transaction.onabort = () => reject(new Error('Device draft storage could not finish.'))
    })
  }
  return {
    begin, epoch,
    revision: (userId, entryKey) => revisions.get(key(userId, entryKey)) || 0,
    async put(userId, entryKey, values, token = epoch(userId), savedAt = null, updatedAt = Date.now(), revision = revisions.get(key(userId, entryKey)) || 0) {
      if (!userId || !entryKey || blocked.has(userId) || token !== epoch(userId)) return false
      // Check once more after opening: logout may have invalidated this writer.
      await open()
      if (blocked.has(userId) || token !== epoch(userId) || revision !== (revisions.get(key(userId, entryKey)) || 0)) return false
      let written = false
      await transact('readwrite', store => {
        if (blocked.has(userId) || token !== epoch(userId) || revision !== (revisions.get(key(userId, entryKey)) || 0)) return
        written = true
        return store.put({ key: key(userId, entryKey), userId, entryKey, values: structuredClone(values), updatedAt, savedAt })
      })
      return written
    },
    async get(userId, entryKey) { return await transact('readonly', store => store.get(key(userId, entryKey))) || null },
    async list(userId) { return (await transact('readonly', store => store.index('userId').getAll(userId))).sort((a, b) => b.updatedAt - a.updatedAt) },
    async remove(userId, entryKey) { revisions.set(key(userId, entryKey), (revisions.get(key(userId, entryKey)) || 0) + 1); await transact('readwrite', store => store.delete(key(userId, entryKey))) },
    async clearUser(userId) {
      blocked.add(userId); epochs.set(userId, epoch(userId) + 1)
      await transact('readwrite', store => {
        const request = store.index('userId').openCursor(userId)
        request.onsuccess = () => { const cursor = request.result; if (cursor) { cursor.delete(); cursor.continue() } }
      })
    },
  }
}
export function isNewerDraft(draft, savedAt, currentValues) {
  if (!draft || JSON.stringify(draft.values) === JSON.stringify(currentValues)) return false
  const serverTime = Date.parse(savedAt || '')
  return !Number.isFinite(serverTime) || draft.updatedAt > serverTime
}
export const drafts = createDraftStorage()
