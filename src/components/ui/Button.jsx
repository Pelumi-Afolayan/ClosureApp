import '../../styles/Button.css'

export default function Button({
  children,
  variant,
  secondary = false,
  className = '',
  type,
  ...props
}) {
  const appearance = variant || (secondary ? 'secondary' : 'primary')

  return (
    <button type={type} className={`button button--${appearance} ${className}`} {...props}>
      {children}
    </button>
  )
}
