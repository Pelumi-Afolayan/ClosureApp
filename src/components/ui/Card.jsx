import '../../styles/Card.css'

export default function Card({
  as: Component = 'div',
  variant = 'plain',
  children,
  className = '',
  ...props
}) {
  return (
    <Component className={`card card--${variant} ${className}`} {...props}>
      {children}
    </Component>
  )
}
