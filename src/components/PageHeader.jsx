import '../styles/PageLayout.css'

export default function PageHeader({ title, subtitle, actions, titleId }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <h1 id={titleId}>{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}
