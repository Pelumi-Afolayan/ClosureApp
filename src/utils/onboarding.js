import { goals } from '../data/goals.js'

export function toggleGoalSelection(selectedGoals, goalId) {
  return selectedGoals.includes(goalId)
    ? selectedGoals.filter((id) => id !== goalId)
    : [...selectedGoals, goalId]
}

export function validateOnboarding(name, selectedGoals) {
  if (!name.trim()) {
    return 'Please enter your preferred name.'
  }

  if (name.trim().length > 80) {
    return 'Please use a name with 80 characters or fewer.'
  }

  if (selectedGoals.length === 0) {
    return 'Please choose at least one goal.'
  }

  if (selectedGoals.some((id) => !goals.some((goal) => goal.id === id))) {
    return 'One of these goals is no longer available. Please choose again.'
  }

  return ''
}
