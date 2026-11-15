import { useEffect, useState } from 'react'
import { drafts } from '../utils/draftStorage'
import useLocalDraft from '../hooks/useLocalDraft'
import DraftNotice from '../components/DraftNotice'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import Button from '../components/ui/Button'
import SupportDialog from '../components/SupportDialog'
import SupportButton from '../components/SupportButton'

function DeviceDraft({ row }) {
  const [values, setValues] = useState(row.values)
  const draft = useLocalDraft({ userId: row.userId, entryKey: row.entryKey, values,
    dirty: true, onRestore: setValues })
  const labels = { title: 'Title', content: 'Your words', whatHappened: 'What happened?', whatHurt: 'What hurt?', whatINeed: 'What do you need now?', lesson: 'Reflection draft' }
  return <section><h2>Device draft</h2><p>{row.entryKey.startsWith('journal') ? 'Journal or letter' : row.entryKey.startsWith('story') ? 'My Story' : 'Reflection'}</p>
    <DraftNotice draft={draft} />
    <fieldset disabled={draft.loading || Boolean(draft.candidate)}>
      {Object.entries(values).filter(([key, value]) => labels[key] && typeof value === 'string').map(([key, value]) => <label key={key}>{labels[key]}
        <textarea value={value} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />
      </label>)}
    </fieldset>
  </section>
}
export default function OfflineWorkspace({ userId }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [support, setSupport] = useState(false)
  useEffect(() => {
    if (!userId) return
    drafts.begin(userId)
    drafts.list(userId).then(setRows).catch(() => setError('Device drafts could not be opened here.'))
  }, [userId])
  return <PageShell width="narrow"><PageHeader title="A little space, offline" subtitle="The app is here. Your saved account data needs a connection and is never cached for offline reading." />
    <div className="offline-drafts">
      <SupportButton onClick={() => setSupport(true)} />
      <p>Drafts are kept on this device only until you save. They are not encrypted by Closure. Reconnect to sign in, restore a draft and save it to your account.</p>
      {!userId && <p>Reconnect to sign in. No private account data is available in this app shell.</p>}
      {userId && !rows.length && <p>No device drafts are available for this signed-in account.</p>}
      {error && <p role="status">{error}</p>}
      {rows.map(row => <DeviceDraft key={row.key} row={row} />)}
      <Button type="button" secondary onClick={() => window.location.reload()}>Try opening again</Button>
    </div>
    <SupportDialog open={support} onClose={() => setSupport(false)} />
  </PageShell>
}
