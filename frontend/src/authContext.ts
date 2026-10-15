import { createContext, useContext } from 'react'

export interface User {
  id: number
  email: string
  nickname: string
}

export interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const authState = useContext(AuthContext)
  if (!authState) throw new Error('AuthProvider가 필요합니다')
  return authState
}
