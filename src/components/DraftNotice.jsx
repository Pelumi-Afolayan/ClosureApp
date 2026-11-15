import { useState } from 'react'
import Button from './ui/Button'
export default function DraftNotice({ draft }) {
  const [error, setError] = useState('')
  return <div className="draft-notice">
    <p>Drafts are kept on this device only until you save. They are not encrypted by Closure or synced to other devices.</p>
    {draft.loading && <p role="status">Checking for a device draft…</p>}
    {draft.candidate && <div role="status"><p>Restore your draft?</p>
      <Button type="button" secondary onClick={draft.restore}>Restore</Button>
      <Button type="button" variant="quiet" onClick={async () => { try { await draft.discard(); setError('') } catch { setError('The device draft could not be discarded. Please try again.') } }}>Discard</Button>
    </div>}
    {draft.saved && !draft.candidate && <p role="status">Draft kept on this device.</p>}
    {error && <p role="status">{error}</p>}
    {draft.error && <p role="status">{draft.error}</p>}
  </div>
}
