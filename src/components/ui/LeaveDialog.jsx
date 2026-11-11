import Button from './Button'
import '../../styles/LeaveDialog.css'

export default function LeaveDialog({ dialogRef, idPrefix, busy, onStay, onLeave }) {
  return (
    <dialog
      ref={dialogRef}
      className="leave-dialog"
      aria-labelledby={`${idPrefix}-title`}
      aria-describedby={`${idPrefix}-description`}
      onCancel={(event) => {
        event.preventDefault()
        onStay()
      }}
    >
      <h2 id={`${idPrefix}-title`}>Keep your writing?</h2>
      <p id={`${idPrefix}-description`}>
        {busy
          ? 'Please wait for the current request to finish before leaving.'
          : 'Your changes haven’t been saved. Keep writing, or discard the changes and leave.'}
      </p>
      <div className="leave-dialog-actions">
        <Button type="button" onClick={onStay} autoFocus>Keep writing</Button>
        <Button type="button" variant="quiet" disabled={busy} onClick={onLeave}>
          Discard and leave
        </Button>
      </div>
    </dialog>
  )
}
