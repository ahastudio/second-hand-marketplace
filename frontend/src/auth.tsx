import { createContext, useContext, useState, type ReactNode } from 'react'
import { api } from './api'

export interface User {
  id: number
  email: string
  nickname: string
}

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'auth'
const AuthContext = createContext<AuthState | null>(null)

function load(): { user: User; token: string } | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(load)

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: { email, password } })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res))
    setSession(res)
  }
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider가 필요합니다')
  return ctx
}
