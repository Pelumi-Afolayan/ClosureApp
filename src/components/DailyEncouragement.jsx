import { useEffect, useState } from 'react'
import { Sun } from 'lucide-react'

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
    <section className="today-encouragement" aria-labelledby="encouragement-title">
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
  )
}
