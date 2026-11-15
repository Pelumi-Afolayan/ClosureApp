import { useEffect, useRef, useState } from 'react'
import { BookOpen, ShieldCheck, HeartHandshake } from 'lucide-react'
import Button from './ui/Button'
import { firstUseSteps } from '../data/firstUseGuide'
import '../styles/GettingStarted.css'

const icons = [BookOpen, ShieldCheck, HeartHandshake]

export default function FirstUseGuide({ onClose }) {
  const dialogRef = useRef(null)
  const titleRef = useRef(null)
  const [step, setStep] = useState(0)
  const item = firstUseSteps[step]
  const Icon = icons[step]
  const last = step === firstUseSteps.length - 1

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [])

  useEffect(() => { titleRef.current?.focus() }, [step])

  return (
    <dialog ref={dialogRef} className="first-use-guide" aria-labelledby="first-use-title"
      aria-describedby="first-use-description" onCancel={event => { event.preventDefault(); onClose() }}>
      <div className="first-use-guide__top">
        <span className="first-use-guide__eyebrow">A quick welcome</span>
        <Button type="button" variant="quiet" onClick={onClose}>Skip guide</Button>
      </div>
      <span className="first-use-guide__icon" aria-hidden="true"><Icon size={32} strokeWidth={1.5} /></span>
      <p className="first-use-guide__count">{step + 1} of {firstUseSteps.length}</p>
      <h2 id="first-use-title" ref={titleRef} tabIndex={-1}>{item.title}</h2>
      <p id="first-use-description">{item.text}</p>
      <p className="first-use-guide__detail">{item.detail}</p>
      <div className="first-use-guide__dots" aria-hidden="true">
        {firstUseSteps.map((entry, index) => <span key={entry.id} className={index === step ? 'is-current' : ''} />)}
      </div>
      <div className="first-use-guide__actions">
        {step > 0 && <Button type="button" secondary onClick={() => setStep(current => current - 1)}>Back</Button>}
        <Button type="button" onClick={() => last ? onClose() : setStep(current => current + 1)}>{last ? 'Explore my space' : 'Next'}</Button>
      </div>
      <p className="first-use-guide__replay">You can open this guide again in Settings.</p>
    </dialog>
  )
}
