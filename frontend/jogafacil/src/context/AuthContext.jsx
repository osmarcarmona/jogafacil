import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext()

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isTokenExpired(payload) {
  if (!payload || !payload.exp) return true
  return Date.now() >= payload.exp * 1000
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('authToken')
    if (!stored) return null
    const payload = decodeJwtPayload(stored)
    if (!payload || isTokenExpired(payload)) return null
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      academy: payload.academy,
      academies: payload.academies || (payload.academy ? [payload.academy] : []),
      coachId: payload.coachId || null,
    }
  })

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
  }, [])

  // Auto-logout on token expiry
  useEffect(() => {
    if (!token) return

    const payload = decodeJwtPayload(token)
    if (!payload || isTokenExpired(payload)) {
      logout()
      return
    }

    const msUntilExpiry = payload.exp * 1000 - Date.now()
    const timer = setTimeout(logout, msUntilExpiry)
    return () => clearTimeout(timer)
  }, [token, logout])

  const login = async (email, password) => {
    const data = await authApi.login(email, password)
    const jwt = data.token
    localStorage.setItem('authToken', jwt)
    setToken(jwt)

    const payload = decodeJwtPayload(jwt)
    setUser({
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      academy: payload.academy,
      academies: payload.academies || (payload.academy ? [payload.academy] : []),
      coachId: payload.coachId || null,
    })
    return data
  }

  const isAdmin = user?.role === 'admin'
  const isCoach = user?.role === 'coach'

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isCoach }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
