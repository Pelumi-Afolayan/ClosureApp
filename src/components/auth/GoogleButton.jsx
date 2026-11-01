import Button from '../ui/Button'

export default function GoogleButton({ loading, disabled, onClick }) {
  return (
    <Button
      type="button"
      secondary
      className="auth-google-button"
      disabled={disabled}
      onClick={onClick}
    >
      <img
        className="auth-google-icon"
        src="https://developers.google.com/static/identity/images/g-logo.png"
        alt=""
        width="20"
        height="20"
        aria-hidden="true"
      />

      {loading ? 'Opening Google…' : 'Continue with Google'}
    </Button>
  )
}
