export function createDeleteAccountHandler({ verifyUser, ready, deleteUser, allowedOrigins = [] }) {
  return async request => {
    const origin = request.headers.get('origin')
    const allowed = !origin || allowedOrigins.includes(origin)
    const headers = {
      'Cache-Control': 'no-store', Vary: 'Origin',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      ...(origin && allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    }
    const reply = (body, status) => Response.json(body, { status, headers })
    if (!allowed) return reply({ error: 'Origin not allowed.' }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405)
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '')?.[1]
    if (!token) return reply({ error: 'Sign in to delete your account.' }, 401)
    let user
    try { user = await verifyUser(token) } catch { return reply({ error: 'Sign in to delete your account.' }, 401) }
    if (!user?.id) return reply({ error: 'Sign in to delete your account.' }, 401)
    let body
    try {
      // Bound input even if the caller omits or lies about Content-Length.
      const reader = request.body?.getReader()
      const chunks = []
      let length = 0
      if (!reader) return reply({ error: 'Confirmation is required.' }, 400)
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        length += value.length
        if (length > 1024) { await reader.cancel(); return reply({ error: 'Request too large.' }, 413) }
        chunks.push(value)
      }
      const bytes = new Uint8Array(length)
      let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
      body = JSON.parse(new TextDecoder().decode(bytes))
    } catch { return reply({ error: 'Confirmation is required.' }, 400) }
    if (!body || Array.isArray(body) || typeof body !== 'object'
      || Object.keys(body).some(key => !['confirmation', 'permanent'].includes(key))
      || body.confirmation !== 'DELETE' || body.permanent !== true) {
      return reply({ error: 'Type DELETE and confirm that deletion is permanent.' }, 400)
    }
    try {
      if (await ready() !== true) return reply({ error: 'Account deletion setup is incomplete.' }, 503)
    } catch { return reply({ error: 'Account deletion setup is incomplete.' }, 503) }
    try {
      // Never use an ID or owner from the request body.
      await deleteUser(user.id)
      return reply({ deleted: true }, 200)
    } catch { return reply({ error: 'Account deletion was not confirmed. Please try again.' }, 500) }
  }
}
