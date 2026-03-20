import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { coachApi } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ coach: null, loading: true })

  const login = useCallback((token, coach) => {
    localStorage.setItem('token', token)
    setState({ coach, loading: false })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setState({ coach: null, loading: false })
  }, [])

  const refresh = useCallback(async () => {
    const t = localStorage.getItem('token')
    if (!t) { setState({ coach: null, loading: false }); return }
    try {
      const coach = await coachApi.me()
      setState({ coach, loading: false })
    } catch {
      localStorage.removeItem('token')
      setState({ coach: null, loading: false })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
