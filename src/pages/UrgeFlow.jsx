import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowRight, Copy, Leaf } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import Reflections from '../components/Reflections'
import SupportButton from '../components/SupportButton'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useUrgeSession } from '../hooks/useUrgeSession'
import { pauseState, selectRealityChecks } from '../utils/urge'
import { copySupportMessage, friendMessage } from '../utils/support'
import '../styles/UrgeFlow.css'

const steps = [
  { id: 'pause', title: 'A little pause' },
  { id: 'reasons', title: 'Your reasons' },
  { id: 'picture', title: 'The real picture' },
  { id: 'choices', title: 'What feels helpful now?' },
]

function PauseStep({ onContinue }) {
  const { session, state } = useUrgeSession()
  const [now, setNow] = useState(Date.now)
  const timer = pauseState(state.deadline, now)

  useEffect(() => {
    session.beginPause()
    // Ticks only repaint. The deadline, not the number of ticks, decides time left.
    const refresh = () => setNow(Date.now())
    const interval = window.setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [session])

  return (
    <Card className="urge-card urge-pause">
      <p>You don't have to decide what to do right now. Make a little room to breathe.</p>
      <div className={`urge-grounding${timer.started && !timer.complete ? ' urge-grounding--running' : ''}`}>
        <div className="urge-breath-circle" aria-hidden="true" />
        <div className="urge-breath-copy">
          <p className="urge-timer" role="timer" aria-label={`${timer.display} remaining`}>{timer.display}</p>
          <p aria-live="polite" aria-atomic="true">{timer.complete ? 'Take your time. Your pause is complete.' : timer.cue}</p>
        </div>
      </div>
      <p className="urge-muted">Breathe in gently for about four seconds, then out for six. Or keep your breath natural and notice your feet on the floor.</p>
      <p className="urge-small">You can leave and return while the app stays open. Reloading or closing the app clears this timer. Nothing is recorded.</p>
      {timer.complete ? (
        <Button type="button" onClick={onContinue}>Continue<ArrowRight size={18} aria-hidden="true" /></Button>
      ) : timer.canSkip ? (
        <Button type="button" secondary onClick={onContinue}>Skip the rest of the pause</Button>
      ) : (
        <p className="urge-small">An optional skip becomes available after two minutes. You can leave at any time.</p>
      )}
    </Card>
  )
}

function RealityItems({ rows }) {
  const [items] = useState(() => selectRealityChecks(rows))

  return items.length ? (
    <ul className="urge-reality-list">
      {items.map(item => <Card as="li" key={item.id} className="urge-card urge-reflection">{item.content}</Card>)}
    </ul>
  ) : (
    <Card className="urge-card">
      <p>There is nothing written here yet. When you feel clear, you can add a few thoughts in My Story, under What I'm learning. You can carry on without them.</p>
    </Card>
  )
}

function RealityStep() {
  const { session, state } = useUrgeSession()
  const { rows, error } = state.reflections

  return (
    <>
      <p className="urge-muted">Good memories and real problems can both be true. These are your own words, written when things felt clearer.</p>
      {rows !== null ? <RealityItems rows={rows} /> : error ? (
        <Card className="urge-card">
          <p>Your reflections couldn't load. If you're offline, you can still continue through this pause.</p>
          <Button type="button" secondary onClick={session.load}>Try loading again</Button>
        </Card>
      ) : <p role="status">Loading your reflections...</p>}
    </>
  )
}

function ChoicesStep({ onFinish }) {
  const [friendOpen, setFriendOpen] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const messageRef = useRef(null)

  async function copyMessage() {
    const copied = await copySupportMessage(navigator.clipboard)
    setCopyStatus(copied ? 'Copied. You can choose who to share it with.' : 'You can select the message and copy it yourself.')
    if (!copied) {
      messageRef.current?.focus()
      messageRef.current?.select()
    }
  }

  return (
    <Card className="urge-card">
      <p>You can choose a different place for these words, or simply take the next moment as it comes.</p>
      <div className="urge-choices">
        <Link className="button button--primary" to="/journal/new?type=unsent_letter">Write an unsent letter instead</Link>
        <Button type="button" secondary aria-expanded={friendOpen} aria-controls="urge-friend" onClick={() => setFriendOpen(value => !value)}>Call or message a friend</Button>
        <Button type="button" variant="quiet" onClick={onFinish}>I'm okay, close this</Button>
      </div>
      {friendOpen && (
        <section id="urge-friend" className="urge-friend" aria-labelledby="urge-friend-title">
          <h2 id="urge-friend-title">Someone you trust</h2>
          <p>Open your contacts and choose someone you feel comfortable calling or texting. If words feel hard, you can use this message.</p>
          <label htmlFor="urge-friend-message">An optional message</label>
          <textarea id="urge-friend-message" ref={messageRef} readOnly rows={3} value={friendMessage} />
          <Button type="button" secondary onClick={copyMessage}><Copy size={18} aria-hidden="true" />Copy message</Button>
          <p className="urge-small" role="status">{copyStatus}</p>
        </section>
      )}
      <p className="urge-reassurance">If you did reach out: It happens. Nothing is lost. Tomorrow is a fresh day.</p>
    </Card>
  )
}

export default function UrgeFlow({ user }) {
  const { session, state } = useUrgeSession()
  const { openSupport } = useOutletContext()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const titleRef = useRef(null)
  const stepIndex = Math.max(0, steps.findIndex(step => step.id === params.get('step')))
  const step = steps[stepIndex]

  useEffect(() => { session.load() }, [session])
  useEffect(() => { titleRef.current?.focus() }, [step.id])

  function go(index) {
    navigate(`/no-contact/urge?step=${steps[index].id}`, { replace: true })
  }

  function finish() {
    session.finishPause()
    navigate('/no-contact', { replace: true })
  }

  return (
    <div className="urge-screen">
      <PageShell width="narrow" className="urge-shell">
        <div className="urge-topbar">
          <Link className="urge-leave" to="/no-contact"><ArrowLeft size={18} aria-hidden="true" />Leave for now</Link>
          <SupportButton onClick={openSupport} />
        </div>
        <div className="urge-heading-focus" ref={titleRef} tabIndex={-1}>
          <p className="urge-step-label"><Leaf size={18} aria-hidden="true" />A little space for you · {stepIndex + 1} of {steps.length}</p>
          <PageHeader title={step.title} subtitle="At your pace. You can leave whenever you need." />
        </div>
        <ol className="urge-steps" aria-label="Your pause">
          {steps.map((item, index) => <li key={item.id} aria-current={step.id === item.id ? 'step' : undefined}>{index + 1}<span className="writing-accessible-label">: {item.title}</span></li>)}
        </ol>
        <div className="urge-step-content">
          {step.id === 'pause' && <PauseStep onContinue={() => go(1)} />}
          {step.id === 'reasons' && (
            <>
              <p className="urge-muted">Come back to the reasons you chose for yourself. You can add or edit them here, only if you want.</p>
              <Reflections key={user.id} userId={user.id} reasonsOnly source={state.reflections} onRetry={session.load} />
            </>
          )}
          {step.id === 'picture' && <RealityStep />}
          {step.id === 'choices' && <ChoicesStep onFinish={finish} />}
        </div>
        {stepIndex > 0 && (
          <nav className="urge-step-actions" aria-label="Pause steps">
            <Button type="button" variant="quiet" onClick={() => go(stepIndex - 1)}><ArrowLeft size={18} aria-hidden="true" />Back</Button>
            {stepIndex < steps.length - 1 && <Button type="button" onClick={() => go(stepIndex + 1)}>Continue<ArrowRight size={18} aria-hidden="true" /></Button>}
          </nav>
        )}
      </PageShell>
    </div>
  )
}
