import '../../styles/Button.css'
import { usePwa } from '../../hooks/usePwa'

export default function Button({
  children,
  variant,
  secondary = false,
  className = '',
  type,
  requiresConnection = false,
  disabled,
  ...props
}) {
  const { online } = usePwa()
  const offline = !online && (type === 'submit' || requiresConnection)
  const appearance = variant || (secondary ? 'secondary' : 'primary')

  return (
    <button type={type} className={`button button--${appearance} ${className}`} {...props} disabled={disabled || offline} title={offline ? "Reconnect to save changes to your account." : props.title} aria-describedby={offline ? "offline-notice" : props["aria-describedby"]}>
      {children}
    </button>
  )
}
