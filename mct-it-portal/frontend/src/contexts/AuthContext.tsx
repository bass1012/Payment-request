import React, { createContext, useContext, useState, useCallback } from 'react'
import type { User, AuthState } from '../types'
import api from '../lib/api'

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token')
    const userRaw = localStorage.getItem('user')
    if (token && userRaw) {
      try {
        return { token, user: JSON.parse(userRaw), isAuthenticated: true }
      } catch {
        /* ignore */
      }
    }
    return { token: null, user: null, isAuthenticated: false }
  })

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setState({ token: data.token, user: data.user, isAuthenticated: true })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setState({ token: null, user: null, isAuthenticated: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
