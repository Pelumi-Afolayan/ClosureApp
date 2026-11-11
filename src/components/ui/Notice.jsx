import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import '../../styles/Notice.css'

const icons = { info: Info, success: CircleCheck, error: CircleAlert }

export default function Notice({ variant = 'info', children, title, className = '', ...props }) {
  const Icon = icons[variant] || Info
  const heading = title || (variant === 'error' ? 'Please check' : '')

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`notice notice--${variant}${children ? '' : ' notice--empty'} ${className}`}
      {...props}
    >
      {children && (
        <>
          <Icon size={20} aria-hidden="true" />
          <div>
            {heading && <strong className="notice-title">{heading}</strong>}
            {children}
          </div>
        </>
      )}
    </div>
  )
}
