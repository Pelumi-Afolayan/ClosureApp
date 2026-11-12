import { useEffect, useRef, useState } from 'react'
import { Award, X } from 'lucide-react'
import { latestMilestone, milestoneLabel, milestoneMessages } from '../utils/milestones'
import '../styles/Milestones.css'

export default function NoContactMilestone({ tracker }) {
  const dialogRef = useRef(null)
  const announcedRef = useRef(`${tracker.today}:${tracker.current}`)
  const [message, setMessage] = useState(() => milestoneMessages[Math.floor(Math.random() * milestoneMessages.length)])
  const { current: days, message: confirmationMessage, error, loading, saving, recordedToday, today } = tracker
  const milestone = latestMilestone(days)

  function celebrate() {
    setMessage(milestoneMessages[Math.floor(Math.random() * milestoneMessages.length)])
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }

  useEffect(() => {
    // Only a successful manual confirmation can open this automatically.
    const key = `${today}:${days}`
    if (!confirmationMessage || error || loading || saving ||
        !recordedToday || milestone !== days || announcedRef.current === key) return
    announcedRef.current = key
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [confirmationMessage, error, loading, saving, recordedToday, today, days, milestone])

  if (!milestone || loading || error) return null

  return (
    <>
      <button type="button" className="milestone-trigger" onClick={celebrate} aria-haspopup="dialog">
        <Award size={20} aria-hidden="true" /> Celebrate {milestone} confirmed days
      </button>
      <dialog ref={dialogRef} className="milestone-dialog" aria-labelledby="milestone-title"
        onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close() }}>
        <div className="milestone-art">
          <button type="button" className="encouragement-close" aria-label="Close celebration"
            onClick={() => dialogRef.current?.close()} autoFocus><X size={24} aria-hidden="true" /></button>
          <Award size={40} aria-hidden="true" />
          <p>A moment to celebrate</p>
          <h2 id="milestone-title">{milestoneLabel(milestone)} of no contact.</h2>
          <p>{message}</p>
          <p className="milestone-note">Based on your consecutive confirmed days. A fresh start never takes away the effort you have already made.</p>
        </div>
      </dialog>
    </>
  )
}
