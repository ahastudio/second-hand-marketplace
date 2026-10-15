import { useState, type ReactNode } from 'react'
import { api } from './api'
import { AuthContext, type AuthState, type User } from './authContext'

interface Session {
  token: string
  user: User
}

const SESSION_STORAGE_KEY = 'auth'

function loadStoredSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(loadStoredSession)

  const login = async (email: string, password: string) => {
    const newSession = await api<Session>('/api/auth/login', { method: 'POST', body: { email, password } })
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession))
    setSession(newSession)
  }

  const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    setSession(null)
  }

  const authState: AuthState = { user: session?.user ?? null, token: session?.token ?? null, login, logout }
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
}
