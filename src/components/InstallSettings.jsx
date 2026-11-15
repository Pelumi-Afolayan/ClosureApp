import { useState } from 'react'
import { usePwa } from '../hooks/usePwa'
import { installClosure, isIosSafari } from '../utils/pwaRuntime'
import Button from './ui/Button'
import Card from './ui/Card'
export default function InstallSettings() {
  const { install } = usePwa()
  const [error, setError] = useState('')
  const ios = isIosSafari(navigator, window.matchMedia('(display-mode: standalone)').matches || navigator.standalone)
  if (!install && !ios) return null
  return <Card className="device-settings"><h2>Keep Closure close</h2>
    {install && <Button type="button" secondary onClick={async () => { try { await installClosure() } catch { setError('Installation did not finish. You can try your browser’s install option later.') } }}>Install Closure</Button>}
    {ios && <p>In Safari, tap Share, then Add to Home Screen.</p>}
    {error && <p role="status">{error}</p>}
  </Card>
}
