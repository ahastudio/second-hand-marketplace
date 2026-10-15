import { renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { useAuth } from './authContext'

test('AuthProvider 밖에서 useAuth를 쓰면 오류를 던진다', () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  expect(() => renderHook(() => useAuth())).toThrow('AuthProvider가 필요합니다')

  vi.restoreAllMocks()
})
