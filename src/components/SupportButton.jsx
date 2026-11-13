import { HeartHandshake } from 'lucide-react'
import '../styles/Support.css'

export default function SupportButton({ onClick, className = '' }) {
  return (
    <button type="button" className={`support-entry ${className}`} onClick={onClick} aria-haspopup="dialog">
      <HeartHandshake size={18} aria-hidden="true" />
      <span>Need support?</span>
    </button>
  )
}
