import { journalPrompts } from '../data/journalPrompts.js'

const goalThemes = {
  move_on: ['who_im_becoming', 'what_i_need_now', 'what_i_learned'],
  find_peace: ['what_i_need_now', 'what_i_dont_miss', 'what_i_miss'],
  rebuild_confidence: ['what_im_proud_of', 'who_im_becoming', 'what_i_need_now'],
  accept_breakup: ['what_i_miss', 'what_i_dont_miss', 'what_i_learned'],
  reduce_contact: ['what_i_dont_miss', 'what_i_need_now', 'what_im_proud_of'],
}

export function journalPromptSequence(selectedGoals = []) {
  const goals = new Set(Array.isArray(selectedGoals) ? selectedGoals : [])
  const scores = new Map(journalPrompts.map(theme => [theme.id, 0]))
  for (const [goal, themes] of Object.entries(goalThemes)) {
    if (!goals.has(goal)) continue
    themes.forEach((theme, index) => scores.set(theme, scores.get(theme) + themes.length - index))
  }
  const themes = journalPrompts.map((theme, index) => ({ ...theme, index }))
    .sort((a, b) => scores.get(b.id) - scores.get(a.id) || a.index - b.index)
  const sequence = []
  // Rotate through themes instead of showing six similar questions in a row.
  const rounds = Math.max(...themes.map(theme => theme.prompts.length))
  for (let round = 0; round < rounds; round++) {
    for (const theme of themes) {
      if (!theme.prompts[round]) continue
      sequence.push({ id: `${theme.id}:${round}`, theme: theme.id, themeLabel: theme.label, text: theme.prompts[round] })
    }
  }
  return sequence
}

export function chooseJournalPrompt(selectedGoals, index = 0) {
  const sequence = journalPromptSequence(selectedGoals)
  const position = Number.isSafeInteger(index) && index >= 0 ? index : 0
  return sequence[position % sequence.length]
}

export function dismissPromptTitle(title, insertedTitle) {
  return insertedTitle && title === insertedTitle ? '' : title
}
