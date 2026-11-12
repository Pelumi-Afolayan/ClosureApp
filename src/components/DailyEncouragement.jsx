import { useEffect, useRef, useState } from 'react'
import { Sun, X } from 'lucide-react'

import '../styles/EncouragementPopup.css'

import { encouragements } from '../data/encouragements'
import { getLocalDate } from '../utils/dates'
import { getDailyEncouragement } from '../utils/encouragements'

function readDate(timezone) {
  try {
    return getLocalDate(timezone)
  } catch {
    return null
  }
}

export default function DailyEncouragement({ userId, selectedGoals, timezone }) {
  const dialogRef = useRef(null)
  const [localDate, setLocalDate] = useState(() => readDate(timezone))

  useEffect(() => {
    function updateDate() {
      setLocalDate(readDate(timezone))
    }

    updateDate()
    const interval = window.setInterval(updateDate, 30000)
    window.addEventListener('focus', updateDate)
    document.addEventListener('visibilitychange', updateDate)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', updateDate)
      document.removeEventListener('visibilitychange', updateDate)
    }
  }, [timezone])

  const encouragement = localDate
    ? getDailyEncouragement({ selectedGoals, localDate, userId })
    : encouragements.general[0]

  return (
    <>
    <section className="today-encouragement" aria-labelledby="encouragement-title">
      <button
        type="button"
        className="encouragement-open"
        aria-label="Open Words for today in a larger view"
        aria-haspopup="dialog"
        aria-controls="encouragement-dialog"
        onClick={() => dialogRef.current?.showModal()}
      />
      <div className="today-encouragement-copy">
        <p className="today-card-eyebrow">
          <Sun size={18} aria-hidden="true" />
          Words for today
        </p>

        <h2 id="encouragement-title">{encouragement.text}</h2>

        <p>
          {localDate
            ? 'A thought for your day. Take what feels useful, at your own pace.'
            : 'Please check your profile timezone to receive your daily message.'}
        </p>
      </div>

    </section>

    <dialog
      ref={dialogRef}
      id="encouragement-dialog"
      className="encouragement-dialog"
      aria-labelledby="encouragement-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close()
      }}
    >
      <div className="encouragement-expanded">
        <button
          type="button"
          className="encouragement-close"
          aria-label="Close Words for today"
          onClick={() => dialogRef.current?.close()}
          autoFocus
        >
          <X size={24} aria-hidden="true" />
        </button>
        <div className="encouragement-expanded-copy">
          <p className="today-card-eyebrow"><Sun size={18} aria-hidden="true" />Words for today</p>
          <h2 id="encouragement-dialog-title">{encouragement.text}</h2>
          <p className="encouragement-expanded-note">
            {localDate
              ? 'A thought for your day. Take what feels useful, at your own pace.'
              : 'Please check your profile timezone to receive your daily message.'}
          </p>
        </div>
      </div>
    </dialog>
    </>
  )
}
