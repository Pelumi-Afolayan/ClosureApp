import '../styles/PageLayout.css'

export default function PageShell({ width = 'wide', className = '', children, ...props }) {
  return (
    <main className={`page-shell ${className}`} {...props}>
      <div className={`page-container page-container--${width}`}>
        {children}
      </div>
    </main>
  )
}
