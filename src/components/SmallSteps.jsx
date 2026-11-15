import { useEffect, useState } from 'react'
import { getLocalDate } from '../utils/dates'
import { getSmallStep } from '../utils/smallSteps'
import Card from './ui/Card'
import Button from './ui/Button'
function Step({ item }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return <Card className="small-steps"><h2>Small steps</h2><p>One optional idea. Nothing to complete or keep track of.</p><p>{item.text}</p>
    <Button type="button" variant="quiet" onClick={() => setDismissed(true)}>Not for now</Button>
  </Card>
}
export default function SmallSteps({ userId, goals, timezone }) {
  const [date, setDate] = useState(() => getLocalDate(timezone))
  useEffect(() => { const timer = setInterval(() => setDate(getLocalDate(timezone)), 30000); return () => clearInterval(timer) }, [timezone])
  const item = getSmallStep({ userId, date, goals })
  return <Step key={`${date}:${item.id}`} item={item} />
}
