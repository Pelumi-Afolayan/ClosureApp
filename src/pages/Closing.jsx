import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import JournalEditor from '../components/JournalEditor'
import DataOwnership from '../components/DataOwnership'
import { getStory } from '../services/storyService'
import { getReflections } from '../services/reflectionService'
import '../styles/Closing.css'

export default function Closing({ user, profile }) {
  const [step, setStep] = useState(0)
  const [choice, setChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    Promise.all([getStory(user.id, controller.signal), getReflections(user.id, ['lesson'], controller.signal)])
      .then(([story, lessons]) => { if (live) setResult({ story, lessons }) })
      .catch(() => { if (live) setResult({ error: true }) })
      .finally(() => clearTimeout(timer))
    return () => { live = false; clearTimeout(timer); controller.abort() }
  }, [user.id, attempt])
  return <PageShell width="narrow" className="closing-page">
    <PageHeader title="Close this chapter, in your own time" subtitle="Only if this feels right for you. You can stop here or return to any part of Closure." />
    <Link to="/onboarding">Back to Settings</Link>
    <nav className="closing-steps" aria-label="Closing ceremony steps">{['Your story','Your lessons','A letter to yourself','Your choice'].map((title, index) => <span key={title} aria-current={step === index ? 'step' : undefined}>{index + 1}. {title}</span>)}</nav>
    {step < 2 && !result && <p role="status">Opening your saved words…</p>}
    {step < 2 && result?.error && <Card><p>Your words could not be loaded. Your account has not changed.</p><Button type="button" secondary onClick={() => { setResult(null); setAttempt(value => value + 1) }}>Try again</Button></Card>}
    {step === 0 && result && !result.error && <Card><h2>A moment with your story</h2>
      {result.story ? [['What happened?',result.story.what_happened],['What hurt?',result.story.what_hurt],['What you needed',result.story.what_i_need]].map(([title, answer]) => <section key={title}><h3>{title}</h3><p className="closing-writing">{answer || 'Nothing written here. That’s okay.'}</p></section>) : <p>You have not saved a story. There is no need to write one for this moment.</p>}
      <Button type="button" onClick={() => setStep(1)}>Continue to lessons</Button>
    </Card>}
    {step === 1 && result && !result.error && <Card><h2>What you’re carrying forward</h2>{result.lessons.length ? <ul>{result.lessons.map(row => <li key={row.id} className="closing-writing">{row.content}</li>)}</ul> : <p>No lessons saved here. You can still continue.</p>}
      <Button type="button" onClick={() => setStep(2)}>Continue to your letter</Button><Button type="button" variant="quiet" onClick={() => setStep(0)}>Back</Button>
    </Card>}
    {step === 2 && <><p>You can write a final letter to your past self. It stays as a journal entry; nothing is sent.</p>
      <JournalEditor userId={user.id} draftKey="closing-final-letter" fixedEntryType="journal" defaultTitle="A letter to my past self" entry={{ title: 'A letter to my past self', entry_type: 'journal' }} selectedGoals={profile.goals}
        onSaved={() => setStep(3)} onCancel={() => setStep(1)} onDeleted={() => setStep(1)} />
    </>}
    {step === 3 && <Card><h2>What feels right for your words?</h2><p>There is no expected ending. This does not mark you as finished or change how Closure works.</p>
      <div className="closing-choices"><Link className="button button--secondary" to="/today">Keep everything</Link>
        <Button type="button" secondary onClick={() => setChoice('keep')}>Export and keep</Button>
        <Button type="button" secondary onClick={() => setChoice('delete')}>Export and delete account</Button>
      </div>
      {choice && <><p>Download your copy first. {choice === 'delete' ? 'Deletion is a separate permanent choice below and requires confirmation.' : 'Your account stays as it is.'}</p><DataOwnership userId={user.id} timezone={profile.timezone} exportOnly={choice === 'keep'} /><Link to="/today">Return to my space</Link></>}
    </Card>}
  </PageShell>
}
