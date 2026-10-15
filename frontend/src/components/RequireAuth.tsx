import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../authContext'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}
