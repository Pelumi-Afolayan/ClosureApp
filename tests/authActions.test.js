import test from 'node:test'
import assert from 'node:assert/strict'

import { createAuthActions, getAuthErrorMessage } from '../src/utils/authActions.js'

const origin = 'http://127.0.0.1:5173'

function clientWith(method, response) {
  const calls = []
  const client = {
    auth: {
      [method]: async (input) => {
        calls.push(input)
        return response
      },
    },
  }

  return { actions: createAuthActions(client, origin), calls }
}

test('signup trims email, preserves password and returns the email-confirmation state', async () => {
  const { actions, calls } = clientWith('signUp', {
    data: { user: { id: 'test-user' }, session: null },
    error: null,
  })

  const result = await actions.signUp(' person@example.com ', ' pass word ')

  assert.equal(result.session, null)
  assert.deepEqual(calls, [{
    email: 'person@example.com',
    password: ' pass word ',
    options: { emailRedirectTo: `${origin}/` },
  }])
})

test('signup preserves an immediate session when email confirmation is disabled', async () => {
  const session = { user: { id: 'test-user' } }
  const { actions } = clientWith('signUp', { data: { session }, error: null })

  assert.equal((await actions.signUp('person@example.com', 'test-password')).session, session)
})

test('login calls password authentication and returns the session', async () => {
  const session = { user: { id: 'test-user' } }
  const { actions, calls } = clientWith('signInWithPassword', {
    data: { session },
    error: null,
  })

  assert.equal((await actions.logIn(' person@example.com ', 'password')).session, session)
  assert.deepEqual(calls, [{ email: 'person@example.com', password: 'password' }])
})

test('Supabase signup and login errors are not treated as successes', async () => {
  for (const [method, action] of [['signUp', 'signUp'], ['signInWithPassword', 'logIn']]) {
    const error = new Error('Rejected')
    const { actions } = clientWith(method, { data: null, error })

    await assert.rejects(actions[action]('person@example.com', 'password'), error)
  }
})

test('Google returns to the current app origin, not a hardcoded other project', async () => {
  const { actions, calls } = clientWith('signInWithOAuth', { error: null })

  await actions.continueWithGoogle()

  assert.deepEqual(calls, [{
    provider: 'google',
    options: { redirectTo: `${origin}/` },
  }])
})

test('Google start failures propagate to the page', async () => {
  const error = new Error('Provider disabled')
  const { actions } = clientWith('signInWithOAuth', { error })

  await assert.rejects(actions.continueWithGoogle(), error)
})

test('errors explain wrong passwords, unconfirmed email, rate limits and connection failures', () => {
  assert.match(getAuthErrorMessage({ code: 'invalid_credentials' }), /incorrect/)
  assert.match(getAuthErrorMessage({ code: 'email_not_confirmed' }), /confirm your email/)
  assert.match(getAuthErrorMessage({ status: 429 }), /wait/)
  assert.match(getAuthErrorMessage(new TypeError('Failed to fetch')), /connection/)
  assert.match(getAuthErrorMessage(null), /try again/)
})
