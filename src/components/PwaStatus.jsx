import { usePwa } from '../hooks/usePwa'
import { refreshForUpdate } from '../utils/pwaRuntime'
import '../styles/Pwa.css'
export default function PwaStatus() {
  const { online, waiting, error } = usePwa()
  return <div className="pwa-status">
    {!online && <p id="offline-notice" role="status">You're offline. Your writing can't be saved to your account right now.</p>}
    {waiting && <div role="status"><span>Update available.</span><button type="button" onClick={refreshForUpdate}>Refresh when you're ready</button></div>}
    {error && <p role="status">{error}</p>}
  </div>
}
