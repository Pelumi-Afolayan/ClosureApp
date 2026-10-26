export default function Button({ children, secondary = false, ...props }) {
  return <button className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${secondary ? 'border border-sage/30 hover:bg-mist' : 'bg-sage text-white hover:bg-sage-dark'}`} {...props}>{children}</button>
}
