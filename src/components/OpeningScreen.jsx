import { Leaf } from 'lucide-react'
import '../styles/OpeningScreen.css'

export default function OpeningScreen({ label = 'Opening your space', children }) {
  return (
    <main className="opening-screen" aria-busy="true">
      <div className="opening-screen__content">
        <span className="opening-screen__mark" aria-hidden="true"><Leaf size={48} strokeWidth={1.5} /></span>
        <h1 className="opening-screen__name">Closure</h1>
        <p className="opening-screen__label" role="status">{label}</p>
        <div className="opening-screen__track" role="progressbar" aria-label="Loading Closure">
          <span className="opening-screen__progress" />
        </div>
      </div>
      {children && <div className="opening-screen__support">{children}</div>}
    </main>
  )
}
