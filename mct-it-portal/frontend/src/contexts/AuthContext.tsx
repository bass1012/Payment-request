import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { User, AuthState } from '../types'
import api from '../lib/api'

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Access token en mémoire (jamais dans localStorage)
let accessToken: string | null = null
let userState: User | null = null

export function getAccessToken() {
  return accessToken
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const userRaw = localStorage.getItem('user')
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw)
        userState = user
        return { token: null, user, isAuthenticated: true }
      } catch {
        /* ignore */
      }
    }
    return { token: null, user: null, isAuthenticated: false }
  })

  const setToken = useCallback((newToken: string | null) => {
    accessToken = newToken
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    accessToken = data.token
    userState = data.user
    localStorage.setItem('user', JSON.stringify(data.user))
    setState({ token: data.token, user: data.user, isAuthenticated: true })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Même si l'appel échoue, on nettoie côté client
    }
    accessToken = null
    userState = null
    localStorage.removeItem('user')
    setState({ token: null, user: null, isAuthenticated: false })
  }, [])

  // Écouter le refresh token mis à jour par l'intercepteur axios
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ token: string }>
      accessToken = customEvent.detail.token
    }
    window.addEventListener('token-refreshed', handler)
    return () => window.removeEventListener('token-refreshed', handler)
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
