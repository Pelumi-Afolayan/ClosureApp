import SupportButton from '../components/SupportButton'
import NotificationSettings from '../components/NotificationSettings'
import PageHeader from '../components/PageHeader'
import PageShell from '../components/PageShell'
import Notice from '../components/ui/Notice'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import Button from '../components/ui/Button'
import { goals } from '../data/goals'
import { saveProfile } from '../services/profileService'
import { signOutWithReminderCleanup } from '../services/notificationService'
import { toggleGoalSelection, validateOnboarding } from '../utils/onboarding'

import '../styles/Onboarding.css'

export default function Onboarding({ user, profile, onComplete, onSupport }) {
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.preferred_name || '')
  const [selectedGoals, setSelectedGoals] = useState(profile?.goals || [])
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const busy = saving || signingOut

  function toggleGoal(goalId) {
    setSelectedGoals((currentGoals) => (
      toggleGoalSelection(currentGoals, goalId)
    ))
  }

  function selectAllGoals() {
    setSelectedGoals(goals.map((goal) => goal.id))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return

    const validationError = validateOnboarding(name, selectedGoals)

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setSaving(true)
    setErrorMessage('')

    try {
      const savedProfile = await saveProfile({
        id: user.id,
        preferred_name: name.trim(),
        goals: selectedGoals,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        onboarding_complete: true,
      })

      onComplete(savedProfile)
      navigate('/today', { replace: true })
    } catch {
      setErrorMessage(
        'We could not save your choices. Your answers are still here. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    if (busy) return

    setSigningOut(true)
    setErrorMessage('')

    try {
      const { error } = await signOutWithReminderCleanup(user.id, { scope: 'local' })
      if (error) throw error
    } catch {
      setErrorMessage('Could not sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <PageShell width="narrow" className="onboarding-page">
      <PageHeader
        actions={!profile?.onboarding_complete ? <SupportButton onClick={onSupport} /> : undefined}
        titleId="onboarding-title"
        title="Let’s make this space yours."
        subtitle="Choose what matters to you. You can work towards more than one thing, and change your choices later."
      />
      <section className="onboarding-panel" aria-labelledby="onboarding-title">
        <form onSubmit={handleSubmit} aria-busy={saving}>
          <label className="onboarding-name-label" htmlFor="preferred-name">
            What should we call you?
          </label>

          <input
            className="onboarding-name"
            id="preferred-name"
            name="preferredName"
            type="text"
            autoComplete="given-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            disabled={busy}
            required
          />

          <fieldset disabled={busy} className="onboarding-goal-fieldset">
            <legend>What would you like to work towards?</legend>

            <p id="goals-hint" className="onboarding-hint">
              Choose at least one. You can select all five.
            </p>

            <div className="onboarding-selection-actions">
              <Button type="button" secondary onClick={selectAllGoals}>
                Select all goals
              </Button>

              <button
                type="button"
                className="onboarding-clear"
                onClick={() => setSelectedGoals([])}
              >
                Clear selection
              </button>
            </div>

            <div className="onboarding-goals" aria-describedby="goals-hint">
              {goals.map((goal) => (
                <label key={goal.id} className="onboarding-goal">
                  <input
                    type="checkbox"
                    name="goals"
                    value={goal.id}
                    checked={selectedGoals.includes(goal.id)}
                    onChange={() => toggleGoal(goal.id)}
                  />

                  <span>{goal.label}</span>
                </label>
              ))}
            </div>

            <p role="status" className="onboarding-selection-count">
              {selectedGoals.length} of {goals.length} goals selected
            </p>
          </fieldset>

          <Notice variant="error">
            {errorMessage}
          </Notice>

          <Button type="submit" disabled={busy} className="onboarding-submit">
            {saving ? 'Saving…' : 'Continue to my space'}
          </Button>
        </form>

        <p className="onboarding-account">Signed in as {user.email}</p>

        <button
          type="button"
          className="onboarding-signout"
          disabled={busy}
          onClick={handleSignOut}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </section>
      {profile?.onboarding_complete && <NotificationSettings userId={user.id} timezone={profile.timezone} />}
    </PageShell>
  )
}
