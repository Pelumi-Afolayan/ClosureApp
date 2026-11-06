import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuthActions } from '../src/utils/authActions.js'
import { validateNewPassword } from '../src/utils/passwordRecovery.js'

const origin = 'http://127.0.0.1:5173'

test('reset email trims the address and returns to this app’s reset page', async () => {
  let received
  const actions = createAuthActions({ auth: {
    resetPasswordForEmail: async (...args) => {
      received = args
      return { error: null }
    },
  } }, origin)

  await actions.requestPasswordReset(' person@example.com ')
  assert.deepEqual(received, [
    'person@example.com',
    { redirectTo: `${origin}/reset-password` },
  ])
})

test('password update preserves exactly what the user entered', async () => {
  let received
  const actions = createAuthActions({ auth: {
    updateUser: async (args) => {
      received = args
      return { error: null }
    },
  } }, origin)

  await actions.updatePassword(' pass word ')
  assert.deepEqual(received, { password: ' pass word ' })
})

test('reset and update failures propagate instead of announcing success', async () => {
  const error = new Error('Request rejected')
  const actions = createAuthActions({ auth: {
    resetPasswordForEmail: async () => ({ error }),
    updateUser: async () => ({ error }),
  } }, origin)

  await assert.rejects(actions.requestPasswordReset('person@example.com'), error)
  await assert.rejects(actions.updatePassword('password'), error)
})

test('short, missing and mismatched passwords are rejected', () => {
  assert.match(validateNewPassword('short', 'short'), /8 characters/)
  assert.match(validateNewPassword(null, null), /8 characters/)
  assert.match(validateNewPassword('password-one', 'password-two'), /do not match/)
  assert.equal(validateNewPassword(' pass word ', ' pass word '), '')
})
