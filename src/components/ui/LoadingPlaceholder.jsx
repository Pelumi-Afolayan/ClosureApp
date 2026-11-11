import '../../styles/LoadingPlaceholder.css'

export default function LoadingPlaceholder({ label = 'Loading…', lines = 3, className = '' }) {
  return (
    <div className={`loading-placeholder ${className}`} role="status" aria-live="polite">
      <span className="loading-placeholder-label">{label}</span>
      <div className="loading-placeholder-lines" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span key={index} className="loading-placeholder-line" />
        ))}
      </div>
    </div>
  )
}
