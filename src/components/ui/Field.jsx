import { CircleAlert } from 'lucide-react'
import '../../styles/Field.css'

export default function Field({
  as: Control = 'input',
  id,
  label,
  hint,
  error,
  className = '',
  controlClassName = '',
  children,
  'aria-describedby': describedBy,
  ...props
}) {
  const descriptionIds = [describedBy, hint && `${id}-hint`, error && `${id}-error`]
    .filter(Boolean)
    .join(' ') || undefined
  const controlProps = {
    ...props,
    id,
    className: `field-control ${controlClassName}`,
    'aria-describedby': descriptionIds,
    'aria-invalid': error ? true : undefined,
  }

  return (
    <div className={`field ${className}`}>
      <label className="field-label" htmlFor={id}>{label}</label>
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {Control === 'input'
        ? <input {...controlProps} />
        : <Control {...controlProps}>{children}</Control>}
      {error && <p id={`${id}-error`} className="field-error" role="alert"><CircleAlert size={16} aria-hidden="true" />{error}</p>}
    </div>
  )
}
