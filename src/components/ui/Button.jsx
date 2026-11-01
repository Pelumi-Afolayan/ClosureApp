import '../../styles/Button.css'

export default function Button({ children, secondary = false, className = '', ...props }) {
  return (
    <button className={`button ${secondary ? 'button--secondary' : 'button--primary'} ${className}`} {...props}>
      {children}
    </button>
  )
}
