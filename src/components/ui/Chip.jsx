import { Check } from 'lucide-react'
import '../../styles/Chip.css'

export default function Chip({
  as: Component = 'button',
  selected = false,
  children,
  className = '',
  ...props
}) {
  const selectionProps = Component === 'button'
    ? { type: 'button', 'aria-pressed': selected }
    : { 'aria-current': selected ? 'page' : undefined }

  return (
    <Component
      {...selectionProps}
      {...props}
      className={`chip${selected ? ' chip--selected' : ''} ${className}`}
    >
      {selected && <Check size={16} aria-hidden="true" />}
      <span>{children}</span>
    </Component>
  )
}
