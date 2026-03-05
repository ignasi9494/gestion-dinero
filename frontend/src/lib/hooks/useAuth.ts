'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  loading: boolean
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterCredentials {
  email: string
  password: string
  displayName?: string
}

export function useAuth() {
  const supabase = createClient()
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setAuthState({ user, loading: false })
    }

    getInitialSession()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({ user: session?.user ?? null, loading: false })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const login = useCallback(
    async ({ email, password }: LoginCredentials): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!error) {
        router.refresh()
        router.push('/')
      }

      return { error }
    },
    [supabase.auth, router]
  )

  const register = useCallback(
    async ({
      email,
      password,
      displayName,
    }: RegisterCredentials): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      })

      if (!error) {
        router.refresh()
      }

      return { error }
    },
    [supabase.auth, router]
  )

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }, [supabase.auth, router])

  const resetPassword = useCallback(
    async (email: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      return { error }
    },
    [supabase.auth]
  )

  return {
    user: authState.user,
    loading: authState.loading,
    login,
    register,
    logout,
    resetPassword,
  }
}
