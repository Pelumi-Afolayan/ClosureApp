// Keep Supabase requests together so both account pages use the same rules.
export function createAuthActions(client, origin) {
  return {
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/`,
        },
      })

      if (error) throw error
      return data
    },

    async logIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error
      return data
    },

    async continueWithGoogle() {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/`,
        },
      })

      if (error) throw error
    },
  }
}

export function getAuthErrorMessage(error) {
  if (error?.code === 'invalid_credentials') {
    return 'The email or password is incorrect. Please try again.'
  }

  if (error?.code === 'email_not_confirmed') {
    return 'Please confirm your email before logging in. Check your inbox and spam folder.'
  }

  if (error?.status === 429) {
    return 'Too many attempts. Please wait a little before trying again.'
  }

  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return 'Could not reach the sign-in service. Check your connection and try again.'
  }

  return error?.message || 'Something went wrong. Please try again.'
}
