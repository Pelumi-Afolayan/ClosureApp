export default function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-sage/15 bg-white/80 p-6 ${className}`}>{children}</div>
}
