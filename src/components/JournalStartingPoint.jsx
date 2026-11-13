import { useState } from 'react'
import Button from './ui/Button'
import { chooseJournalPrompt, dismissPromptTitle, journalPromptSequence } from '../utils/journalPromptSelection'

export default function JournalStartingPoint({ selectedGoals, title, onTitleChange }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [insertedTitle, setInsertedTitle] = useState('')
  const prompt = chooseJournalPrompt(selectedGoals, index)
  const replacesTitle = Boolean(title.trim() && title !== insertedTitle)

  function dismiss() {
    onTitleChange(dismissPromptTitle(title, insertedTitle))
    setInsertedTitle('')
    setOpen(false)
  }

  return (
    <div className="journal-starting-point">
      <Button type="button" variant="quiet" aria-expanded={open} aria-controls="journal-prompt-panel" onClick={() => setOpen(value => !value)}>
        Need a starting point?
      </Button>
      {open && (
        <section id="journal-prompt-panel" className="journal-prompt-panel" aria-label="An optional writing prompt">
          <div aria-live="polite" aria-atomic="true">
            <p className="journal-prompt-theme">{prompt.themeLabel}</p>
            <p className="journal-prompt-text">{prompt.text}</p>
          </div>
          <p className="journal-prompt-hint">Only the title changes when you choose a prompt. Your writing stays as it is.</p>
          <div className="journal-prompt-actions">
            <Button type="button" secondary onClick={() => {
              onTitleChange(prompt.text)
              setInsertedTitle(prompt.text)
              setOpen(false)
            }}>{replacesTitle ? 'Replace title with this prompt' : 'Use as title'}</Button>
            <Button type="button" variant="quiet" onClick={() => setIndex(value => (value + 1) % journalPromptSequence(selectedGoals).length)}>Another prompt</Button>
            <Button type="button" variant="quiet" onClick={dismiss}>No prompt, just write</Button>
          </div>
        </section>
      )}
    </div>
  )
}
